import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SparkleRegular } from '@fluentui/react-icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createDefaultContractYaml,
  createContractClient,
  synchronizeDraftYaml,
} from '@/api/contractClient';
import { MonacoYamlEditor } from '@/components/ContractEditor/MonacoYamlEditor';
import { ValidationPanel } from '@/components/ContractEditor/ValidationPanel';
import { ItemEditor, type RibbonToolbar } from '@/components/ItemEditor/ItemEditor';
import {
  ItemEditorDefaultView,
  useViewNavigation,
} from '@/components/ItemEditor/ItemEditorDefaultView';
import { createActivateAction } from '@/components/ItemEditor/actions/createActivateAction';
import { createRunNowAction } from '@/components/ItemEditor/actions/createRunNowAction';
import { createSaveAction } from '@/components/ItemEditor/actions/createSaveAction';
import { createVersionHistoryAction } from '@/components/ItemEditor/actions/createVersionHistoryAction';
import { LakehousePicker, TablePicker } from '@/components/FabricPickers';
import { StatusBadge } from '@/components/StatusBadge';
import { useContract, useContractActions } from '@/hooks/useContract';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { ContractDetail, ContractDraft, ContractValidationResult } from '@/models/Contract';

interface PersistedEditorState {
  contractId: string | null;
  draft: ContractDraft | null;
}

interface FabricItemMetadata {
  displayName: string;
  id: string;
  type: string;
  workspaceId: string;
}

const useStyles = makeStyles({
  layout: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    height: '100%',
  },
  metadataGrid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  },
  splitPane: {
    display: 'grid',
    gridTemplateColumns: '11fr 9fr',
    gap: tokens.spacingHorizontalL,
    flex: 1,
    minHeight: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: '100%',
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  editorPanel: {
    minHeight: 0,
    overflow: 'hidden',
  },
});

