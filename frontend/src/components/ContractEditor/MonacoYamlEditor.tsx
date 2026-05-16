import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ensureMonacoYamlSetup } from '@/monaco/setup';

// Use the locally bundled Monaco instead of loading from CDN.
// This is required for Fabric iframe CSP and offline/headless environments.
loader.config({ monaco });

interface MonacoYamlEditorProps {
  onChange: (value: string) => void;
  readOnly?: boolean;
  themeMode: 'dark' | 'light';
  value: string;
}

const useStyles = makeStyles({
  root: {
    height: '100%',
    minHeight: '28rem',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
});

export function MonacoYamlEditor({
  onChange,
  readOnly,
  themeMode,
  value,
}: MonacoYamlEditorProps) {
  const styles = useStyles();

  const handleMount: OnMount = (_editor, monaco) => {
    ensureMonacoYamlSetup(monaco);
  };

  return (
    <div className={styles.root}>
      <Editor
        language="yaml"
        onChange={(nextValue) => {
          onChange(nextValue ?? '');
        }}
        onMount={handleMount}
        options={{
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          minimap: {
            enabled: false,
          },
          readOnly,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
        path="file:///contract.odcs.yaml"
        theme={themeMode === 'dark' ? 'vs-dark' : 'vs'}
        value={value}
      />
    </div>
  );
}
