import type { Monaco } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { configureMonacoYaml } from 'monaco-yaml';
import odcsSchema from './odcs-v3.1.0.schema.json';
import YamlWorker from './yaml.worker?worker';

let isConfigured = false;

if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'yaml') {
        return new YamlWorker();
      }

      return new EditorWorker();
    },
  };
}

export function ensureMonacoYamlSetup(monaco: Monaco) {
  if (isConfigured) {
    return;
  }

  configureMonacoYaml(monaco, {
    completion: true,
    enableSchemaRequest: false,
    format: true,
    hover: true,
    schemas: [
      {
        fileMatch: ['**/*.yaml', '**/*.yml', 'file:///contract.odcs.yaml'],
        schema: odcsSchema as object,
        uri: '/schemas/odcs-v3.1.0.json',
      },
    ],
    validate: true,
    yamlVersion: '1.2',
  });

  monaco.languages.registerCompletionItemProvider('yaml', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        endColumn: word.endColumn,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        startLineNumber: position.lineNumber,
      };

      return {
        suggestions: [
          createSnippet(monaco, range, 'schema entry', 'Insert a schema property entry', [
            '- name: ${1:column_name}',
            '  logicalType: ${2:string}',
            '  physicalType: ${3:STRING}',
            '  required: ${4:true}',
          ].join('\n')),
          createSnippet(monaco, range, 'quality rule', 'Insert a quality rule custom property block', [
            '- type: ${1:nullRate}',
            '  column: ${2:column_name}',
            '  threshold: ${3:0.0}',
            '  severity: ${4:error}',
          ].join('\n')),
          createSnippet(monaco, range, 'freshness block', 'Insert an Orqentis freshness custom property block', [
            'maxAgeHours: ${1:24}',
            'severity: ${2:warning}',
          ].join('\n')),
        ],
      };
    },
  });

  isConfigured = true;
}

function createSnippet(
  monaco: Monaco,
  range: {
    endColumn: number;
    endLineNumber: number;
    startColumn: number;
    startLineNumber: number;
  },
  label: string,
  documentation: string,
  insertText: string,
) {
  return {
    documentation,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Snippet,
    label,
    range,
  };
}
