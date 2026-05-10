import { useMemo, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Link } from 'react-router-dom';
import { createAiClient } from '@/api/aiClient';
import { useFabricSdk } from '@/hooks/useFabricSdk';
import type { NaturalLanguageQueryResponse } from '@/models/Ai';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
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
});

export function NLQueryPage() {
  const styles = useStyles();
  const sdk = useFabricSdk();
  const [query, setQuery] = useState('Find contracts for CO2 emissions by country');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NaturalLanguageQueryResponse | null>(null);

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
    setLoading(true);
    try {
      const response = await aiClient.queryContracts({ query });
      setResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run contract query.';
      await sdk.notifyError('AI query failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.root}>
      <Caption1>Enterprise AI Query</Caption1>
      <Body1>Ask questions in plain English to locate relevant contracts and explanations.</Body1>
      <Field label="Natural-language query">
        <Input value={query} onChange={(_, data) => setQuery(data.value)} />
      </Field>
      <Button appearance="primary" onClick={() => { void runQuery(); }} disabled={loading}>
        Search contracts
      </Button>

      {loading ? <Spinner label="Running AI query…" /> : null}
      {result ? (
        <div className={styles.resultCard}>
          <Subtitle2>{result.explanation}</Subtitle2>
          <Caption1>Model: {result.modelUsed}</Caption1>
          {result.matches.map((match) => (
            <div key={match.contractId}>
              <Link to={`/contracts/${match.contractId}`}>{match.name}</Link>
              <Body1>{match.explanation}</Body1>
              <Caption1>Version {match.version} • Score {match.relevanceScore.toFixed(2)}</Caption1>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
