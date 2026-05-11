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
import { LakehousePicker, TablePicker } from '@/components/FabricPickers';
import { createAiClient } from '@/api/aiClient';
import { createContractClient } from '@/api/contractClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';

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
  const [targetLakehouseId, setTargetLakehouseId] = useState('');
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
      await sdk.notifyInfo('No table selected', 'Select a lakehouse and table before generating.');
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
        targetTablePath,
        targetLakehouseId,
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
        <Body1>Generate an ODCS contract from a Delta table, refine in Monaco, then save.</Body1>
      </div>

      <div className={styles.grid}>
        <LakehousePicker
          apiBaseUrl={sdk.apiBaseUrl}
          getToken={sdk.getAccessToken}
          value={targetLakehouseId}
          workspaceId={sdk.workspaceId}
          onChange={(id) => {
            setTargetLakehouseId(id);
            setTargetTablePath('');
          }}
        />
        <TablePicker
          apiBaseUrl={sdk.apiBaseUrl}
          getToken={sdk.getAccessToken}
          lakehouseId={targetLakehouseId}
          value={targetTablePath}
          workspaceId={sdk.workspaceId}
          onChange={setTargetTablePath}
        />
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
            value={yaml || (targetTablePath ? '' : '# Select a lakehouse and table above, then click Generate draft')}
            onChange={setYaml}
            themeMode={sdk.themeMode}
          />
        </div>
      ) : null}

      {!targetTablePath ? (
        <Caption1>Select a lakehouse and table above to enable AI contract generation.</Caption1>
      ) : null}
    </section>
  );
}
