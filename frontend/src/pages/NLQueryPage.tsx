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
  Card,
  Field,
  Input,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import { SearchRegular, SparkleRegular, DeleteRegular, PeopleRegular, ClockRegular, WarningRegular, ShieldRegular, DatabaseRegular, TopSpeedRegular } from '@fluentui/react-icons';
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
  searchHero: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    backgroundImage: `radial-gradient(circle at 0% 0%, ${tokens.colorBrandBackground2} 0%, transparent 55%)`,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  heroTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  heroHeadline: {
    margin: 0,
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: 1.15,
  },
  heroBlurb: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '60ch',
  },
  heroInput: {
    fontSize: tokens.fontSizeBase400,
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
  suggestGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  suggestCard: {
    display: 'grid',
    gridTemplateColumns: '2.5rem 1fr',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transitionDuration: tokens.durationFast,
    transitionProperty: 'border-color, box-shadow, transform',
    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: tokens.shadow4,
      transform: 'translateY(-1px)',
    },
  },
  suggestIcon: {
    width: '2.5rem',
    height: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    fontSize: '1.1rem',
  },
  suggestLabel: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  suggestHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  recent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  inputWrapper: {
    flex: 1,
  },
  resultCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  matchCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  matchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  relevance: {
    marginLeft: 'auto',
    color: tokens.colorNeutralForeground3,
  },
});

const recentStorageKey = 'orqentis.nlquery.recent';

interface SuggestedQuery {
  query: string;
  label: string;
  hint: string;
  fg: string;
  bg: string;
  icon: 'people' | 'clock' | 'warning' | 'shield' | 'database' | 'speed';
}

const suggestedCards: SuggestedQuery[] = [
  {
    query: 'contracts owned by finance',
    label: 'Find by owner',
    hint: 'e.g. contracts owned by finance',
    fg: tokens.colorBrandForeground1,
    bg: tokens.colorBrandBackground2,
    icon: 'people',
  },
  {
    query: 'failed runs this week',
    label: 'Recent failures',
    hint: 'e.g. failed runs this week',
    fg: tokens.colorPaletteRedForeground1,
    bg: tokens.colorPaletteRedBackground2,
    icon: 'warning',
  },
  {
    query: 'contracts touching PII',
    label: 'PII & sensitive data',
    hint: 'e.g. contracts touching PII',
    fg: tokens.colorPaletteGrapeForeground2,
    bg: tokens.colorPaletteGrapeBackground2,
    icon: 'shield',
  },
  {
    query: 'tables without contracts',
    label: 'Coverage gaps',
    hint: 'e.g. tables without contracts',
    fg: tokens.colorPalettePeachForeground2,
    bg: tokens.colorPalettePeachBackground2,
    icon: 'database',
  },
  {
    query: 'contracts breaching SLA',
    label: 'SLA breaches',
    hint: 'e.g. contracts breaching SLA',
    fg: tokens.colorPaletteCornflowerForeground2,
    bg: tokens.colorPaletteCornflowerBackground2,
    icon: 'speed',
  },
  {
    query: 'deprecated contracts with active policies',
    label: 'Stale rules',
    hint: 'e.g. deprecated contracts with active policies',
    fg: tokens.colorPaletteTealForeground2,
    bg: tokens.colorPaletteTealBackground2,
    icon: 'clock',
  },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {!result ? (
        <section className={styles.searchHero} aria-label="Ask in plain English">
          <span className={styles.heroTitle}>
            <SparkleRegular />
            Ask in plain English
          </span>
          <h2 className={styles.heroHeadline}>
            What do you want to know about your contracts?
          </h2>
          <Body1 className={styles.heroBlurb}>
            Orqentis indexes every contract, policy, run and breach. Type a question — owners,
            failures, sensitive data, SLAs — and we&apos;ll surface the contracts that answer it.
          </Body1>
          <Field className={styles.inputWrapper}>
            <Input
              size="large"
              placeholder="e.g. Which contracts touch PII and failed in the last 7 days?"
              value={query}
              contentBefore={<SearchRegular />}
              className={styles.heroInput}
              onChange={(_, data) => setQuery(data.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  void runQuery();
                }
              }}
            />
          </Field>
        </section>
      ) : (
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
        </div>
      )}

      {!result ? (
        <>
          <span className={styles.sectionHead}>
            <SparkleRegular />
            Try one of these
          </span>
          <div className={styles.suggestGrid}>
            {suggestedCards.map((card) => {
              const Icon =
                card.icon === 'people' ? PeopleRegular
                  : card.icon === 'clock' ? ClockRegular
                  : card.icon === 'warning' ? WarningRegular
                  : card.icon === 'shield' ? ShieldRegular
                  : card.icon === 'database' ? DatabaseRegular
                  : TopSpeedRegular;
              return (
                <button
                  key={card.query}
                  type="button"
                  className={styles.suggestCard}
                  onClick={() => { void runQuery(card.query); }}
                >
                  <span className={styles.suggestIcon} style={{ backgroundColor: card.bg, color: card.fg }}>
                    <Icon />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span className={styles.suggestLabel}>{card.label}</span>
                    <span className={styles.suggestHint}>{card.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {!result && recentQueries.length > 0 ? (
        <div className={styles.recent}>
          <span className={styles.sectionHead}>Recent queries</span>
          <div className={styles.chips}>
            {recentQueries.map((recent) => (
              <Button key={recent} appearance="subtle" size="small" onClick={() => { void runQuery(recent); }}>
                {recent}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <Card className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <SparkleRegular />
            <Body1>{result.explanation ?? 'No explanation returned.'}</Body1>
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
              <Card key={match.contractId} className={styles.matchCard} appearance="subtle">
                <div className={styles.matchHeader}>
                  <FabricLink to={`/contracts/${match.contractId}`}>
                    <strong>{match.name ?? match.contractId}</strong>
                  </FabricLink>
                  <Badge appearance="outline" size="small">
                    v{match.version ?? '—'}
                  </Badge>
                  <Caption1 className={styles.relevance}>
                    relevance {(((match.relevanceScore ?? 0) as number) * 100).toFixed(0)}%
                  </Caption1>
                </div>
                <Body1>{match.explanation ?? ''}</Body1>
              </Card>
            ))
          )}
        </Card>
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