export function ContractEditorPage() {
  const styles = useStyles();
  const { id: routeId, itemObjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sdk = useFabricSdk();
  const [persistedEditorState, setPersistedEditorState] = useState<PersistedEditorState | null>(null);
  const [itemDefinitionLoaded, setItemDefinitionLoaded] = useState(false);
  const [itemMetadata, setItemMetadata] = useState<FabricItemMetadata | null>(null);
  const [itemContractLookupDone, setItemContractLookupDone] = useState(false);
  const [resolvedItemContractId, setResolvedItemContractId] = useState<string | null>(null);
  // contractId is the backend Orqentis UUID; itemObjectId is the Fabric item UUID
  const contractId = routeId ?? searchParams.get('id') ?? persistedEditorState?.contractId ?? resolvedItemContractId ?? null;

  const client = useMemo(
    () =>
      createContractClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  const { contract, error, loading } = useContract(client, contractId);
  const actions = useContractActions(client);
  const [draft, setDraft] = useState<ContractDraft | null>(null);
  const [validationResult, setValidationResult] = useState<ContractValidationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!itemObjectId) {
      setItemDefinitionLoaded(true);
      setItemMetadata(null);
      return;
    }

    setItemDefinitionLoaded(false);
    setItemContractLookupDone(false);
    void Promise.allSettled([
      sdk.loadItemDefinition(itemObjectId),
      sdk.loadItemMetadata(itemObjectId),
    ])
      .then(([definitionResult, metadataResult]) => {
        if (cancelled) {
          return;
        }

        const persisted = definitionResult.status === 'fulfilled' ? definitionResult.value : null;
        const metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : null;
        setPersistedEditorState(persisted ? parsePersistedEditorState(persisted) : null);
        setItemMetadata(metadata);
        setItemDefinitionLoaded(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setPersistedEditorState(null);
        setItemMetadata(null);
        setItemDefinitionLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, itemObjectId]);

  useEffect(() => {
    let cancelled = false;

    if (!itemObjectId || !itemDefinitionLoaded || contractId || itemContractLookupDone) {
      return;
    }

    setItemContractLookupDone(true);

    const createItemNamedDraft = () => {
      setDraft((currentDraft) =>
        currentDraft ?? createNewDraft({
          name: itemMetadata?.displayName,
          targetLakehouseId: searchParams.get('lakehouseId') ?? '',
          targetTablePath: searchParams.get('targetTablePath') ?? '',
        }),
      );
    };

    void client.listContracts()
      .then((contracts) => {
        if (cancelled) {
          return;
        }

        const matchedContract = findContractForFabricItem(itemMetadata?.displayName ?? '', contracts);
        if (matchedContract) {
          setResolvedItemContractId(matchedContract.id);
          return;
        }

        createItemNamedDraft();
      })
      .catch(() => {
        if (!cancelled) {
          createItemNamedDraft();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, contractId, itemContractLookupDone, itemDefinitionLoaded, itemMetadata, itemObjectId, searchParams]);

  useEffect(() => {
    if (!contract) {
      return;
    }

    setDraft(toDraft(contract));
  }, [contract]);

  useEffect(() => {
    if (contract || draft || !itemDefinitionLoaded || !persistedEditorState?.draft) {
      return;
    }

    setDraft(persistedEditorState.draft);
  }, [contract, draft, itemDefinitionLoaded, persistedEditorState]);

  return (
    <ItemEditorDefaultView initialView={getInitialView(contract)}>
      <EditorWorkspace
        actions={actions}
        client={client}
        contract={contract}
        contractId={contractId}
        draft={draft}
        error={error}
        fabricItemId={itemObjectId ?? null}
        loading={loading}
        navigateToContracts={() => navigate('/contracts')}
        navigateToDetail={(selectedContractId) => navigate(`/contracts/${selectedContractId}`)}
        navigateToRun={(selectedContractId, runId) =>
          navigate(`/contracts/${selectedContractId}/runs/${runId}`)
        }
        onChangeDraft={setDraft}
        onCreateDraft={() =>
          setDraft(
            createNewDraft({
              targetLakehouseId: searchParams.get('lakehouseId') ?? '',
              targetTablePath: searchParams.get('targetTablePath') ?? '',
            }),
          )
        }
        onValidationChange={setValidationResult}
        styles={styles}
        validationResult={validationResult}
      />
    </ItemEditorDefaultView>
  );
}

interface EditorWorkspaceProps {
  actions: ReturnType<typeof useContractActions>;
  client: ReturnType<typeof createContractClient>;
  contract: ContractDetail | null;
  contractId: string | null | undefined;
  draft: ContractDraft | null;
  error: string | null;
  fabricItemId: string | null;
  loading: boolean;
  navigateToContracts: () => void;
  navigateToDetail: (contractId: string) => void;
  navigateToRun: (contractId: string, runId: string) => void;
  onChangeDraft: (draft: ContractDraft | null) => void;
  onCreateDraft: () => void;
  onValidationChange: (result: ContractValidationResult) => void;
  styles: ReturnType<typeof useStyles>;
  validationResult: ContractValidationResult | null;
}

function EditorWorkspace({
  actions,
  client,
  contract,
  contractId,
  draft,
  error,
  fabricItemId,
  loading,
  navigateToContracts,
  navigateToDetail,
  navigateToRun,
  onChangeDraft,
  onCreateDraft,
  onValidationChange,
  styles,
  validationResult,
}: EditorWorkspaceProps) {
  const sdk = useFabricSdk();
  const { navigateTo, view } = useViewNavigation();

  useEffect(() => {
    if (draft) {
      navigateTo('editor');
    }
  }, [draft, navigateTo]);

  const saveDraft = useCallback(async (nextStatus?: string) => {
    if (!draft) {
      return;
    }

    const preparedDraft = prepareDraftForSave({
      ...draft,
      status: nextStatus ?? draft.status,
    });

    if (!isGuid(preparedDraft.targetLakehouseId)) {
      await sdk.notifyError('Invalid lakehouse ID', 'Enter a valid Fabric lakehouse GUID before saving.');
      return;
    }

    if (!preparedDraft.name.trim() || !preparedDraft.ownerEmail.trim() || !preparedDraft.targetTablePath.trim()) {
      await sdk.notifyError('Missing metadata', 'Name, owner email and target table path are required.');
      return;
    }

    const latestValidation = validationResult ?? (await client.validate(preparedDraft.odcsYaml));
    onValidationChange(latestValidation);

    if (!latestValidation.isValid) {
      await sdk.notifyError('Validation failed', 'Fix the YAML validation issues before saving.');
      return;
    }

    try {
      const savedContract =
        nextStatus === 'active'
          ? await actions.activate(preparedDraft)
          : await actions.save(preparedDraft);

      await sdk.notifySuccess(
        'Contract saved',
        nextStatus === 'active'
          ? 'The contract was saved and activated.'
          : 'The contract draft was saved successfully.',
      );

      const persistedState: PersistedEditorState = {
        contractId: savedContract.id,
        draft: {
          ...preparedDraft,
          id: savedContract.id,
        },
      };

      try {
        if (fabricItemId) {
          await sdk.saveItemDefinition(fabricItemId, JSON.stringify(persistedState));
        }
      } catch {
        await sdk.notifyInfo(
          'Item state not synced',
          'Contract data was saved, but Fabric item metadata could not be updated.',
        );
      }

      navigateToDetail(savedContract.id);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save the contract.';
      await sdk.notifyError('Save failed', message);
    }
  }, [actions, client, draft, fabricItemId, navigateToDetail, onValidationChange, sdk, validationResult]);

  const handleRunNow = useCallback(async () => {
    if (!draft?.id) {
      await sdk.notifyInfo('Save required', 'Save the contract before requesting a run.');
      return;
    }

    try {
      const run = await actions.runNow(draft.id);
      await sdk.notifySuccess('Run queued', 'The enforcement run request was submitted.');
      navigateToRun(draft.id, run.runId);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unable to queue the run.';
      await sdk.notifyError('Run failed', message);
    }
  }, [actions, draft?.id, navigateToRun, sdk]);

  const additionalToolbars = useMemo<RibbonToolbar[]>(
    () => [
      {
        actions: [
          {
            disabled: true,
            icon: <SparkleRegular />,
            key: 'ai-improve',
            label: 'AI Improve (Enterprise)',
            onClick: async () => {
              await sdk.notifyInfo(
                'Coming soon',
                'AI-assisted editing is planned for a later sprint.',
              );
            },
          },
        ],
        key: 'ai-improve',
        label: 'AI Improve',
      },
    ],
    [sdk],
  );

  const homeToolbarActions = useMemo(
    () => [
      createSaveAction({
        disabled: !draft,
        onClick: () => saveDraft('draft'),
      }),
      createActivateAction({
        disabled: !draft,
        onClick: () => saveDraft('active'),
      }),
      createRunNowAction({
        disabled: !draft?.id,
        onClick: handleRunNow,
      }),
      createVersionHistoryAction({
        disabled: !draft?.id,
        onClick: () => {
          if (draft?.id) {
            navigateToDetail(draft.id);
          }
        },
      }),
    ],
    [draft, handleRunNow, navigateToDetail, saveDraft],
  );

  return (
    <ItemEditor
      additionalToolbars={additionalToolbars}
      homeToolbarActions={homeToolbarActions}
      statusSlot={draft ? <StatusBadge status={draft.status} /> : null}
      subtitle={draft?.targetTablePath ?? contract?.targetTablePath ?? 'Create and validate an ODCS contract draft.'}
      title={draft?.name || contract?.name || 'New contract'}
    >
      {loading ? <Spinner label="Loading editor…" /> : null}
      {error ? <Body1>{error}</Body1> : null}

      {view === 'empty' || !draft ? (
        <div className={styles.emptyState}>
          <Caption1>Start from a valid ODCS template and refine the YAML in Monaco.</Caption1>
          <Body1>The editor opens with a local item-editor ribbon, live validation panel and Fabric-safe SDK wrapper.</Body1>
          <Button
            appearance="primary"
            onClick={() => {
              onCreateDraft();
              navigateTo('editor');
            }}
          >
            Start drafting
          </Button>
          {contractId ? (
            <Button appearance="secondary" onClick={navigateToContracts}>
              Back to contracts
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.metadataGrid}>
            <Field label="Contract name">
              <Input
                value={draft.name}
                onChange={(_, data) => onChangeDraft({ ...draft, name: data.value })}
              />
            </Field>
            <Field label="Owner email">
              <Input
                type="email"
                value={draft.ownerEmail}
                onChange={(_, data) => onChangeDraft({ ...draft, ownerEmail: data.value })}
              />
            </Field>
            <LakehousePicker
              apiBaseUrl={sdk.apiBaseUrl}
              getToken={sdk.getAccessToken}
              isReady={sdk.isReady}
              value={draft.targetLakehouseId}
              workspaceId={sdk.workspaceId}
              onChange={(id) => onChangeDraft({ ...draft, targetLakehouseId: id, targetTablePath: '' })}
            />
            <TablePicker
              apiBaseUrl={sdk.apiBaseUrl}
              getToken={sdk.getAccessToken}
              isReady={sdk.isReady}
              lakehouseId={draft.targetLakehouseId}
              value={draft.targetTablePath}
              workspaceId={sdk.workspaceId}
              onChange={(path) => onChangeDraft({ ...draft, targetTablePath: path })}
            />
            <Field label="Version">
              <Input
                value={draft.version}
                onChange={(_, data) => onChangeDraft({ ...draft, version: data.value })}
              />
            </Field>
            <Field label="Commit message">
              <Input
                value={draft.commitMessage}
                onChange={(_, data) => onChangeDraft({ ...draft, commitMessage: data.value })}
              />
            </Field>
            <Field label="Description" style={{ gridColumn: '1 / -1' }}>
              <Textarea
                resize="vertical"
                value={draft.description}
                onChange={(_, data) => onChangeDraft({ ...draft, description: data.value })}
              />
            </Field>
          </div>

          <div className={styles.splitPane}>
            <div className={styles.editorPanel}>
              <MonacoYamlEditor
                onChange={(nextValue) => onChangeDraft({ ...draft, odcsYaml: nextValue })}
                themeMode={sdk.themeMode}
                value={draft.odcsYaml}
              />
            </div>
            <ValidationPanel
              onPreviewAgainstLiveTable={() => {
                void sdk.notifyInfo(
                  'Preview unavailable',
                  'Live table preview is planned for a later sprint.',
                );
              }}
              onValidationChange={onValidationChange}
              validateYaml={client.validate}
              yaml={draft.odcsYaml}
            />
          </div>
        </div>
      )}
    </ItemEditor>
  );
}

function getInitialView(contract: ContractDetail | null) {
  return contract ? 'editor' : 'empty';
}

function createNewDraft(seed: {
  name?: string;
  targetLakehouseId: string;
  targetTablePath: string;
}): ContractDraft {
  const name = seed.name?.trim() || 'New Contract';
  const yaml = createDefaultContractYaml(name);

  return {
    commitMessage: '',
    description: '',
    name,
    odcsYaml: synchronizeDraftYaml(yaml, {
      name,
      status: 'draft',
      targetTablePath:
        seed.targetTablePath ||
        'abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/example_table',
      version: '1.0.0',
    }),
    ownerEmail: '',
    status: 'draft',
    targetLakehouseId: seed.targetLakehouseId,
    targetTablePath:
      seed.targetTablePath ||
      'abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/example_table',
    version: '1.0.0',
  };
}

function prepareDraftForSave(draft: ContractDraft): ContractDraft {
  return {
    ...draft,
    odcsYaml: synchronizeDraftYaml(draft.odcsYaml, {
      name: draft.name,
      status: draft.status,
      targetTablePath: draft.targetTablePath,
      version: draft.version,
    }),
  };
}

function toDraft(contract: ContractDetail): ContractDraft {
  return {
    commitMessage: '',
    description: contract.description ?? '',
    id: contract.id,
    name: contract.name,
    odcsYaml: contract.odcsYaml,
    ownerEmail: contract.ownerEmail,
    status: contract.status,
    targetLakehouseId: contract.targetLakehouseId ?? '',
    targetTablePath: contract.targetTablePath,
    version: contract.version,
  };
}

function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findContractForFabricItem(
  itemDisplayName: string,
  contracts: Array<{ id: string; name: string }>,
) {
  const itemName = normalizeName(itemDisplayName);
  if (!itemName) {
    return contracts.length === 1 ? contracts[0] : null;
  }

  const exactMatch = contracts.find((candidate) => normalizeName(candidate.name) === itemName);
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = contracts.find((candidate) => {
    const candidateName = normalizeName(candidate.name);
    return candidateName.includes(itemName) || itemName.includes(candidateName);
  });
  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  return contracts.length === 1 ? contracts[0] : null;
}

function parsePersistedEditorState(raw: string): PersistedEditorState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEditorState>;
    const contractId = typeof parsed.contractId === 'string' ? parsed.contractId : null;
    const draft = isPersistedDraft(parsed.draft) ? parsed.draft : null;

    if (!contractId && !draft) {
      return null;
    }

    return {
      contractId,
      draft,
    };
  } catch {
    return null;
  }
}

function isPersistedDraft(value: unknown): value is ContractDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<ContractDraft>;
  return typeof draft.name === 'string'
    && typeof draft.description === 'string'
    && typeof draft.status === 'string'
    && typeof draft.version === 'string'
    && typeof draft.odcsYaml === 'string'
    && typeof draft.ownerEmail === 'string'
    && typeof draft.targetTablePath === 'string'
    && typeof draft.targetLakehouseId === 'string'
    && typeof draft.commitMessage === 'string';
}

// ─── Lakehouse Picker ──────────────────────────────────────────────────────────

// Pickers are shared components defined in @/components/FabricPickers
