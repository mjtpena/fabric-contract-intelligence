import { useState } from 'react';
import {
  Button,
  Caption1,
  Card,
  Dropdown,
  Field,
  Input,
  Option,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AlertRegular, BotRegular, ChatRegular, PlugConnectedRegular, ServiceBellRegular } from '@fluentui/react-icons';
import type { OpsClient } from '@/api/opsClient';

export type WebhookType = 'teams' | 'slack' | 'pagerduty' | 'servicenow' | 'webex' | 'generic';

export interface IntegrationValue {
  headersJson?: string;
  serviceNowTable?: 'incident' | 'problem' | 'change_request';
  webhookType: WebhookType;
  webhookUrl: string;
}

export interface IntegrationPickerProps {
  client: Pick<OpsClient, 'testWebhook'>;
  error?: string | null;
  onChange: (value: IntegrationValue) => void;
  value: IntegrationValue;
}

const integrations: Array<{ description: string; icon: JSX.Element; label: string; value: WebhookType }> = [
  { value: 'teams', label: 'Teams', icon: <ChatRegular />, description: 'Posts a formatted alert card into a Teams channel.' },
  { value: 'slack', label: 'Slack', icon: <ChatRegular />, description: 'Sends contract breach alerts into a Slack channel.' },
  { value: 'pagerduty', label: 'PagerDuty', icon: <AlertRegular />, description: 'Creates incidents from failed enforcement runs.' },
  { value: 'servicenow', label: 'ServiceNow', icon: <ServiceBellRegular />, description: 'Creates a ticket in the selected ServiceNow table.' },
  { value: 'webex', label: 'Webex', icon: <BotRegular />, description: 'Posts alert summaries to a Webex space webhook.' },
  { value: 'generic', label: 'Generic webhook', icon: <PlugConnectedRegular />, description: 'POSTs the alert payload to your HTTPS endpoint.' },
];

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  chips: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  row: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center', flexWrap: 'wrap' },
  result: { color: tokens.colorNeutralForeground3 },
});

export function IntegrationPicker({ client, error, onChange, value }: IntegrationPickerProps) {
  const styles = useStyles();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const selected = integrations.find((item) => item.value === value.webhookType) ?? integrations[5];

  const update = (patch: Partial<IntegrationValue>) => {
    setTestResult(null);
    onChange({ ...value, ...patch });
  };

  const validation = error ?? validateIntegration(value);

  const sendTest = async () => {
    const invalid = validateIntegration(value);
    if (invalid) {
      setTestResult(invalid);
      return;
    }

    setTesting(true);
    try {
      await client.testWebhook(value.webhookUrl, value.webhookType);
      setTestResult('Test alert sent.');
    } catch {
      setTestResult('Test endpoint unavailable; settings are saved and will be retried by policy execution.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.chips} aria-label="Integration type">
        {integrations.map((integration) => (
          <Button
            key={integration.value}
            appearance={value.webhookType === integration.value ? 'primary' : 'secondary'}
            icon={integration.icon}
            onClick={() => update({ webhookType: integration.value, webhookUrl: '', headersJson: '', serviceNowTable: 'incident' })}
          >
            {integration.label}
          </Button>
        ))}
      </div>

      <Card className={styles.card}>
        <Caption1>{selected.description}</Caption1>
        {renderFields(value, update, validation)}
        <div className={styles.row}>
          <Button appearance="secondary" disabled={testing} onClick={() => { void sendTest(); }}>
            {testing ? 'Sending…' : 'Send test alert'}
          </Button>
          {testResult ? <Caption1 className={styles.result}>{testResult}</Caption1> : null}
        </div>
      </Card>
    </div>
  );
}

export function validateIntegration(value: IntegrationValue): string | null {
  if (value.webhookType === 'pagerduty') {
    return /^[a-z0-9]{32}$/i.test(value.webhookUrl) ? null : 'PagerDuty routing key must be 32 alphanumeric characters.';
  }
  try {
    const url = new URL(value.webhookUrl);
    if (url.protocol !== 'https:') return 'Integration URL must use HTTPS.';
    if (value.webhookType === 'teams') {
      return /^https:\/\/([a-z0-9-]+\.)*webhook\.office\.com\//i.test(value.webhookUrl)
        || /^https:\/\/outlook\.office\.com\/webhook\//i.test(value.webhookUrl)
        ? null
        : 'Teams webhooks must use webhook.office.com or outlook.office.com/webhook.';
    }
    if (value.webhookType === 'slack') {
      return /^https:\/\/hooks\.slack\.com\/services\//i.test(value.webhookUrl) ? null : 'Slack webhooks must start with https://hooks.slack.com/services/.';
    }
    if (value.webhookType === 'servicenow') {
      return /^https:\/\/[^/]+\.service-now\.com\/?$/i.test(value.webhookUrl) ? null : 'ServiceNow instance must look like https://instance.service-now.com.';
    }
    return null;
  } catch {
    return value.webhookType === 'generic' ? 'Enter a valid HTTPS webhook URL.' : 'Enter the integration value.';
  }
}

function renderFields(value: IntegrationValue, update: (patch: Partial<IntegrationValue>) => void, validation: string | null) {
  if (value.webhookType === 'pagerduty') {
    return (
      <>
        <Field label="Routing key" validationMessage={validation ?? undefined} validationState={validation ? 'error' : 'none'}>
          <Input value={value.webhookUrl} onChange={(_, data) => update({ webhookUrl: data.value })} />
        </Field>
        <Caption1>Severity → policy mapping: failed runs create high-severity incidents; warnings are informational.</Caption1>
      </>
    );
  }

  if (value.webhookType === 'servicenow') {
    return (
      <>
        <Field label="Instance URL" validationMessage={validation ?? undefined} validationState={validation ? 'error' : 'none'}>
          <Input value={value.webhookUrl} onChange={(_, data) => update({ webhookUrl: data.value })} />
        </Field>
        <Field label="Table">
          <Dropdown selectedOptions={[value.serviceNowTable ?? 'incident']} value={value.serviceNowTable ?? 'incident'} onOptionSelect={(_, data) => update({ serviceNowTable: data.optionValue as IntegrationValue['serviceNowTable'] })}>
            <Option value="incident">incident</Option>
            <Option value="problem">problem</Option>
            <Option value="change_request">change_request</Option>
          </Dropdown>
        </Field>
      </>
    );
  }

  const label = value.webhookType === 'teams'
    ? 'Paste the Incoming Webhook URL from your Teams channel'
    : value.webhookType === 'slack'
      ? 'Slack Incoming Webhook URL'
      : value.webhookType === 'webex'
        ? 'Webex webhook URL'
        : 'HTTPS webhook URL';

  return (
    <>
      <Field label={label} validationMessage={validation ?? undefined} validationState={validation ? 'error' : 'none'}>
        <Input value={value.webhookUrl} onChange={(_, data) => update({ webhookUrl: data.value })} />
      </Field>
      {value.webhookType === 'generic' ? (
        <Field label="Optional headers JSON">
          <Textarea value={value.headersJson ?? ''} onChange={(_, data) => update({ headersJson: data.value })} />
        </Field>
      ) : null}
    </>
  );
}
