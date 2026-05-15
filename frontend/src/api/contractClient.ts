import Ajv2019 from 'ajv/dist/2019';
import type { ErrorObject } from 'ajv';
import { parseDocument, stringify } from 'yaml';
import odcsSchema from '@/monaco/odcs-v3.1.0.schema.json';
import type {
  ContractDetail,
  ContractSummary,
  ContractTargetType,
  ContractValidationResult,
  ContractVersion,
  CreateContractRequest,
  RunAccepted,
  SchemaPreviewField,
  UpdateContractRequest,
  ValidationIssue,
} from '@/models/Contract';

export interface ContractClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  workspaceId?: string;
  correlationId?: string;
}

export interface ContractClient {
  listContracts: () => Promise<ContractSummary[]>;
  getContract: (contractId: string) => Promise<ContractDetail>;
  createContract: (request: CreateContractRequest) => Promise<ContractDetail>;
  updateContract: (contractId: string, request: UpdateContractRequest) => Promise<ContractDetail>;
  deleteContract: (contractId: string) => Promise<void>;
  listVersions: (contractId: string) => Promise<ContractVersion[]>;
  runNow: (contractId: string) => Promise<RunAccepted>;
  validate: (yaml: string) => Promise<ContractValidationResult>;
}

interface ProblemDetails {
  detail?: string;
  errors?: Record<string, string[]>;
  title?: string;
}

export class ContractClientError extends Error {
  readonly details: string[];
  readonly status: number;

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ContractClientError';
    this.details = details;
    this.status = status;
  }
}

const validator = createValidator();

export function createContractClient(options: ContractClientOptions): ContractClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    const token = await options.getAccessToken();

    headers.set('Accept', 'application/json');

    if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.workspaceId) {
      headers.set('X-Workspace-Id', options.workspaceId);
    }

    if (options.correlationId) {
      headers.set('X-Correlation-Id', options.correlationId);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw await toContractClientError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    listContracts: () => request<ContractSummary[]>('/v1/contracts'),
    getContract: (contractId) => request<ContractDetail>(`/v1/contracts/${contractId}`),
    createContract: (requestBody) =>
      request<ContractDetail>('/v1/contracts', {
        body: JSON.stringify(requestBody),
        method: 'POST',
      }),
    updateContract: (contractId, requestBody) =>
      request<ContractDetail>(`/v1/contracts/${contractId}`, {
        body: JSON.stringify(requestBody),
        method: 'PUT',
      }),
    deleteContract: (contractId) =>
      request<void>(`/v1/contracts/${contractId}`, {
        method: 'DELETE',
      }),
    listVersions: (contractId) => request<ContractVersion[]>(`/v1/contracts/${contractId}/versions`),
    runNow: (contractId) =>
      request<RunAccepted>(`/v1/contracts/${contractId}/runs`, {
        body: JSON.stringify({}),
        method: 'POST',
      }),
    validate: async (yaml) => validateContractYaml(yaml),
  };
}

export function createDefaultContractYaml(name = 'New Contract'): string {
  const slug = slugify(name);

  return [
    'apiVersion: v3.1.0',
    'kind: DataContract',
    `id: urn:orqentis:orqentis:${slug}:v1`,
    `name: ${name}`,
    'version: 1.0.0',
    'status: draft',
    'servers:',
    '  - server: fabric-default',
    '    type: azure',
    '    location: abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/example_table',
    '    format: delta',
    'schema:',
    `  - name: ${slug}`,
    '    physicalType: table',
    '    properties:',
    '      - name: id',
    '        logicalType: string',
    '        physicalType: STRING',
    '        required: true',
  ].join('\n');
}

export function synchronizeDraftYaml(
  yaml: string,
  metadata: {
    name: string;
    status: string;
    targetType?: ContractTargetType;
    targetTablePath: string;
    targetWorkspaceId?: string;
    version: string;
  },
): string {
  const document = parseDocument(yaml);

  if (document.errors.length > 0) {
    return yaml;
  }

  const currentValue = document.toJSON() as unknown;
  const nextValue = isRecord(currentValue) ? { ...currentValue } : {};
  nextValue.apiVersion = 'v3.1.0';
  nextValue.kind = 'DataContract';
  nextValue.name = metadata.name;
  nextValue.status = metadata.status;
  nextValue.version = metadata.version;
  nextValue.id = typeof nextValue.id === 'string' && nextValue.id.length > 0
    ? nextValue.id
    : `urn:orqentis:orqentis:${slugify(metadata.name)}:v1`;

  const servers = Array.isArray(nextValue.servers) ? [...nextValue.servers] : [];
  const firstServer: Record<string, unknown> =
    servers.length > 0 && isRecord(servers[0]) ? { ...servers[0] } : { server: 'fabric-default' };
  firstServer.type = typeof firstServer.type === 'string' && firstServer.type.length > 0 ? firstServer.type : 'azure';
  firstServer.location = metadata.targetTablePath;
  firstServer.format = getServerFormat(metadata.targetType ?? 'lakehouse');

  // Cross-workspace: write workspaceId when provided, delete it when cleared.
  if (metadata.targetWorkspaceId && isGuidString(metadata.targetWorkspaceId)) {
    firstServer.workspaceId = metadata.targetWorkspaceId;
  } else {
    delete firstServer.workspaceId;
  }

  servers[0] = firstServer;
  nextValue.servers = servers;

  return stringify(nextValue);
}

