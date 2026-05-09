import { act, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ValidationPanel } from '@/components/ContractEditor/ValidationPanel';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('ValidationPanel', () => {
  it('updates the validation result within 500 ms', async () => {
    vi.useFakeTimers({
      toFake: ['clearTimeout', 'setTimeout'],
    });

    const validateYaml = vi.fn().mockResolvedValue({
      isValid: false,
      issues: [
        {
          message: 'Invalid YAML',
          path: '/yaml',
          severity: 'error' as const,
        },
      ],
      schemaPreview: [
        {
          logicalType: 'string',
          name: 'encounter_id',
          physicalType: 'STRING',
          required: true,
          unique: false,
        },
      ],
      validatedAt: '2026-05-09T00:00:00Z',
    });

    renderWithProviders(
      <ValidationPanel validateYaml={validateYaml} yaml={'status: draft\nschema: ['} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });

    expect(screen.queryByText('Invalid YAML')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByText('Invalid YAML')).toBeInTheDocument();
    expect(screen.getByText('encounter_id')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
