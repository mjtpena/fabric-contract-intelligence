import type { ReactNode } from 'react';
import { Body1, Button, Title3, makeStyles, tokens } from '@fluentui/react-components';

interface EmptyStateProps {
  actionIcon?: ReactNode;
  actionLabel?: string;
  description: string;
  icon?: ReactNode;
  onAction?: () => void;
  title: string;
}

const useStyles = makeStyles({
  root: {
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXXL,
    textAlign: 'center',
  },
  icon: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeHero900,
    lineHeight: 1,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    maxWidth: '36ch',
  },
});

export function EmptyState({
  actionIcon,
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: EmptyStateProps) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <Title3 as="h3">{title}</Title3>
      <Body1 className={styles.description}>{description}</Body1>
      {actionLabel && onAction ? (
        <Button appearance="primary" icon={actionIcon ? <span>{actionIcon}</span> : undefined} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
