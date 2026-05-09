import { HistoryRegular } from '@fluentui/react-icons';
import type { RibbonAction } from '../ItemEditor';

interface CreateVersionHistoryActionOptions {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function createVersionHistoryAction(options: CreateVersionHistoryActionOptions): RibbonAction {
  return {
    disabled: options.disabled,
    icon: <HistoryRegular />,
    key: 'version-history',
    label: 'Version history',
    onClick: options.onClick,
  };
}
