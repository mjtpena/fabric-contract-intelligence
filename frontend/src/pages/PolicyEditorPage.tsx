import { useEffect, useMemo, useState } from 'react';
import {
  Body1,
  Body1Strong,
  Card,
  Checkbox,
  Dropdown,
  Field,
  Option,
  Tab,
  TabList,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createContractClient } from '@/api/contractClient';
import { createOpsClient } from '@/api/opsClient';
import { RulePicker } from '@/components/Activator/RulePicker';
import { IntegrationPicker, validateIntegration, type IntegrationValue } from '@/components/Integration/IntegrationPicker';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { ScheduleBuilder } from '@/components/Schedule/ScheduleBuilder';
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
    gap: tokens.spacingVerticalM,
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
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
  const [cronExpression, setCronExpression] = useState('0 6 * * *');
  const [alertOnWarn, setAlertOnWarn] = useState(false);
  const [actionType, setActionType] = useState<'notify' | 'webhook'>('notify');
  const [integration, setIntegration] = useState<IntegrationValue>({ webhookType: 'teams', webhookUrl: '', serviceNowTable: 'incident' });
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

    const error = validateIntegration(integration);
    setRoutingError(error);
    return !error;
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
      provider: integration.webhookType,
      webhookType: integration.webhookType,
      webhookUrl: integration.webhookUrl || undefined,
      headersJson: integration.headersJson || undefined,
      serviceNowTable: integration.serviceNowTable || undefined,
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
    && (actionType !== 'webhook' || !validateIntegration(integration));
  const selectedContractName = contracts.find((contract) => contract.id === contractId)?.name;
  const renderNotSet = () => <Body1 className={styles.mutedValue}>Not set</Body1>;

  const homeToolbarActions: RibbonAction[] = useMemo(() => {
    const actions: RibbonAction[] = [];
    if (step < 3) {
      actions.push({
        key: 'next',
        label: 'Next',
        appearance: 'primary',
        onClick: goNext,
      });
    } else {
      actions.push({
        key: 'save',
        label: isSaving ? 'Saving…' : 'Save policy',
        appearance: 'primary',
        disabled: !canSave || isSaving,
        onClick: () => { void savePolicy(); },
      });
    }
    if (step > 0) {
      actions.push({
        key: 'previous',
        label: 'Previous',
        onClick: () => setStep((current) => Math.max(current - 1, 0)),
      });
    }
    actions.push({
      key: 'cancel',
      label: 'Cancel',
      onClick: () => {
        void openWorkloadRoute(contractId ? `/contracts/${contractId}/edit` : '/contracts');
      },
    });
    return actions;
  }, [step, isSaving, canSave, contractId]);

  return (
    <ItemEditor
      title="Policy editor"
      subtitle="Schedule enforcement, choose alerts, and route breaches without leaving Fabric."
      homeToolbarActions={homeToolbarActions}
    >
      <div className={styles.root}>
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
        <ScheduleBuilder
          error={cronError}
          value={cronExpression}
          onChange={(cron) => {
            setCronExpression(cron);
            setCronError(null);
          }}
          onCustomEdit={() => setCronError(null)}
        />
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
            <IntegrationPicker
              client={opsClient}
              error={routingError}
              value={integration}
              onChange={(next) => {
                setIntegration(next);
                setRoutingError(null);
              }}
            />
          )}
        </>
      ) : null}

      {step === 3 ? (
        <Card>
          <dl className={styles.reviewList}>
            <Field label="Trigger">
              <Body1Strong>{alertOnWarn ? 'Failed or warned runs' : 'Failed runs only'}</Body1Strong>
            </Field>
            <Field label="Schedule">
              <Body1Strong>{cronToHuman(cronExpression)} · {cronExpression}</Body1Strong>
            </Field>
            <Field label="Action">
              <Body1Strong>
                {actionType === 'notify' ? 'Notify Activator rule' : `Send ${integration.webhookType} alert`}
              </Body1Strong>
            </Field>
            <Field label="Webhook URL">
              {integration.webhookUrl ? <Body1Strong>{integration.webhookType === 'pagerduty' ? 'PagerDuty routing key configured' : integration.webhookUrl}</Body1Strong> : renderNotSet()}
            </Field>
            <Field label="Headers">
              {actionType === 'webhook' ? <Body1Strong>Managed by destination</Body1Strong> : renderNotSet()}
            </Field>
            <Field label="Active">
              <Body1Strong>Enabled</Body1Strong>
            </Field>
            <Field label="Contract">
              {selectedContractName ? <Body1Strong>{selectedContractName}</Body1Strong> : renderNotSet()}
            </Field>
          </dl>
        </Card>
      ) : null}

      </div>
    </ItemEditor>
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
