import { SettingsRegular } from '@fluentui/react-icons';
import type { RibbonAction } from '../ItemEditor';

interface CreateSettingsActionOptions {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function createSettingsAction(options: CreateSettingsActionOptions): RibbonAction {
  return {
    disabled: options.disabled,
    icon: <SettingsRegular />,
    key: 'settings',
    label: 'Settings',
    onClick: options.onClick,
  };
}
