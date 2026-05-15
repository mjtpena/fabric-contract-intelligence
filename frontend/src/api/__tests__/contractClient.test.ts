import { describe, expect, it } from 'vitest';
import { extractServerWorkspaceId, synchronizeDraftYaml } from '../contractClient';

const BASE_YAML = `
apiVersion: v3.1.0
kind: DataContract
name: Test Contract
status: draft
version: 1.0.0
servers:
  - server: fabric-default
    type: azure
    format: delta
    location: abfss://ws@onelake.dfs.fabric.microsoft.com/Lh.Lakehouse/Tables/t
`.trimStart();

describe('synchronizeDraftYaml', () => {
  it('writes workspaceId to the first server block when a valid GUID is provided', () => {
    const result = synchronizeDraftYaml(BASE_YAML, {
      name: 'Test Contract',
      status: 'draft',
      targetTablePath: 'abfss://ws@onelake.dfs.fabric.microsoft.com/Lh.Lakehouse/Tables/t',
      targetWorkspaceId: 'a1b2c3d4-e5f6-1234-8abc-000000000001',
      version: '1.0.0',
    });
    expect(result).toContain('workspaceId: a1b2c3d4-e5f6-1234-8abc-000000000001');
  });

  it('removes workspaceId from the server block when an empty string is provided', () => {
    const yamlWithId = synchronizeDraftYaml(BASE_YAML, {
      name: 'Test Contract',
      status: 'draft',
      targetTablePath: 'abfss://ws@onelake.dfs.fabric.microsoft.com/Lh.Lakehouse/Tables/t',
      targetWorkspaceId: 'a1b2c3d4-e5f6-1234-8abc-000000000001',
      version: '1.0.0',
    });

    const result = synchronizeDraftYaml(yamlWithId, {
      name: 'Test Contract',
      status: 'draft',
      targetTablePath: 'abfss://ws@onelake.dfs.fabric.microsoft.com/Lh.Lakehouse/Tables/t',
      targetWorkspaceId: '',
      version: '1.0.0',
    });
    expect(result).not.toContain('workspaceId');
  });

  it('does not write workspaceId when value is not a valid GUID', () => {
    const result = synchronizeDraftYaml(BASE_YAML, {
      name: 'Test Contract',
      status: 'draft',
      targetTablePath: 'abfss://ws@onelake.dfs.fabric.microsoft.com/Lh.Lakehouse/Tables/t',
      targetWorkspaceId: 'not-a-guid',
      version: '1.0.0',
    });
    expect(result).not.toContain('workspaceId');
  });
});

describe('extractServerWorkspaceId', () => {
  it('returns the workspaceId from the first server block', () => {
    const yaml = `apiVersion: v3.1.0\nservers:\n  - server: fabric-default\n    workspaceId: a1b2c3d4-e5f6-1234-8abc-000000000001\n    format: kql\n`;
    expect(extractServerWorkspaceId(yaml)).toBe('a1b2c3d4-e5f6-1234-8abc-000000000001');
  });

  it('returns null when workspaceId is absent from the server block', () => {
    expect(extractServerWorkspaceId(BASE_YAML)).toBeNull();
  });

  it('returns null when servers array is empty', () => {
    expect(extractServerWorkspaceId('apiVersion: v3.1.0\nservers: []\n')).toBeNull();
  });
});
