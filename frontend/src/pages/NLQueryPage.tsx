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
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Link, useNavigate } from 'react-router-dom';
import { SearchRegular, SparkleRegular } from '@fluentui/react-icons';
import { createAiClient } from '@/api/aiClient';
import { EmptyState } from '@/components/EmptyState';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { NaturalLanguageQueryResponse } from '@/models/Ai';

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
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  searchRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
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

  const runQuery = async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await aiClient.queryContracts({ query });
      setResult(response);
      setLiveMessage(`Found ${response.matches.length} matches.`);
      console.debug('Natural language query complete', { modelUsed: response.modelUsed });
      await sdk.notifySuccess('Query complete', 'Review the matching contracts below.');
    } catch (error) {
      setResult(null);
      const message = error instanceof Error ? error.message : 'Failed to run contract query.';
      await sdk.notifyError('AI query failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.root}>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => navigate('/contracts')}>Library</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>AI query</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className={styles.header}>
        <Title2>AI Contract Query</Title2>
        <Caption1 className={styles.subtitle}>Ask in plain English and jump to the contracts that answer it.</Caption1>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        role="status"
        style={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}
      >
        {liveMessage}
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
                  <Link to={`/contracts/${match.contractId}`}>
                    <strong>{match.name ?? match.contractId}</strong>
                  </Link>
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
    </section>
  );
}

export default NLQueryPage;
