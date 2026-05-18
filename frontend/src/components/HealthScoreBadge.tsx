import { Badge, makeStyles, tokens, Tooltip } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import type { ContractClient } from '@/api/contractClient';
import type { ContractHealthScore } from '@/models/AiContext';

interface HealthScoreBadgeProps {
  contractId: string;
  client: ContractClient;
}

const useStyles = makeStyles({
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
});

const gradeToColor: Record<ContractHealthScore['grade'], 'success' | 'warning' | 'danger'> = {
  green: 'success',
  amber: 'warning',
  red: 'danger',
};

/**
 * Surfaces the Contract Health Score (Phase 1 Epic 1.4) next to the status badge
 * in the ItemEditor header. Hidden until the score loads to avoid layout jitter.
 */
export function HealthScoreBadge({ contractId, client }: HealthScoreBadgeProps): JSX.Element | null {
  const styles = useStyles();
  const [health, setHealth] = useState<ContractHealthScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setHealth(null);
    setError(null);

    client
      .getContractHealth(contractId, { signal: controller.signal })
      .then(setHealth)
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load contract health');
      });

    return () => controller.abort();
  }, [client, contractId]);

  if (error || !health) {
    return null;
  }

  const tooltipContent = (
    <div>
      <div>Schema validity: {Math.round(health.dimensions.schemaValidity * 100)}%</div>
      <div>Quality pass rate: {Math.round(health.dimensions.qualityRulePassRate * 100)}%</div>
      <div>Freshness SLA: {Math.round(health.dimensions.freshnessSlaMet * 100)}%</div>
      <div>Sensitivity label: {Math.round(health.dimensions.sensitivityLabelSet * 100)}%</div>
      <div>Approval up-to-date: {Math.round(health.dimensions.approvalUpToDate * 100)}%</div>
      <div>Lineage: {Math.round(health.dimensions.lineageCompleteness * 100)}%</div>
      <div>Evidence cited: {Math.round(health.dimensions.evidenceCitedRatio * 100)}%</div>
    </div>
  );

  return (
    <span className={styles.container}>
      <Tooltip
        appearance="inverted"
        content={tooltipContent}
        relationship="description"
        withArrow
      >
        <Badge appearance="tint" color={gradeToColor[health.grade]} size="medium">
          Health {health.score}
        </Badge>
      </Tooltip>
    </span>
  );
}
