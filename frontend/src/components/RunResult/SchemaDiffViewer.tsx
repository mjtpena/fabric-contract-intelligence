import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ensureMonacoYamlSetup } from '@/monaco/setup';

interface SchemaDiffViewerProps {
  modifiedYaml: string;
  originalYaml: string;
  themeMode: 'dark' | 'light';
}

const useStyles = makeStyles({
  root: {
    height: '100%',
    minHeight: '32rem',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
});

export function SchemaDiffViewer({
  modifiedYaml,
  originalYaml,
  themeMode,
}: SchemaDiffViewerProps) {
  const styles = useStyles();

  const handleMount: DiffOnMount = (_editor, monaco) => {
    ensureMonacoYamlSetup(monaco);
  };

  return (
    <div className={styles.root}>
      <DiffEditor
        language="yaml"
        modified={modifiedYaml}
        onMount={handleMount}
        options={{
          automaticLayout: true,
          minimap: {
            enabled: false,
          },
          readOnly: true,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
        original={originalYaml}
        originalModelPath="file:///contract-left.odcs.yaml"
        theme={themeMode === 'dark' ? 'vs-dark' : 'vs'}
      />
    </div>
  );
}
