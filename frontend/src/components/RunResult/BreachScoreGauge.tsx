import { Body1, Caption1, makeStyles, tokens } from '@fluentui/react-components';

interface BreachScoreGaugeProps {
  score: number | null | undefined;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    justifyItems: 'center',
    gap: tokens.spacingVerticalXS,
  },
  value: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
});

export function BreachScoreGauge({ score }: BreachScoreGaugeProps) {
  const styles = useStyles();
  const normalizedScore = score === null || score === undefined ? null : Math.max(0, Math.min(100, score));
  const angle = normalizedScore === null ? 180 : 180 - normalizedScore * 1.8;
  const arcColor =
    normalizedScore === null
      ? tokens.colorNeutralStroke2
      : normalizedScore >= 70
        ? tokens.colorPaletteRedForeground1
        : normalizedScore >= 40
          ? tokens.colorPaletteDarkOrangeForeground1
          : tokens.colorPaletteGreenForeground1;

  return (
    <div className={styles.root}>
      <svg
        aria-label="Breach score gauge"
        height="120"
        role="img"
        viewBox="0 0 200 120"
        width="200"
      >
        <path
          d={describeArc(100, 100, 70, 180, 0)}
          fill="none"
          stroke={tokens.colorNeutralStroke2}
          strokeLinecap="round"
          strokeWidth="16"
        />
        <path
          d={describeArc(100, 100, 70, 180, angle)}
          fill="none"
          stroke={arcColor}
          strokeLinecap="round"
          strokeWidth="16"
        />
        <line
          stroke={tokens.colorNeutralForeground1}
          strokeLinecap="round"
          strokeWidth="6"
          x1="100"
          x2={String(100 + 52 * Math.cos((Math.PI * angle) / 180))}
          y1="100"
          y2={String(100 - 52 * Math.sin((Math.PI * angle) / 180))}
        />
        <circle cx="100" cy="100" fill={tokens.colorNeutralForeground1} r="7" />
        <text fill={tokens.colorNeutralForeground3} fontSize="12" x="16" y="104">
          0
        </text>
        <text fill={tokens.colorNeutralForeground3} fontSize="12" x="172" y="104">
          100
        </text>
      </svg>
      <div className={styles.value}>{normalizedScore === null ? 'Pending' : Math.round(normalizedScore)}</div>
      <Caption1>AI breach score</Caption1>
      <Body1>
        {normalizedScore === null
          ? 'Waiting for Sprint 8 scoring.'
          : normalizedScore >= 70
            ? 'High severity breach.'
            : normalizedScore >= 40
              ? 'Moderate severity breach.'
              : 'Low severity breach.'}
      </Body1>
    </div>
  );
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= -180 ? '1' : '0';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
