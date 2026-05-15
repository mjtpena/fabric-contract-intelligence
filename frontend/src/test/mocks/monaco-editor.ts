/**
 * Minimal monaco-editor stub for Vitest / JSDOM test environments.
 *
 * monaco-editor ships browser-only workers and DOM-heavy APIs that can't
 * be resolved or executed inside Node/JSDOM. Components that import Monaco
 * are already mocked via `vi.mock('@monaco-editor/react', ...)`, so only
 * the module-level `loader.config({ monaco })` call needs a shape-compatible
 * object to satisfy the import without errors.
 */
export const editor = {
  create: () => ({ dispose: () => {}, getValue: () => '', setValue: () => {} }),
  createModel: () => null,
  setModelLanguage: () => {},
  setTheme: () => {},
  defineTheme: () => {},
};

export const languages = {
  register: () => {},
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
  setMonarchTokensProvider: () => ({ dispose: () => {} }),
  CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  CompletionItemKind: { Snippet: 27, Field: 4, Keyword: 17 },
  typescript: {
    typescriptDefaults: { setDiagnosticsOptions: () => {}, addExtraLib: () => {} },
    javascriptDefaults: { setDiagnosticsOptions: () => {}, addExtraLib: () => {} },
  },
};

export const Uri = {
  parse: (s: string) => s,
  file: (s: string) => s,
};

export const KeyCode = {};
export const KeyMod = { CtrlCmd: 0, Shift: 0, Alt: 0 };
export const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 };
export const Range = class {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number,
  ) {}
};
