import type { ReactNode } from 'react';
import {
  Caption1,
  Tooltip,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Title3,
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
  tooltip?: string;
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
    gap: tokens.spacingVerticalM,
    height: '100%',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    boxSizing: 'border-box',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    minHeight: '32px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: tokens.spacingVerticalS,
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
          <Title3 as="h2" className={styles.title} title={title}>{title}</Title3>
          {subtitle ? (
            <Caption1 className={styles.subtitle} title={subtitle}>
              {subtitle}
            </Caption1>
          ) : null}
        </div>
        {statusSlot}
      </div>
      <div className={styles.toolbarRow}>
        <Toolbar aria-label="Home">
          {homeToolbarActions.map((action) => (
            <Tooltip key={action.key} content={action.tooltip ?? action.label} relationship="label">
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
        {additionalToolbars?.map((toolbar) =>
          toolbar.actions.length > 0 ? (
            <span key={toolbar.key} style={{ display: 'flex', alignItems: 'center' }}>
              <ToolbarDivider />
              <Toolbar aria-label={toolbar.label}>
                {toolbar.actions.map((action) => (
                  <Tooltip key={action.key} content={action.tooltip ?? action.label} relationship="label">
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
            </span>
          ) : null,
        )}
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
