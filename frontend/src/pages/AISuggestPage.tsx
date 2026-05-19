import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeftRegular, SaveRegular, SparkleRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
import { EmptyState } from '@/components/EmptyState';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { FabricTargetItemPicker, TablePicker, TargetTypePicker } from '@/components/FabricPickers';
import { createAiClient } from '@/api/aiClient';
import { createContractClient } from '@/api/contractClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import { aiDescriptionTemplates } from '@/lib/aiTemplates';
import type { ContractTargetType } from '@/models/Contract';
import { getContractTargetTypeLabel } from '@/models/ContractTarget';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
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
  chips: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  examples: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalM,
  },
  resultHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: tokens.spacingHorizontalS,
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
  const [isSaving, setIsSaving] = useState(false);
  const [yaml, setYaml] = useState('');
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [targetType, setTargetType] = useState<ContractTargetType>('lakehouse');
  const [targetItemId, setTargetItemId] = useState('');
  const [targetTablePath, setTargetTablePath] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isHeuristicResult, setIsHeuristicResult] = useState(false);

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
      await sdk.notifyInfo(
        'No target selected',
        'Select a Fabric target and object before generating.',
      );
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
      setIsHeuristicResult(isFallbackModel(response.modelUsed));
      if (!name) {
        setName(tableName || 'Generated Contract');
      }
      await sdk.notifySuccess('Suggestion generated', 'Review the draft before saving.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate contract draft.';
      await sdk.notifyError('AI suggestion failed', message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (isSaving) {
      return;
    }

    const trimmedYaml = yaml.trim();
    if (!trimmedYaml || trimmedYaml.startsWith('# Select a Fabric target above')) {
      await sdk.notifyError('No contract content', 'Generate a contract before saving.');
      return;
    }

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ItemEditor
      title="AI Contract Suggest"
      subtitle="Describe a Fabric target and get a draft contract to refine."
      homeToolbarActions={
        [
          {
            key: 'generate',
            label: loading ? 'Generating…' : 'Generate draft',
            appearance: 'primary',
            icon: <SparkleRegular />,
            disabled: loading || !targetTablePath,
            onClick: () => {
              void generate();
            },
          },
          {
            key: 'save',
            label: isSaving ? 'Saving…' : 'Save draft',
            icon: <SaveRegular />,
            disabled: loading || isSaving || !yaml.trim(),
            onClick: () => {
              void saveDraft();
            },
          },
          {
            key: 'back',
            label: 'Back to contracts',
            icon: <ArrowLeftRegular />,
            onClick: () => navigate('/contracts'),
          },
        ] satisfies RibbonAction[]
      }
    >
      <div className={styles.root}>
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
              <Input
                value={targetTablePath}
                onChange={(_, data) => setTargetTablePath(data.value)}
              />
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
            <Input
              type="email"
              value={ownerEmail}
              onChange={(_, data) => setOwnerEmail(data.value)}
            />
          </Field>
          <Field className={styles.fullWidth} label="Description">
            <div className={styles.chips}>
              {aiDescriptionTemplates.map((template) => (
                <Button
                  key={template.id}
                  appearance={selectedTemplateId === template.id ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    setDescription(template.prompt);
                  }}
                >
                  {template.label}
                </Button>
              ))}
              <Button
                appearance="subtle"
                size="small"
                onClick={() => {
                  setSelectedTemplateId(null);
                  setDescription('');
                }}
              >
                Clear
              </Button>
            </div>
            <Textarea
              value={description}
              onChange={(_, data) => {
                setDescription(data.value);
                setSelectedTemplateId(null);
              }}
            />
          </Field>
        </div>

        <div className={styles.examples}>
          <Caption1>Here's what a contract for this domain typically captures…</Caption1>
          <Accordion collapsible multiple>
            {aiDescriptionTemplates.slice(0, 3).map((template) => (
              <AccordionItem key={template.id} value={template.id}>
                <AccordionHeader>{template.label}</AccordionHeader>
                <AccordionPanel>{template.preview}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className={styles.actions}>{loading ? <Spinner size="tiny" /> : null}</div>

        {yaml ? (
          <>
            <div className={styles.resultHeader}>
              <Caption1>Draft ready for review</Caption1>
              {isHeuristicResult ? <Badge appearance="outline">Heuristic result</Badge> : null}
            </div>
            <div className={styles.editor}>
              <MonacoYamlEditor value={yaml} onChange={setYaml} themeMode={sdk.themeMode} />
            </div>
          </>
        ) : null}

        {!yaml && targetTablePath && !loading ? (
          <EmptyState
            description="Generate a draft, then edit the YAML before saving it as a contract."
            icon={<SparkleRegular />}
            title="No suggestion yet"
          />
        ) : null}

        {!targetTablePath ? (
          <EmptyState
            description="Choose a Fabric target and object to enable AI contract generation."
            icon={<SparkleRegular />}
            title="Select a target first"
          />
        ) : null}
      </div>
    </ItemEditor>
  );
}

function isFallbackModel(modelUsed: string | null | undefined) {
  const normalized = modelUsed?.toLowerCase() ?? '';
  return (
    normalized.includes('heuristic') ||
    normalized.includes('fallback') ||
    normalized.includes('template')
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

export default AISuggestPage;
