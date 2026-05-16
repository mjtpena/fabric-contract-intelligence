import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Body1,
  Caption1,
  Button,
  Checkbox,
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
  extractServerWorkspaceId,
  synchronizeDraftYaml,
} from '@/api/contractClient';
import { createAiClient } from '@/api/aiClient';
import { createOpsClient } from '@/api/opsClient';
import { MonacoYamlEditor, type MonacoYamlEditorInstance } from '@/components/ContractEditor/MonacoYamlEditor';
import { NewContractTypeSelector } from '@/components/ContractEditor/NewContractTypeSelector';
import { ValidationPanel } from '@/components/ContractEditor/ValidationPanel';
import { ItemEditor, type RibbonToolbar } from '@/components/ItemEditor/ItemEditor';
import {
  ItemEditorDefaultView,
  useViewNavigation,
} from '@/components/ItemEditor/ItemEditorDefaultView';
import { createActivateAction } from '@/components/ItemEditor/actions/createActivateAction';
import { createRunNowAction } from '@/components/ItemEditor/actions/createRunNowAction';
import { createSaveAction } from '@/components/ItemEditor/actions/createSaveAction';
import { createSettingsAction } from '@/components/ItemEditor/actions/createSettingsAction';
import { createVersionHistoryAction } from '@/components/ItemEditor/actions/createVersionHistoryAction';
import { WorkspacePicker } from '@/components/Fabric/WorkspacePicker';
import {
  FabricTargetItemPicker,
  TablePicker,
  TargetTypePicker,
} from '@/components/FabricPickers';
import { StatusBadge } from '@/components/StatusBadge';
import { useContract, useContractActions } from '@/hooks/useContract';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import { decodeUserFromToken } from '@/lib/identity';
import type { ContractDetail, ContractDraft, ContractTargetType, ContractValidationResult } from '@/models/Contract';
import { getContractTargetTypeLabel } from '@/models/ContractTarget';

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
  ownerChip: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '32px',
  },
  quickRules: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalS,
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

  const openWorkloadRoute = useCallback(async (path: string, mode: 'append' | 'replaceAll' = 'replaceAll') => {
    if (!(await sdk.openWorkloadRoute(path, mode))) {
      navigate(path);
    }
  }, [navigate, sdk]);

  useEffect(() => {
    let cancelled = false;

    if (!itemObjectId) {
      setItemDefinitionLoaded(true);
      setItemMetadata(null);
      return;
    }

    if (!sdk.isReady) {
      return;
    }

    setItemDefinitionLoaded(false);
    setItemContractLookupDone(false);
    setResolvedItemContractId(null);
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

    if (!itemObjectId || !sdk.isReady || !itemDefinitionLoaded || contractId || itemContractLookupDone) {
      return;
    }

    const createItemNamedDraft = () => {
      setDraft((currentDraft) =>
        currentDraft ?? createNewDraft({
          name: itemMetadata?.displayName,
          targetItemId: searchParams.get('targetItemId') ?? searchParams.get('lakehouseId') ?? '',
          targetTablePath: searchParams.get('targetTablePath') ?? '',
          targetType: parseTargetType(searchParams.get('targetType')),
        }),
      );
      setItemContractLookupDone(true);
    };

    void client.listContracts()
      .then((contracts) => {
        if (cancelled) {
          return;
        }

        const matchedContract = findContractForFabricItem(itemMetadata?.displayName ?? '', contracts);
        if (matchedContract) {
          setResolvedItemContractId(matchedContract.id);
          setItemContractLookupDone(true);
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
  }, [client, contractId, itemContractLookupDone, itemDefinitionLoaded, itemMetadata, itemObjectId, sdk.isReady, searchParams]);

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
        navigateToContracts={() => {
          void openWorkloadRoute('/contracts');
        }}
        navigateToDetail={(selectedContractId) => {
          void openWorkloadRoute(`/contracts/${selectedContractId}/edit`);
        }}
        navigateToPolicy={(selectedContractId) => {
          void openWorkloadRoute(`/contracts/policies?contractId=${encodeURIComponent(selectedContractId)}`, 'append');
        }}
        navigateToRun={(selectedContractId, runId) =>
          void openWorkloadRoute(`/contracts/runs?contractId=${encodeURIComponent(selectedContractId)}&runId=${encodeURIComponent(runId)}`, 'append')
        }
        onChangeDraft={setDraft}
        onCreateDraft={(selectedTargetType) =>
          setDraft(
            createNewDraft({
              targetItemId: searchParams.get('targetItemId') ?? searchParams.get('lakehouseId') ?? '',
              targetTablePath: searchParams.get('targetTablePath') ?? '',
              targetType: selectedTargetType ?? parseTargetType(searchParams.get('targetType')),
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
  navigateToPolicy: (contractId: string) => void;
  navigateToRun: (contractId: string, runId: string) => void;
  onChangeDraft: (draft: ContractDraft | null) => void;
  onCreateDraft: (targetType: ContractTargetType) => void;
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
  navigateToPolicy,
  navigateToRun,
  onChangeDraft,
  onCreateDraft,
  onValidationChange,
  styles,
  validationResult,
}: EditorWorkspaceProps) {
  const sdk = useFabricSdk();
  const { navigateTo, view } = useViewNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [tier, setTier] = useState<string>('community');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isOwnerOverrideVisible, setIsOwnerOverrideVisible] = useState(false);
  const editorRef = useRef<MonacoYamlEditorInstance | null>(null);
  const [useCrossWorkspaceTarget, setUseCrossWorkspaceTarget] = useState(() =>
    Boolean(draft?.targetWorkspaceId && draft.targetWorkspaceId.trim().length > 0),
  );

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
  const opsClient = useMemo(
    () =>
      createOpsClient({
        baseUrl: sdk.apiBaseUrl,
        correlationId: sdk.correlationId,
        getAccessToken: sdk.getAccessToken,
        workspaceId: sdk.workspaceId,
      }),
    [sdk.apiBaseUrl, sdk.correlationId, sdk.getAccessToken, sdk.workspaceId],
  );

  useEffect(() => {
    void opsClient.listWorkspaces()
      .then((workspaces) => setTier(workspaces[0]?.tier ?? 'community'))
      .catch(() => setTier('community'));
  }, [opsClient]);

  useEffect(() => {
    let cancelled = false;
    void sdk.getAccessToken().then((token) => {
      if (cancelled || !token) return;
      const email = decodeUserFromToken(token);
      if (email) setCurrentUserEmail(email);
    });
    return () => { cancelled = true; };
  }, [sdk]);

  useEffect(() => {
    if (draft && !draft.ownerEmail && currentUserEmail) {
      onChangeDraft({ ...draft, ownerEmail: currentUserEmail });
    }
  }, [currentUserEmail, draft, onChangeDraft]);

  useEffect(() => {
    if (draft) {
      navigateTo('editor');
    }
  }, [draft, navigateTo]);

  useEffect(() => {
    setUseCrossWorkspaceTarget(Boolean(draft?.targetWorkspaceId && draft.targetWorkspaceId.trim().length > 0));
  }, [contractId, draft?.id]);

  const isCrossWorkspaceTargetInvalid = useCrossWorkspaceTarget
    && (!draft?.targetWorkspaceId?.trim() || !isGuid(draft.targetWorkspaceId.trim()));

  const saveDraft = useCallback(async (nextStatus?: string) => {
    if (!draft || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const preparedDraft = prepareDraftForSave({
        ...draft,
        status: nextStatus ?? draft.status,
        targetWorkspaceId: useCrossWorkspaceTarget ? draft.targetWorkspaceId : undefined,
      });

      if (useCrossWorkspaceTarget && !preparedDraft.targetWorkspaceId?.trim()) {
        await sdk.notifyError('Missing target workspace', 'Choose the workspace that contains the data store before saving.');
        return;
      }

      if (preparedDraft.targetWorkspaceId?.trim() && !isGuid(preparedDraft.targetWorkspaceId.trim())) {
        await sdk.notifyError('Invalid target workspace', 'Choose a valid Fabric workspace before saving.');
        return;
      }

      if (!isGuid(preparedDraft.targetItemId)) {
        await sdk.notifyError('Invalid target item', 'Select a valid Fabric item before saving.');
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

      if (!fabricItemId) {
        navigateToDetail(savedContract.id);
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save the contract.';
      await sdk.notifyError('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }, [actions, client, draft, fabricItemId, isSaving, navigateToDetail, onValidationChange, sdk, useCrossWorkspaceTarget, validationResult]);

  const handleRunNow = useCallback(async () => {
    if (!draft?.id || isRunning) {
      if (!draft?.id) {
        await sdk.notifyInfo('Save required', 'Save the contract before requesting a run.');
      }
      return;
    }

    setIsRunning(true);
    try {
      const run = await actions.runNow(draft.id);
      await sdk.notifySuccess('Run queued', 'The enforcement run request was submitted.');
      navigateToRun(draft.id, run.runId);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unable to queue the run.';
      await sdk.notifyError('Run failed', message);
    } finally {
      setIsRunning(false);
    }
  }, [actions, draft?.id, isRunning, navigateToRun, sdk]);

  const isAiImproveAvailable = tier.toLowerCase() === 'enterprise';

  const handleAiImprove = useCallback(async () => {
    if (!draft || isImproving || !isAiImproveAvailable) {
      return;
    }

    setIsImproving(true);
    try {
      const result = await aiClient.improveContract({ odcsYaml: draft.odcsYaml });
      onChangeDraft({ ...draft, odcsYaml: result.odcsYaml });
      await sdk.notifySuccess('Improvement applied', 'Review the updated contract before saving.');
    } catch (improveError) {
      const message = improveError instanceof Error ? improveError.message : 'AI improvement failed.';
      await sdk.notifyError('AI Improve failed', message);
    } finally {
      setIsImproving(false);
    }
  }, [aiClient, draft, isAiImproveAvailable, isImproving, onChangeDraft, sdk]);

  const additionalToolbars = useMemo<RibbonToolbar[]>(
    () => [
      {
        actions: [
          {
            disabled: !draft || isImproving || !isAiImproveAvailable,
            icon: isImproving ? <Spinner size="tiny" /> : <SparkleRegular />,
            key: 'ai-improve',
            label: isImproving ? 'Improving…' : 'AI Improve',
            onClick: handleAiImprove,
            tooltip: isAiImproveAvailable ? 'AI Improve' : 'Available on Enterprise',
          },
        ],
        key: 'ai-improve',
        label: 'AI Improve',
      },
    ],
    [draft, handleAiImprove, isAiImproveAvailable, isImproving],
  );

  const homeToolbarActions = useMemo(
    () => [
      createSaveAction({
        disabled: !draft || isSaving || isCrossWorkspaceTargetInvalid,
        onClick: () => saveDraft('draft'),
      }),
      createActivateAction({
        disabled: !draft || isSaving || isCrossWorkspaceTargetInvalid,
        onClick: () => saveDraft('active'),
      }),
      createRunNowAction({
        disabled: !draft?.id || isRunning,
        onClick: handleRunNow,
      }),
      createSettingsAction({
        disabled: !draft?.id,
        onClick: () => {
          if (draft?.id) {
            navigateToPolicy(draft.id);
          }
        },
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
    [draft, handleRunNow, isCrossWorkspaceTargetInvalid, isRunning, isSaving, navigateToDetail, navigateToPolicy, saveDraft],
  );

  return (
    <ItemEditor
      additionalToolbars={additionalToolbars}
      homeToolbarActions={homeToolbarActions}
      statusSlot={draft ? <StatusBadge status={draft.status} /> : null}
      subtitle={draft?.targetTablePath ?? contract?.targetTablePath ?? 'Edit YAML directly and validate as you type.'}
      title={draft?.name || contract?.name || 'New contract'}
    >
      {loading ? <Spinner label="Loading editor…" /> : null}
      {error ? <Body1>{error}</Body1> : null}

      {view === 'empty' || !draft ? (
        <div className={styles.emptyState}>
          <NewContractTypeSelector
            onConfirm={(selectedTargetType) => {
              onCreateDraft(selectedTargetType);
              navigateTo('editor');
            }}
            onCancel={contractId ? navigateToContracts : undefined}
          />
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
            <Field label="Owner">
              {isOwnerOverrideVisible ? (
                <div className={styles.ownerChip}>
                  <Input
                    type="email"
                    value={draft.ownerEmail}
                    onChange={(_, data) => onChangeDraft({ ...draft, ownerEmail: data.value })}
                  />
                  <Button
                    appearance="subtle"
                    onClick={() => {
                      if (currentUserEmail) {
                        onChangeDraft({ ...draft, ownerEmail: currentUserEmail });
                      }
                      setIsOwnerOverrideVisible(false);
                    }}
                  >
                    Use my email
                  </Button>
                </div>
              ) : (
                <div className={styles.ownerChip}>
                  <Badge appearance="tint">{draft.ownerEmail || currentUserEmail || 'Current user'}</Badge>
                  <Button appearance="subtle" size="small" onClick={() => setIsOwnerOverrideVisible(true)}>
                    Change
                  </Button>
                </div>
              )}
            </Field>
            <TargetTypePicker
              value={draft.targetType}
              onChange={(targetType) =>
                onChangeDraft({
                  ...draft,
                  targetType,
                  targetItemId: '',
                  targetLakehouseId: '',
                  targetTablePath: getDefaultTargetPath(targetType),
                })
              }
            />
            <Field label="Cross-workspace data store" style={{ alignSelf: 'center' }}>
              <Checkbox
                checked={useCrossWorkspaceTarget}
                label="Data store is in another workspace"
                onChange={(_, data) => {
                  if (data.checked) {
                    setUseCrossWorkspaceTarget(true);
                    onChangeDraft({ ...draft, targetWorkspaceId: '' });
                  } else {
                    setUseCrossWorkspaceTarget(false);
                    onChangeDraft({ ...draft, targetWorkspaceId: undefined });
                  }
                }}
              />
            </Field>
            {useCrossWorkspaceTarget && (
              <WorkspacePicker
                client={opsClient}
                currentWorkspaceId={sdk.workspaceId}
                isReady={sdk.isReady}
                value={draft.targetWorkspaceId ?? ''}
                onChange={(workspaceId) => onChangeDraft({ ...draft, targetWorkspaceId: workspaceId })}
              />
            )}
            <FabricTargetItemPicker
              apiBaseUrl={sdk.apiBaseUrl}
              getToken={sdk.getAccessToken}
              isReady={sdk.isReady}
              targetType={draft.targetType}
              value={draft.targetItemId}
              workspaceId={
                draft.targetWorkspaceId && isGuid(draft.targetWorkspaceId.trim())
                  ? draft.targetWorkspaceId.trim()
                  : sdk.workspaceId
              }
              onChange={(id) => onChangeDraft({
                ...draft,
                targetItemId: id,
                targetLakehouseId: draft.targetType === 'lakehouse' ? id : '',
                targetTablePath: draft.targetType === 'lakehouse' ? '' : draft.targetTablePath,
              })}
            />
            {draft.targetType === 'lakehouse' ? (
              <TablePicker
                apiBaseUrl={sdk.apiBaseUrl}
                getToken={sdk.getAccessToken}
                isReady={sdk.isReady}
                lakehouseId={draft.targetItemId}
                value={draft.targetTablePath}
                workspaceId={
                  draft.targetWorkspaceId && isGuid(draft.targetWorkspaceId.trim())
                    ? draft.targetWorkspaceId.trim()
                    : sdk.workspaceId
                }
                onChange={(path) => onChangeDraft({ ...draft, targetTablePath: path })}
              />
            ) : (
              <Field
                hint={getTargetPathHint(draft.targetType)}
                label={`${getContractTargetTypeLabel(draft.targetType)} object`}
              >
                <Input
                  value={draft.targetTablePath}
                  onChange={(_, data) => onChangeDraft({ ...draft, targetTablePath: data.value })}
                />
              </Field>
            )}
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
              <div className={styles.quickRules} aria-label="Quick add rule">
                <Caption1>Quick add rule</Caption1>
                {quickRuleSnippets.map((rule) => (
                  <Button key={rule.label} appearance="subtle" size="small" onClick={() => insertRuleSnippet(editorRef.current, rule.snippet)}>
                    {rule.label}
                  </Button>
                ))}
              </div>
              <MonacoYamlEditor
                onChange={(nextValue) => onChangeDraft({ ...draft, odcsYaml: nextValue })}
                onEditorMount={(editor) => { editorRef.current = editor; }}
                themeMode={sdk.themeMode}
                value={draft.odcsYaml}
              />
            </div>
            <ValidationPanel
              getLivePreview={
                draft
                  ? () =>
                      client.getLiveSchemaPreview({
                        odcsYaml: draft.odcsYaml,
                        targetItemId: draft.targetItemId || undefined,
                        targetWorkspaceId:
                          draft.targetWorkspaceId && isGuid(draft.targetWorkspaceId.trim())
                            ? draft.targetWorkspaceId.trim()
                            : undefined,
                        targetType: draft.targetType,
                      })
                  : undefined
              }
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

const quickRuleSnippets = [
  { label: 'Not null', snippet: '\n        required: true\n' },
  { label: 'Unique', snippet: '\n        unique: true\n' },
  { label: 'Range', snippet: '\n        quality:\n          - type: range\n            min: 0\n            max: 100\n' },
  { label: 'Regex', snippet: '\n        quality:\n          - type: regex\n            pattern: "^[A-Z0-9_-]+$"\n' },
  { label: 'Enum', snippet: '\n        quality:\n          - type: enum\n            values: [active, inactive]\n' },
  { label: 'Foreign key', snippet: '\n        references:\n          table: dim_table\n          column: id\n' },
  { label: 'Freshness SLA', snippet: '\nquality:\n  - type: freshness\n    maximumLag: PT6H\n' },
];

function insertRuleSnippet(editor: MonacoYamlEditorInstance | null, snippet: string) {
  if (!editor) return;
  const selection = editor.getSelection();
  const range = selection ?? editor.getModel()?.getFullModelRange();
  if (!range) return;
  editor.executeEdits('quick-add-rule', [{ range, text: snippet, forceMoveMarkers: true }]);
  editor.focus();
}

function getInitialView(contract: ContractDetail | null) {
  return contract ? 'editor' : 'empty';
}

function createNewDraft(seed: {
  name?: string;
  targetItemId: string;
  targetTablePath: string;
  targetType: ContractTargetType;
}): ContractDraft {
  const name = seed.name?.trim() || 'New Contract';
  const templateYaml = readTemplateYaml();
  const yaml = templateYaml ?? createDefaultContractYaml(name);
  const targetPath = seed.targetTablePath || getDefaultTargetPath(seed.targetType);

  return {
    commitMessage: '',
    description: '',
    name,
    odcsYaml: synchronizeDraftYaml(yaml, {
      name,
      status: 'draft',
      targetTablePath: targetPath,
      targetType: seed.targetType,
      targetWorkspaceId: '',
      version: '1.0.0',
    }),
    ownerEmail: '',
    status: 'draft',
    targetItemId: seed.targetItemId,
    targetLakehouseId: seed.targetType === 'lakehouse' ? seed.targetItemId : '',
    targetTablePath: targetPath,
    targetType: seed.targetType,
    targetWorkspaceId: '',
    version: '1.0.0',
  };
}

function readTemplateYaml() {
  if (typeof sessionStorage === 'undefined') return null;
  const yaml = sessionStorage.getItem('orqentis.contract.templateYaml');
  if (yaml) {
    sessionStorage.removeItem('orqentis.contract.templateYaml');
  }
  return yaml;
}

function prepareDraftForSave(draft: ContractDraft): ContractDraft {
  return {
    ...draft,
    odcsYaml: synchronizeDraftYaml(draft.odcsYaml, {
      name: draft.name,
      status: draft.status,
      targetTablePath: draft.targetTablePath,
      targetType: draft.targetType,
      targetWorkspaceId: draft.targetWorkspaceId?.trim() || undefined,
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
    targetItemId: contract.targetItemId ?? contract.targetLakehouseId ?? '',
    targetLakehouseId: contract.targetLakehouseId ?? '',
    targetTablePath: contract.targetTablePath,
    targetType: contract.targetType ?? 'lakehouse',
    targetWorkspaceId: extractServerWorkspaceId(contract.odcsYaml) ?? '',
    version: contract.version,
  };
}

function parseTargetType(value: string | null | undefined): ContractTargetType {
  switch ((value ?? '').trim().replace('-', '_').toLowerCase()) {
    case 'warehouse':
      return 'warehouse';
    case 'eventhouse':
    case 'kql_database':
      return 'eventhouse';
    case 'semantic_model':
    case 'semanticmodel':
      return 'semantic_model';
    case 'fabric_sql':
    case 'sql_database':
      return 'fabric_sql';
    case 'lakehouse':
    default:
      return 'lakehouse';
  }
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
      return 'abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/example_table';
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
    const draft = normalizePersistedDraft(parsed.draft);

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

function normalizePersistedDraft(value: unknown): ContractDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const draft = value as Partial<ContractDraft>;
  const isValid = typeof draft.name === 'string'
    && typeof draft.description === 'string'
    && typeof draft.status === 'string'
    && typeof draft.version === 'string'
    && typeof draft.odcsYaml === 'string'
    && typeof draft.ownerEmail === 'string'
    && typeof draft.targetTablePath === 'string'
    && typeof draft.targetLakehouseId === 'string'
    && typeof draft.commitMessage === 'string';

  if (!isValid) {
    return null;
  }

  const targetType = parseTargetType(draft.targetType);
  const targetItemId = typeof draft.targetItemId === 'string'
    ? draft.targetItemId
    : draft.targetLakehouseId;
  const commitMessage = typeof draft.commitMessage === 'string' ? draft.commitMessage : '';
  const description = typeof draft.description === 'string' ? draft.description : '';
  const name = typeof draft.name === 'string' ? draft.name : 'New Contract';
  const odcsYaml = typeof draft.odcsYaml === 'string' ? draft.odcsYaml : createDefaultContractYaml(name);
  const ownerEmail = typeof draft.ownerEmail === 'string' ? draft.ownerEmail : '';
  const status = typeof draft.status === 'string' ? draft.status : 'draft';
  const targetTablePath = typeof draft.targetTablePath === 'string'
    ? draft.targetTablePath
    : getDefaultTargetPath(targetType);
  const version = typeof draft.version === 'string' ? draft.version : '1.0.0';

  return {
    commitMessage,
    description,
    id: draft.id,
    name,
    odcsYaml,
    ownerEmail,
    status,
    targetItemId: targetItemId ?? '',
    targetLakehouseId: targetType === 'lakehouse' ? targetItemId ?? '' : '',
    targetTablePath,
    targetType,
    targetWorkspaceId: typeof draft.targetWorkspaceId === 'string' ? draft.targetWorkspaceId : (extractServerWorkspaceId(odcsYaml) ?? ''),
    version,
  };
}

// ─── Lakehouse Picker ──────────────────────────────────────────────────────────

// Pickers are shared components defined in @/components/FabricPickers

export default ContractEditorPage;
