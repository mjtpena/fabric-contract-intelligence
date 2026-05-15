import { useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  Tab,
  TabList,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createContractClient } from '@/api/contractClient';
import { createOpsClient } from '@/api/opsClient';
import { RulePicker } from '@/components/Activator/RulePicker';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ContractSummary } from '@/models/Contract';
import type { ActivatorRule } from '@/models/ops';

type Step = 'schedule' | 'behaviour' | 'routing' | 'review';

interface PersistedPolicyState {
  contractId: string | null;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

export function PolicyEditorPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { itemObjectId } = useParams();
  const [searchParams] = useSearchParams();
  const sdk = useFabricSdk();
  const [step, setStep] = useState<Step>('schedule');
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [rules, setRules] = useState<ActivatorRule[]>([]);
  const [contractId, setContractId] = useState(searchParams.get('contractId') ?? '');
  const [cronExpression, setCronExpression] = useState('0 */4 * * *');
  const [alertOnWarn, setAlertOnWarn] = useState(false);
  const [actionType, setActionType] = useState<'notify' | 'webhook'>('notify');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [provider, setProvider] = useState<'generic' | 'slack'>('generic');
  const [activatorRuleId, setActivatorRuleId] = useState<string | null>(null);

  const contractClient = useMemo(
    () =>
      createContractClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );
  const opsClient = useMemo(
    () =>
      createOpsClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  useEffect(() => {
    void contractClient.listContracts().then((rows) => {
      setContracts(rows);
      setContractId((current) => current || rows[0]?.id || '');
    });
    void opsClient.listActivatorRules().then(setRules).catch(() => setRules([]));
  }, [contractClient, opsClient]);

  useEffect(() => {
    if (!itemObjectId || !sdk.isReady) {
      return;
    }

    void sdk.loadItemDefinition(itemObjectId)
      .then((persisted) => {
        const state = persisted ? parsePersistedPolicyState(persisted) : null;
        if (state?.contractId) {
          setContractId(state.contractId);
        }
      })
      .catch(() => undefined);
  }, [itemObjectId, sdk]);

  const openWorkloadRoute = async (path: string, mode: 'append' | 'replaceAll' = 'replaceAll') => {
    if (!(await sdk.openWorkloadRoute(path, mode))) {
      navigate(path);
    }
  };

  const savePolicy = async () => {
    if (!contractId) {
      await sdk.notifyError('Missing contract', 'Select a contract before saving policy.');
      return;
    }

    const actionConfig = {
      cron: cronExpression,
      alertOnWarn,
      provider,
      webhookUrl: webhookUrl || undefined,
    };

    try {
      await opsClient.createPolicy({
        contractId,
        activatorRuleId,
        triggerEvent: alertOnWarn ? 'enforcement.warned' : 'enforcement.failed',
        actionType,
        actionConfigJson: JSON.stringify(actionConfig),
        enabled: true,
      });
      if (itemObjectId) {
        await sdk.saveItemDefinition(itemObjectId, JSON.stringify({ contractId }));
      }
      await sdk.notifySuccess('Policy saved', 'Policy, schedule, and routing were saved in one request.');
      await openWorkloadRoute(contractId ? `/contracts/${contractId}/edit` : '/contracts');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save policy.';
      await sdk.notifyError('Save failed', message);
    }
  };

  return (
    <section className={styles.root}>
      <Title2>Policy editor wizard</Title2>
      <Caption1>Configure schedule, alert behavior, routing, then review and save.</Caption1>

      <TabList selectedValue={step} onTabSelect={(_, data) => setStep(data.value as Step)}>
        <Tab value="schedule">1. Schedule</Tab>
        <Tab value="behaviour">2. Behavior</Tab>
        <Tab value="routing">3. Routing</Tab>
        <Tab value="review">4. Review</Tab>
      </TabList>

      <Field label="Contract">
        <Dropdown
          selectedOptions={contractId ? [contractId] : []}
          value={contracts.find((contract) => contract.id === contractId)?.name ?? 'Select contract'}
          onOptionSelect={(_, data) => setContractId(data.optionValue ?? '')}
        >
          {contracts.map((contract) => (
            <Option key={contract.id} value={contract.id}>
              {contract.name}
            </Option>
          ))}
        </Dropdown>
      </Field>

      {step === 'schedule' ? (
        <Field label="Cron schedule">
          <Input value={cronExpression} onChange={(_, data) => setCronExpression(data.value)} />
        </Field>
      ) : null}

      {step === 'behaviour' ? (
        <Checkbox
          label="Alert on warned runs (not just failed runs)"
          checked={alertOnWarn}
          onChange={(_, data) => setAlertOnWarn(data.checked === true)}
        />
      ) : null}

      {step === 'routing' ? (
        <>
          <Field label="Routing mode">
            <Dropdown
              selectedOptions={[actionType]}
              value={actionType}
              onOptionSelect={(_, data) => setActionType((data.optionValue as 'notify' | 'webhook') ?? 'notify')}
            >
              <Option value="notify">Activator notify</Option>
              <Option value="webhook">Webhook</Option>
            </Dropdown>
          </Field>

          {actionType === 'notify' ? (
            <Field label="Activator rule">
              <RulePicker rules={rules} selectedRuleId={activatorRuleId} onChange={setActivatorRuleId} />
            </Field>
          ) : (
            <>
              <Field label="Webhook provider">
                <Dropdown
                  selectedOptions={[provider]}
                  value={provider}
                  onOptionSelect={(_, data) => setProvider((data.optionValue as 'generic' | 'slack') ?? 'generic')}
                >
                  <Option value="generic">Generic</Option>
                  <Option value="slack">Slack</Option>
                </Dropdown>
              </Field>
              <Field label="Webhook URL">
                <Input value={webhookUrl} onChange={(_, data) => setWebhookUrl(data.value)} />
              </Field>
            </>
          )}
        </>
      ) : null}

      {step === 'review' ? (
        <Body1>
          Contract {contractId || '(none)'} | Cron {cronExpression} | Alert on warn {String(alertOnWarn)} | Route {actionType}
        </Body1>
      ) : null}

      <div className={styles.actions}>
        <Button appearance="primary" onClick={() => { void savePolicy(); }}>
          Save policy
        </Button>
        <Button
          appearance="secondary"
          onClick={() => {
            void openWorkloadRoute(contractId ? `/contracts/${contractId}/edit` : '/contracts');
          }}
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}

function parsePersistedPolicyState(raw: string): PersistedPolicyState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedPolicyState>;
    return {
      contractId: typeof parsed.contractId === 'string' ? parsed.contractId : null,
    };
  } catch {
    return null;
  }
}
