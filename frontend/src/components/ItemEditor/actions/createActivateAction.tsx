import { FlashRegular } from '@fluentui/react-icons';
import type { RibbonAction } from '../ItemEditor';

interface CreateActivateActionOptions {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function createActivateAction(options: CreateActivateActionOptions): RibbonAction {
  return {
    disabled: options.disabled,
    icon: <FlashRegular />,
    key: 'activate',
    label: 'Activate',
    onClick: options.onClick,
  };
}
