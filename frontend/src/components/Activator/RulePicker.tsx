import { Dropdown, Option } from '@fluentui/react-components';
import type { ActivatorRule } from '@/models/ops';

interface RulePickerProps {
  rules: ActivatorRule[];
  selectedRuleId: string | null;
  onChange: (ruleId: string | null) => void;
}

export function RulePicker({ rules, selectedRuleId, onChange }: RulePickerProps) {
  return (
    <Dropdown
      selectedOptions={selectedRuleId ? [selectedRuleId] : []}
      value={selectedRuleId ? rules.find((rule) => rule.id === selectedRuleId)?.name ?? '' : 'Select Activator rule'}
      onOptionSelect={(_, data) => onChange(data.optionValue ?? null)}
    >
      {rules.map((rule) => (
        <Option key={rule.id} value={rule.id}>
          {rule.name}
        </Option>
      ))}
    </Dropdown>
  );
}