/** Extracts the workspaceId from the first server entry in an ODCS YAML string, or null if absent. */
export function extractServerWorkspaceId(yaml: string): string | null {
  try {
    const document = parseDocument(yaml);
    if (document.errors.length > 0) return null;
    const value = document.toJSON() as unknown;
    if (!isRecord(value)) return null;
    const servers = Array.isArray(value.servers) ? value.servers : [];
    if (servers.length === 0 || !isRecord(servers[0])) return null;
    const wsId = servers[0].workspaceId;
    return typeof wsId === 'string' && wsId.length > 0 ? wsId : null;
  } catch {
    return null;
  }
}

function isGuidString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function toContractClientError(response: Response): Promise<ContractClientError> {
  let payload: ProblemDetails | null = null;

  try {
    payload = (await response.json()) as ProblemDetails;
  } catch {
    payload = null;
  }

  const validationDetails = payload?.errors
    ? Object.entries(payload.errors).flatMap(([path, messages]) =>
        messages.map((message) => `${path}: ${message}`),
      )
    : [];

  return new ContractClientError(
    payload?.title ?? `Request failed with status ${response.status}.`,
    response.status,
    payload?.detail ? [payload.detail, ...validationDetails] : validationDetails,
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function createValidator() {
  const ajv = new Ajv2019({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
    validateFormats: false,
  });

  return ajv.compile(odcsSchema as object);
}

async function validateContractYaml(yaml: string): Promise<ContractValidationResult> {
  const document = parseDocument(yaml);
  const issues: ValidationIssue[] = document.errors.map((error) => ({
    message: error.message,
    path: 'yaml',
    severity: 'error',
  }));

  if (issues.length > 0) {
    return {
      isValid: false,
      issues,
      schemaPreview: [],
      validatedAt: new Date().toISOString(),
    };
  }

  const parsed = document.toJSON() as unknown;

  if (!validator(parsed)) {
    issues.push(
      ...(validator.errors ?? []).map((error) => ({
        message: formatAjvMessage(error),
        path: error.instancePath || '/',
        severity: 'error' as const,
      })),
    );
  }

  if (!hasServerEntry(parsed)) {
    issues.push({
      message: 'At least one server entry is required.',
      path: '/servers',
      severity: 'error',
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    schemaPreview: extractSchemaPreview(parsed),
    validatedAt: new Date().toISOString(),
  };
}

function formatAjvMessage(error: ErrorObject): string {
  if (error.keyword === 'required' && typeof error.params.missingProperty === 'string') {
    return `Missing required property "${error.params.missingProperty}".`;
  }

  return error.message ?? 'Schema validation failed.';
}

function hasServerEntry(parsed: unknown): boolean {
  if (!isRecord(parsed)) {
    return false;
  }

  return Array.isArray(parsed.servers) && parsed.servers.length > 0;
}

function extractSchemaPreview(parsed: unknown): SchemaPreviewField[] {
  if (!isRecord(parsed) || !Array.isArray(parsed.schema)) {
    return [];
  }

  return parsed.schema.flatMap((schemaObject) => {
    if (!isRecord(schemaObject) || !Array.isArray(schemaObject.properties)) {
      return [];
    }

    return schemaObject.properties
      .filter(isRecord)
      .map<SchemaPreviewField>((property) => ({
        name: typeof property.name === 'string' ? property.name : 'unnamed',
        logicalType: typeof property.logicalType === 'string' ? property.logicalType : null,
        physicalType: typeof property.physicalType === 'string' ? property.physicalType : null,
        required: property.required === true,
        unique: property.unique === true,
      }));
  });
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'contract';
}

function getServerFormat(targetType: ContractTargetType): string {
  switch (targetType) {
    case 'warehouse':
    case 'fabric_sql':
      return 'sql';
    case 'eventhouse':
      return 'kql';
    case 'semantic_model':
      return 'semantic_model';
    case 'lakehouse':
    default:
      return 'delta';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
