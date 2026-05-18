import { useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import { SearchRegular, SparkleRegular, DeleteRegular } from '@fluentui/react-icons';
import { createAiClient } from '@/api/aiClient';
import { EmptyState } from '@/components/EmptyState';
import { FabricLink } from '@/components/FabricLink';
import { ItemEditor, type RibbonAction } from '@/components/ItemEditor/ItemEditor';
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { NaturalLanguageQueryResponse } from '@/models/Ai';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  searchRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
  },
  chips: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  recent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  inputWrapper: {
    flex: 1,
  },
  resultCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  matchCard: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  matchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

const recentStorageKey = 'orqentis.nlquery.recent';
const suggestedQueries = [
  'contracts owned by finance',
  'failed runs this week',
  'deprecated contracts with active policies',
  'contracts touching PII',
  'tables without contracts',
  'contracts breaching SLA',
];

function isFallbackModel(modelUsed: string | null | undefined) {
  const normalized = modelUsed?.toLowerCase() ?? '';
  return normalized.includes('heuristic') || normalized.includes('fallback') || normalized.includes('template');
}

export function NLQueryPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const sdk = useFabricSdk();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NaturalLanguageQueryResponse | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [recentQueries, setRecentQueries] = useState<string[]>(() => readRecentQueries());

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

  const runQuery = async (nextQuery = query) => {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setQuery(trimmedQuery);
    setLoading(true);
    try {
      const response = await aiClient.queryContracts({ query: trimmedQuery });
      setResult(response);
      setRecentQueries(writeRecentQuery(trimmedQuery));
      setLiveMessage(`Found ${response.matches.length} matches.`);
      await sdk.notifySuccess('Query complete', 'Review the matching contracts below.');
    } catch (error) {
      setResult(null);
      const message = error instanceof Error ? error.message : 'Failed to run contract query.';
      await sdk.notifyError('AI query failed', message);
    } finally {
      setLoading(false);
    }
  };

  const homeToolbarActions: RibbonAction[] = useMemo(() => {
    const actions: RibbonAction[] = [
      {
        key: 'search',
        label: loading ? 'Searching…' : 'Search',
        appearance: 'primary',
        icon: loading ? <Spinner size="tiny" /> : <SearchRegular />,
        disabled: loading || !query.trim(),
        onClick: () => { void runQuery(); },
      },
    ];
    if (recentQueries.length > 0) {
      actions.push({
        key: 'clear-recent',
        label: 'Clear recent',
        icon: <DeleteRegular />,
        onClick: () => {
          sessionStorage.removeItem(recentStorageKey);
          setRecentQueries([]);
        },
      });
    }
    return actions;
  }, [loading, query, recentQueries.length]);

  return (
    <ItemEditor
      title="AI Contract Query"
      subtitle="Ask in plain English and jump to the contracts that answer it."
      homeToolbarActions={homeToolbarActions}
    >
      <div className={styles.root}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => navigate('/contracts')}>Library</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>AI query</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <VisuallyHidden liveRegion>{liveMessage}</VisuallyHidden>

      <div className={styles.chips}>
        {suggestedQueries.map((suggestion) => (
          <Button key={suggestion} appearance={result ? 'subtle' : 'secondary'} size="small" onClick={() => { void runQuery(suggestion); }}>
            {suggestion}
          </Button>
        ))}
      </div>

      <div className={styles.searchRow}>
        <Field className={styles.inputWrapper} label="Natural-language query">
          <Input
            placeholder="e.g. Find contracts for CO2 emissions by country"
            value={query}
            onChange={(_, data) => setQuery(data.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                void runQuery();
              }
            }}
          />
        </Field>
        <Button
          appearance="primary"
          disabled={loading || !query.trim()}
          icon={loading ? <Spinner size="tiny" /> : <SearchRegular />}
          onClick={() => { void runQuery(); }}
        >
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {!result && recentQueries.length > 0 ? (
        <div className={styles.recent}>
          <Caption1>Recent queries</Caption1>
          <div className={styles.chips}>
            {recentQueries.map((recent) => (
              <Button key={recent} appearance="subtle" size="small" onClick={() => { void runQuery(recent); }}>
                {recent}
              </Button>
            ))}
            <Button appearance="transparent" size="small" onClick={() => { sessionStorage.removeItem(recentStorageKey); setRecentQueries([]); }}>
              Clear recent
            </Button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className={styles.resultCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <SparkleRegular />
            <Subtitle2>{result.explanation ?? 'No explanation returned.'}</Subtitle2>
            {isFallbackModel(result.modelUsed) ? <Badge appearance="outline">Heuristic result</Badge> : null}
          </div>

          {(result.matches ?? []).length === 0 ? (
            <EmptyState
              description="Try a broader question or create contracts with richer names and descriptions."
              icon={<SearchRegular />}
              title="No results found"
            />
          ) : (
            (result.matches ?? []).map((match) => (
              <div key={match.contractId} className={styles.matchCard}>
                <div className={styles.matchHeader}>
                  <FabricLink to={`/contracts/${match.contractId}`}>
                    <strong>{match.name ?? match.contractId}</strong>
                  </FabricLink>
                  <Badge appearance="outline" size="small">
                    v{match.version ?? '—'}
                  </Badge>
                  <Caption1 style={{ marginLeft: 'auto', opacity: 0.7 }}>
                    relevance {(((match.relevanceScore ?? 0) as number) * 100).toFixed(0)}%
                  </Caption1>
                </div>
                <Body1>{match.explanation ?? ''}</Body1>
              </div>
            ))
          )}
        </div>
      ) : null}
      </div>
    </ItemEditor>
  );
}

function readRecentQueries() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(recentStorageKey) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

function writeRecentQuery(query: string) {
  const next = [query, ...readRecentQueries().filter((item) => item !== query)].slice(0, 5);
  sessionStorage.setItem(recentStorageKey, JSON.stringify(next));
  return next;
}

export default NLQueryPage;
