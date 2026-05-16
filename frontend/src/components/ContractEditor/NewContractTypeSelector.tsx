import { useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  Radio,
  RadioGroup,
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

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
    alignItems: 'flex-start',
    maxWidth: '720px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalM,
    width: '100%',
  },
  radio: {
    margin: 0,
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusMedium,
    border: `2px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    transition: 'border 0.1s, background 0.1s',
    minHeight: '120px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tileSelected: {
    border: `2px solid ${tokens.colorBrandBackground}`,
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  tileIcon: {
    color: tokens.colorBrandForeground1,
    marginBottom: tokens.spacingVerticalXXS,
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
      <div>
        <Subtitle2>Choose contract target type</Subtitle2>
        <Body1 block style={{ marginTop: tokens.spacingVerticalXXS }}>
          Select the type of Fabric data store this contract will govern.
        </Body1>
      </div>

      <RadioGroup
        aria-label="Select target type"
        className={styles.grid}
        layout="horizontal"
        value={selected}
        onChange={(_, data) => setSelected(data.value as ContractTargetType)}
      >
        {contractTargetTypeOptions.map((option) => (
          <Radio
            key={option.value}
            className={styles.radio}
            value={option.value}
            label={(
              <span className={`${styles.tile} ${selected === option.value ? styles.tileSelected : ''}`}>
                <span className={styles.tileIcon}>{TYPE_ICONS[option.value]}</span>
                <Caption1 style={{ fontWeight: tokens.fontWeightSemibold }}>{option.label}</Caption1>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                  {TYPE_DESCRIPTIONS[option.value]}
                </Caption1>
              </span>
            )}
          />
        ))}
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
