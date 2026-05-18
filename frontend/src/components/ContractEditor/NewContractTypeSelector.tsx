import { useState } from 'react';
import {
  Body1,
  Button,
  RadioGroup,
  Radio,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowTrendingLinesRegular,
  ChartMultipleRegular,
  DatabaseRegular,
  DocumentTableRegular,
  TableRegular,
} from '@fluentui/react-icons';
import type { ContractTargetType } from '@/models/Contract';
import { contractTargetTypeOptions } from '@/models/ContractTarget';

const TYPE_ICONS: Record<ContractTargetType, React.ReactNode> = {
  lakehouse: <DatabaseRegular fontSize={28} />,
  warehouse: <TableRegular fontSize={28} />,
  eventhouse: <ArrowTrendingLinesRegular fontSize={28} />,
  semantic_model: <ChartMultipleRegular fontSize={28} />,
  fabric_sql: <DocumentTableRegular fontSize={28} />,
};

const TYPE_DESCRIPTIONS: Record<ContractTargetType, string> = {
  lakehouse: 'Delta tables in a OneLake Lakehouse',
  warehouse: 'Tables and views in a Fabric Warehouse',
  eventhouse: 'KQL tables in an Eventhouse (KQL database)',
  semantic_model: 'Semantic models and measure tables',
  fabric_sql: 'Tables and views in a Fabric SQL database',
};

const TYPE_LABELS: Record<ContractTargetType, string> = {
  lakehouse: 'Lakehouse',
  warehouse: 'Warehouse',
  eventhouse: 'Eventhouse',
  semantic_model: 'Semantic model',
  fabric_sql: 'SQL database',
};

const TYPE_TONES: Record<ContractTargetType, { fg: string; bg: string }> = {
  lakehouse: { fg: tokens.colorBrandForeground1, bg: tokens.colorBrandBackground2 },
  warehouse: { fg: tokens.colorPaletteCornflowerForeground2, bg: tokens.colorPaletteCornflowerBackground2 },
  eventhouse: { fg: tokens.colorPalettePeachForeground2, bg: tokens.colorPalettePeachBackground2 },
  semantic_model: { fg: tokens.colorPaletteGrapeForeground2, bg: tokens.colorPaletteGrapeBackground2 },
  fabric_sql: { fg: tokens.colorPaletteTealForeground2, bg: tokens.colorPaletteTealBackground2 },
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    alignItems: 'flex-start',
    maxWidth: '64rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))',
    gap: tokens.spacingHorizontalM,
    width: '100%',
  },
  radio: {
    margin: 0,
  },
  tile: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '3.5rem 1fr',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    minHeight: '5.5rem',
    transitionDuration: tokens.durationFast,
    transitionProperty: 'border-color, box-shadow, transform',
    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: tokens.shadow4,
      transform: 'translateY(-1px)',
    },
  },
  tileSelected: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow8,
  },
  tileIconWrap: {
    width: '3.5rem',
    height: '3.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusLarge,
    fontSize: '1.75rem',
  },
  tileBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  tileLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    lineHeight: 1.2,
  },
  tileCaption: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: 1.35,
  },
  intro: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

export interface NewContractTypeSelectorProps {
  onConfirm: (targetType: ContractTargetType) => void;
  onCancel?: () => void;
}

export function NewContractTypeSelector({ onConfirm, onCancel }: NewContractTypeSelectorProps) {
  const styles = useStyles();
  const [selected, setSelected] = useState<ContractTargetType>('lakehouse');

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <Subtitle2>Choose contract target type</Subtitle2>
        <Body1>Select the type of Fabric data store this contract will govern.</Body1>
      </div>

      <RadioGroup
        aria-label="Select target type"
        className={styles.grid}
        layout="horizontal"
        value={selected}
        onChange={(_, data) => setSelected(data.value as ContractTargetType)}
      >
        {contractTargetTypeOptions.map((option) => {
          const tone = TYPE_TONES[option.value];
          return (
            <Radio
              key={option.value}
              className={styles.radio}
              value={option.value}
              label={(
                <span className={`${styles.tile} ${selected === option.value ? styles.tileSelected : ''}`}>
                  <span
                    className={styles.tileIconWrap}
                    style={{ backgroundColor: tone.bg, color: tone.fg }}
                  >
                    {TYPE_ICONS[option.value]}
                  </span>
                  <span className={styles.tileBody}>
                    <span className={styles.tileLabel}>{TYPE_LABELS[option.value]}</span>
                    <span className={styles.tileCaption}>
                      {TYPE_DESCRIPTIONS[option.value]}
                    </span>
                  </span>
                </span>
              )}
            />
          );
        })}
      </RadioGroup>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          onClick={() => onConfirm(selected)}
        >
          Create contract
        </Button>
        {onCancel ? (
          <Button appearance="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
