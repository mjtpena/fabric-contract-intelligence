export interface SuggestContractColumn {
  name: string;
  type: string;
  nullable: boolean;
  distinctCount?: number;
  nullCount?: number;
}

export interface SuggestContractRequest {
  tableName: string;
  abfssUri: string;
  columns: SuggestContractColumn[];
  sampleRows: Array<Record<string, string | null>>;
}

export interface SuggestContractResponse {
  odcsYaml: string;
  rationale: string[];
  modelUsed: string;
  latencyMs: number;
}

export interface NaturalLanguageQueryRequest {
  query: string;
}

export interface NaturalLanguageQueryMatch {
  contractId: string;
  name: string;
  version: string;
  explanation: string;
  relevanceScore: number;
}

export interface NaturalLanguageQueryResponse {
  explanation: string;
  modelUsed: string;
  matches: NaturalLanguageQueryMatch[];
}
