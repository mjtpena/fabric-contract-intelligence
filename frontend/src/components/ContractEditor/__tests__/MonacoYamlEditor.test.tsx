import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
import { renderWithProviders } from '@/test/renderWithProviders';

const { ensureMonacoYamlSetupMock } = vi.hoisted(() => ({
  ensureMonacoYamlSetupMock: vi.fn(),
}));

vi.mock('@/monaco/setup', () => ({
  ensureMonacoYamlSetup: ensureMonacoYamlSetupMock,
}));

vi.mock('@monaco-editor/react', () => ({
  default: (props: {
    language: string;
    onChange?: (value?: string) => void;
    onMount?: (_editor: unknown, monaco: unknown) => void;
    theme: string;
    value: string;
  }) => {
    props.onMount?.({}, { languages: { CompletionItemInsertTextRule: {}, CompletionItemKind: {} } });

    return (
      <div data-language={props.language} data-testid="monaco-editor" data-theme={props.theme}>
        <span>{props.value}</span>
        <button onClick={() => props.onChange?.('apiVersion: v3.1.0')}>emit-change</button>
      </div>
    );
  },
}));

describe('MonacoYamlEditor', () => {
  it('configures Monaco for YAML and forwards change events', () => {
    const handleChange = vi.fn();

    renderWithProviders(
      <MonacoYamlEditor onChange={handleChange} themeMode="dark" value="status: draft" />,
    );

    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-language', 'yaml');
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-theme', 'vs-dark');
    expect(ensureMonacoYamlSetupMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'emit-change' }));

    expect(handleChange).toHaveBeenCalledWith('apiVersion: v3.1.0');
  });
});
