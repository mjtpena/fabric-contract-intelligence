import { useMemo, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
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
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
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
  const [tableName, setTableName] = useState('owid_co2_demo');
  const [tablePath, setTablePath] = useState('abfss://showcase@onelake.dfs.fabric.microsoft.com/ShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo');
  const [name, setName] = useState('OWID CO2 Contract');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [targetLakehouseId, setTargetLakehouseId] = useState('');
  const [description, setDescription] = useState('AI-generated contract from table profile');

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
    setLoading(true);
    try {
      const response = await aiClient.suggestContract({
        tableName,
        abfssUri: tablePath,
        columns: [],
        sampleRows: [],
      });
      setYaml(response.odcsYaml);
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
        name,
        description,
        ownerEmail,
        targetTablePath: tablePath,
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
      <Caption1>Enterprise AI Suggest</Caption1>
      <Body1>Generate an ODCS contract from a Delta table path, refine it in Monaco, then save.</Body1>

      <Field label="Contract name">
        <Input value={name} onChange={(_, data) => setName(data.value)} />
      </Field>
      <Field label="Owner email">
        <Input type="email" value={ownerEmail} onChange={(_, data) => setOwnerEmail(data.value)} />
      </Field>
      <Field label="Target lakehouse ID">
        <Input value={targetLakehouseId} onChange={(_, data) => setTargetLakehouseId(data.value)} />
      </Field>
      <Field label="Table name">
        <Input value={tableName} onChange={(_, data) => setTableName(data.value)} />
      </Field>
      <Field label="OneLake table path">
        <Input value={tablePath} onChange={(_, data) => setTablePath(data.value)} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(_, data) => setDescription(data.value)} />
      </Field>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={() => { void generate(); }} disabled={loading}>
          Generate draft
        </Button>
        <Button appearance="secondary" onClick={() => { void saveDraft(); }} disabled={loading}>
          Save draft
        </Button>
        <Button appearance="subtle" onClick={() => navigate('/contracts')}>
          Back to contracts
        </Button>
      </div>

      {loading ? <Spinner label="Generating AI draft…" /> : null}
      <div className={styles.editor}>
        <MonacoYamlEditor value={yaml} onChange={setYaml} themeMode={sdk.themeMode} />
      </div>
    </section>
  );
}
