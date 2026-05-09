import type { ReactNode } from 'react';
import {
  Body1,
  Caption1,
  Tooltip,
  Toolbar,
  ToolbarButton,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

export interface RibbonAction {
  appearance?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: ReactNode;
  key: string;
  label: string;
  onClick: () => void | Promise<void>;
}

export interface RibbonToolbar {
  actions: RibbonAction[];
  key: string;
  label: string;
}

interface ItemEditorProps {
  additionalToolbars?: RibbonToolbar[];
  children: ReactNode;
  homeToolbarActions: RibbonAction[];
  statusSlot?: ReactNode;
  subtitle?: string;
  title: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    height: '100%',
    padding: tokens.spacingHorizontalXXL,
    boxSizing: 'border-box',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  title: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
  },
  toolbarRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
  },
  toolbarGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  content: {
    minHeight: 0,
    flex: 1,
    overflow: 'hidden',
  },
});

export function ItemEditor({
  additionalToolbars,
  children,
  homeToolbarActions,
  statusSlot,
  subtitle,
  title,
}: ItemEditorProps) {
  const styles = useStyles();

  return (
    <section className={styles.root}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>{title}</div>
          {subtitle ? <Body1>{subtitle}</Body1> : null}
        </div>
        {statusSlot}
      </div>
      <div className={styles.toolbarRow}>
        <RibbonToolbarGroup actions={homeToolbarActions} label="Home" />
        {additionalToolbars?.map((toolbar) => (
          <RibbonToolbarGroup key={toolbar.key} actions={toolbar.actions} label={toolbar.label} />
        ))}
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

interface RibbonToolbarGroupProps {
  actions: RibbonAction[];
  label: string;
}

function RibbonToolbarGroup({ actions, label }: RibbonToolbarGroupProps) {
  const styles = useStyles();

  return (
    <div className={styles.toolbarGroup}>
      <Caption1>{label}</Caption1>
      <Toolbar aria-label={label}>
        {actions.map((action) => (
          <Tooltip key={action.key} content={action.label} relationship="label">
            <ToolbarButton
              appearance={action.appearance === 'primary' ? 'primary' : 'subtle'}
              disabled={action.disabled}
              icon={action.icon ? <span>{action.icon}</span> : undefined}
              onClick={() => {
                void action.onClick();
              }}
            >
              {action.label}
            </ToolbarButton>
          </Tooltip>
        ))}
      </Toolbar>
    </div>
  );
}
