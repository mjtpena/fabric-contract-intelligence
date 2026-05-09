import { SaveRegular } from '@fluentui/react-icons';
import type { RibbonAction } from '../ItemEditor';

interface CreateSaveActionOptions {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function createSaveAction(options: CreateSaveActionOptions): RibbonAction {
  return {
    appearance: 'primary',
    disabled: options.disabled,
    icon: <SaveRegular />,
    key: 'save',
    label: 'Save',
    onClick: options.onClick,
  };
}
