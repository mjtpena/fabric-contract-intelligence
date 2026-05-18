import type { ReactNode } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Subtitle1,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

export type EmptyStateTone = 'neutral' | 'brand' | 'success' | 'warning';

interface EmptyStateProps {
  actionIcon?: ReactNode;
  actionLabel?: string;
  description: string;
  hint?: string;
  icon?: ReactNode;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  title: string;
  tone?: EmptyStateTone;
}

const useStyles = makeStyles({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXXL}`,
    textAlign: 'center',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tile: {
    width: '4.5rem',
    height: '4.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    fontSize: '2rem',
    marginBottom: tokens.spacingVerticalXS,
  },
  tileNeutral: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  tileBrand: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  tileSuccess: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },
  tileWarning: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  title: {
    margin: 0,
    color: tokens.colorNeutralForeground1,
  },
  description: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '44ch',
    lineHeight: 1.5,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});

const TONE_CLASS: Record<EmptyStateTone, keyof ReturnType<typeof useStyles>> = {
  neutral: 'tileNeutral',
  brand: 'tileBrand',
  success: 'tileSuccess',
  warning: 'tileWarning',
};

export function EmptyState({
  actionIcon,
  actionLabel,
  description,
  hint,
  icon,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  title,
  tone = 'neutral',
}: EmptyStateProps) {
  const styles = useStyles();
  const toneClass = styles[TONE_CLASS[tone]];

  return (
    <div className={styles.root}>
      {icon ? (
        <div className={mergeClasses(styles.tile, toneClass)} aria-hidden>
          {icon}
        </div>
      ) : null}
      <Subtitle1 as="h3" className={styles.title}>
        {title}
      </Subtitle1>
      <Body1 className={styles.description}>{description}</Body1>
      {hint ? <Caption1 className={styles.hint}>{hint}</Caption1> : null}
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className={styles.actions}>
          {actionLabel && onAction ? (
            <Button
              appearance="primary"
              icon={actionIcon ? <span>{actionIcon}</span> : undefined}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button appearance="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
