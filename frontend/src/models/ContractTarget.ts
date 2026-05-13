import type { ContractTargetType } from '@/models/Contract';

export const contractTargetTypeOptions: Array<{ label: string; value: ContractTargetType }> = [
  { label: 'Lakehouse', value: 'lakehouse' },
  { label: 'Warehouse', value: 'warehouse' },
  { label: 'Eventhouse / KQL database', value: 'eventhouse' },
  { label: 'Semantic model', value: 'semantic_model' },
  { label: 'Fabric SQL database', value: 'fabric_sql' },
];

export function getContractTargetTypeLabel(value: ContractTargetType): string {
  return contractTargetTypeOptions.find((option) => option.value === value)?.label ?? value;
}
