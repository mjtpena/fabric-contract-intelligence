export interface WorkspaceApiKey {
  id: string;
  displayName: string;
  keyHint: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyResponse {
  id: string;
  displayName: string;
  keyHint: string;
  rawKey: string;
  createdAt: string;
}
