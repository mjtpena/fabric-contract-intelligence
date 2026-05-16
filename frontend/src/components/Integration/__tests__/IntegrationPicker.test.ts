import { describe, expect, it } from 'vitest';
import { validateIntegration, type IntegrationValue } from '../IntegrationPicker';

const base: IntegrationValue = { webhookType: 'teams', webhookUrl: 'https://example.webhook.office.com/path' };

describe('IntegrationPicker validation', () => {
  it('accepts Teams office webhook URLs', () => {
    expect(validateIntegration(base)).toBeNull();
  });

  it('rejects Slack URLs outside hooks.slack.com/services', () => {
    expect(validateIntegration({ webhookType: 'slack', webhookUrl: 'https://slack.com/app' })).toContain('Slack webhooks');
  });
});
