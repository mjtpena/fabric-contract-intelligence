import { useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Caption1,
  Card,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  Tab,
  TabList,
  Text,
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
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  reviewList: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    margin: 0,
  },
  mutedValue: {
    color: tokens.colorNeutralForeground3,
  },
});

export function PolicyEditorPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { itemObjectId } = useParams();
  const [searchParams] = useSearchParams();
  const sdk = useFabricSdk();
  const [step, setStep] = useState<number>(0);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [rules, setRules] = useState<ActivatorRule[]>([]);
  const [contractId, setContractId] = useState(searchParams.get('contractId') ?? '');
  const [cronExpression, setCronExpression] = useState('0 */4 * * *');
  const [alertOnWarn, setAlertOnWarn] = useState(false);
  const [actionType, setActionType] = useState<'notify' | 'webhook'>('notify');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [provider, setProvider] = useState<'generic' | 'slack'>('generic');
  const [activatorRuleId, setActivatorRuleId] = useState<string | null>(null);
  const [cronError, setCronError] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const validateSchedule = () => {
    const isValid = cronRegex.test(cronExpression.trim());
    setCronError(isValid ? null : 'Cron must be 5 fields, e.g. 0 */4 * * *');
    return isValid;
  };

  const validateRouting = () => {
    if (actionType !== 'webhook') {
      setRoutingError(null);
      return true;
    }

    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS.');
      }
      setRoutingError(null);
      return true;
    } catch {
      setRoutingError('Webhook URL must be a valid HTTPS URL.');
      return false;
    }
  };

  const goNext = () => {
    if (step === 0 && !validateSchedule()) {
      return;
    }
    if (step === 2 && !validateRouting()) {
      return;
    }
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  };

  const savePolicy = async () => {
    if (isSaving) {
      return;
    }

    if (!contractId) {
      await sdk.notifyError('Missing contract', 'Select a contract before saving policy.');
      return;
    }

    if (!validateSchedule() || !validateRouting()) {
      return;
    }

    const actionConfig = {
      cron: cronExpression,
      alertOnWarn,
      provider,
      webhookUrl: webhookUrl || undefined,
    };

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = step === 3
    && Boolean(contractId)
    && cronRegex.test(cronExpression.trim())
    && (actionType !== 'webhook' || isHttpsUrl(webhookUrl));
  const selectedContractName = contracts.find((contract) => contract.id === contractId)?.name;
  const notSet = <Text className={styles.mutedValue}>Not set</Text>;

  return (
    <section className={styles.root}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => { void openWorkloadRoute('/contracts'); }}>Library</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>Policies</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <Title2>Policy editor wizard</Title2>
      <Caption1 className={styles.subtitle}>Schedule enforcement, choose alerts, and route breaches without leaving Fabric.</Caption1>

      <Body1 aria-current="step">Step {step + 1} of 4 · {stepLabels[step]}</Body1>

      <TabList selectedValue={step} onTabSelect={(_, data) => {
        const nextStep = Number(data.value);
        if (Number.isInteger(nextStep) && nextStep <= step) {
          setStep(nextStep);
        }
      }}>
        <Tab value={0}>1. Schedule</Tab>
        <Tab disabled={step < 1} value={1}>2. Behavior</Tab>
        <Tab disabled={step < 2} value={2}>3. Routing</Tab>
        <Tab disabled={step < 3} value={3}>4. Review</Tab>
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

      {step === 0 ? (
        <Field
          label="Cron schedule"
          validationMessage={cronError ?? undefined}
          validationState={cronError ? 'error' : 'none'}
        >
          <Input
            value={cronExpression}
            onChange={(_, data) => {
              setCronExpression(data.value);
              setCronError(null);
            }}
          />
          <Caption1 italic>{cronToHuman(cronExpression)}</Caption1>
        </Field>
      ) : null}

      {step === 1 ? (
        <Checkbox
          label="Alert on warned runs (not just failed runs)"
          checked={alertOnWarn}
          onChange={(_, data) => setAlertOnWarn(data.checked === true)}
        />
      ) : null}

      {step === 2 ? (
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
              <Field
                label="Webhook URL"
                validationMessage={routingError ?? undefined}
                validationState={routingError ? 'error' : 'none'}
              >
                <Input
                  value={webhookUrl}
                  onChange={(_, data) => {
                    setWebhookUrl(data.value);
                    setRoutingError(null);
                  }}
                />
              </Field>
            </>
          )}
        </>
      ) : null}

      {step === 3 ? (
        <Card>
          <dl className={styles.reviewList}>
            <Field label={<Text size={300}>Trigger</Text>}>
              <Text weight="semibold">{alertOnWarn ? 'Failed or warned runs' : 'Failed runs only'}</Text>
            </Field>
            <Field label={<Text size={300}>Schedule</Text>}>
              <Text weight="semibold">{cronToHuman(cronExpression)} · {cronExpression}</Text>
            </Field>
            <Field label={<Text size={300}>Action</Text>}>
              <Text weight="semibold">
                {actionType === 'notify' ? 'Notify Activator rule' : `Send ${provider} webhook`}
              </Text>
            </Field>
            <Field label={<Text size={300}>Webhook URL</Text>}>
              {webhookUrl ? <Text weight="semibold">{webhookUrl}</Text> : notSet}
            </Field>
            <Field label={<Text size={300}>Headers</Text>}>
              {actionType === 'webhook' ? <Text weight="semibold">Managed by destination</Text> : notSet}
            </Field>
            <Field label={<Text size={300}>Active</Text>}>
              <Text weight="semibold">Enabled</Text>
            </Field>
            <Field label={<Text size={300}>Contract</Text>}>
              {selectedContractName ? <Text weight="semibold">{selectedContractName}</Text> : notSet}
            </Field>
          </dl>
        </Card>
      ) : null}

      <div className={styles.actions}>
        {step > 0 ? (
          <Button appearance="secondary" onClick={() => setStep((current) => Math.max(current - 1, 0))}>
            Previous
          </Button>
        ) : null}
        {step < 3 ? (
          <Button appearance="primary" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button appearance="primary" disabled={!canSave || isSaving} onClick={() => { void savePolicy(); }}>
            {isSaving ? 'Saving…' : 'Save policy'}
          </Button>
        )}
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

const stepLabels = ['Schedule', 'Behavior', 'Routing', 'Review'] as const;

const cronRegex = /^(\*|([0-5]?\d)(-[0-5]?\d)?)(\/\d+)?(\s+(\*|([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?)(\/\d+)?){4}$/;

function cronToHuman(expr: string) {
  const trimmed = expr.trim();
  const hourly = /^0 \*\/(\d+) \* \* \*$/.exec(trimmed);
  if (hourly) {
    return `Runs every ${hourly[1]} hours, on the hour`;
  }
  if (trimmed === '0 0 * * *') {
    return 'Runs daily at midnight UTC';
  }
  const minutes = /^\*\/(\d+) \* \* \* \*$/.exec(trimmed);
  if (minutes) {
    return `Runs every ${minutes[1]} minutes`;
  }
  return 'Custom schedule';
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
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

export default PolicyEditorPage;
