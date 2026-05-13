import { useMemo, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Textarea,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SparkleRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
import {
  FabricTargetItemPicker,
  TablePicker,
  TargetTypePicker,
} from '@/components/FabricPickers';
import { createAiClient } from '@/api/aiClient';
import { createContractClient } from '@/api/contractClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ContractTargetType } from '@/models/Contract';
import { getContractTargetTypeLabel } from '@/models/ContractTarget';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  editor: {
    height: '28rem',
    minHeight: '20rem',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
});

export function AISuggestPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const sdk = useFabricSdk();
  const [loading, setLoading] = useState(false);
  const [yaml, setYaml] = useState('');
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [targetType, setTargetType] = useState<ContractTargetType>('lakehouse');
  const [targetItemId, setTargetItemId] = useState('');
  const [targetTablePath, setTargetTablePath] = useState('');
  const [description, setDescription] = useState('');

  const tableName = targetTablePath.split('/').at(-1) ?? '';

  const aiClient = useMemo(
    () =>
      createAiClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const contractClient = useMemo(
    () =>
      createContractClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const generate = async () => {
    if (!targetTablePath) {
      await sdk.notifyInfo('No target selected', 'Select a Fabric target and object before generating.');
      return;
    }

    setLoading(true);
    try {
      const response = await aiClient.suggestContract({
        tableName: tableName || 'table',
        abfssUri: targetTablePath,
        columns: [],
        sampleRows: [],
      });
      setYaml(response.odcsYaml);
      if (!name) {
        setName(tableName || 'Generated Contract');
      }
      await sdk.notifySuccess('AI suggestion ready', `${response.modelUsed} returned a draft in ${response.latencyMs} ms.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate contract draft.';
      await sdk.notifyError('AI suggestion failed', message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!yaml.trim()) {
      await sdk.notifyInfo('Missing draft', 'Generate or paste a YAML draft before saving.');
      return;
    }

    try {
      const created = await contractClient.createContract({
        mode: 'direct',
        name: name || tableName || 'AI Generated Contract',
        description,
        ownerEmail,
        targetType,
        targetItemId,
        targetTablePath,
        targetLakehouseId: targetType === 'lakehouse' ? targetItemId : null,
        odcsYaml: yaml,
      });
      await sdk.notifySuccess('Contract created', 'AI draft was saved as a contract.');
      navigate(`/contracts/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save AI-generated draft.';
      await sdk.notifyError('Save failed', message);
    }
  };

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <Title2>AI Contract Suggest</Title2>
        <Body1>Generate an ODCS contract from a Fabric data product, refine in Monaco, then save.</Body1>
      </div>

      <div className={styles.grid}>
        <TargetTypePicker
          value={targetType}
          onChange={(nextType) => {
            setTargetType(nextType);
            setTargetItemId('');
            setTargetTablePath(getDefaultTargetPath(nextType));
          }}
        />
        <FabricTargetItemPicker
          apiBaseUrl={sdk.apiBaseUrl}
          getToken={sdk.getAccessToken}
          isReady={sdk.isReady}
          targetType={targetType}
          value={targetItemId}
          workspaceId={sdk.workspaceId}
          onChange={(id) => {
            setTargetItemId(id);
            if (targetType === 'lakehouse') {
              setTargetTablePath('');
            }
          }}
        />
        {targetType === 'lakehouse' ? (
          <TablePicker
            apiBaseUrl={sdk.apiBaseUrl}
            getToken={sdk.getAccessToken}
            isReady={sdk.isReady}
            lakehouseId={targetItemId}
            value={targetTablePath}
            workspaceId={sdk.workspaceId}
            onChange={setTargetTablePath}
          />
        ) : (
          <Field
            hint={getTargetPathHint(targetType)}
            label={`${getContractTargetTypeLabel(targetType)} object`}
          >
            <Input value={targetTablePath} onChange={(_, data) => setTargetTablePath(data.value)} />
          </Field>
        )}
        <Field label="Contract name">
          <Input
            placeholder={tableName ? `e.g. ${tableName} Contract` : 'Auto-filled after generate'}
            value={name}
            onChange={(_, data) => setName(data.value)}
          />
        </Field>
        <Field label="Owner email">
          <Input type="email" value={ownerEmail} onChange={(_, data) => setOwnerEmail(data.value)} />
        </Field>
        <Field className={styles.fullWidth} label="Description">
          <Textarea value={description} onChange={(_, data) => setDescription(data.value)} />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          disabled={loading || !targetTablePath}
          icon={<SparkleRegular />}
          onClick={() => { void generate(); }}
        >
          {loading ? 'Generating…' : 'Generate draft'}
        </Button>
        <Button
          appearance="secondary"
          disabled={loading || !yaml.trim()}
          onClick={() => { void saveDraft(); }}
        >
          Save draft
        </Button>
        <Button appearance="subtle" onClick={() => navigate('/contracts')}>
          Back to contracts
        </Button>
        {loading ? <Spinner size="tiny" /> : null}
      </div>

      {yaml || !targetTablePath ? (
        <div className={styles.editor}>
          <MonacoYamlEditor
            value={yaml || (targetTablePath ? '' : '# Select a Fabric target above, then click Generate draft')}
            onChange={setYaml}
            themeMode={sdk.themeMode}
          />
        </div>
      ) : null}

      {!targetTablePath ? (
        <Caption1>Select a Fabric target above to enable AI contract generation.</Caption1>
      ) : null}
    </section>
  );
}

function getDefaultTargetPath(targetType: ContractTargetType) {
  switch (targetType) {
    case 'warehouse':
      return 'fabric://workspace/warehouse/schema.table';
    case 'eventhouse':
      return 'fabric://workspace/eventhouse/database/table';
    case 'semantic_model':
      return 'fabric://workspace/semantic-model/model-name';
    case 'fabric_sql':
      return 'fabric://workspace/sql-database/schema.table';
    case 'lakehouse':
    default:
      return '';
  }
}

function getTargetPathHint(targetType: ContractTargetType) {
  switch (targetType) {
    case 'warehouse':
    case 'fabric_sql':
      return 'Use schema.table, view name, or a fabric:// URI for query-based checks.';
    case 'eventhouse':
      return 'Use the KQL database/table name or a fabric:// URI for event schema checks.';
    case 'semantic_model':
      return 'Use the semantic model name, table/measure scope, or a fabric:// URI.';
    case 'lakehouse':
    default:
      return 'The ABFSS path is auto-filled when you pick a table.';
  }
}
