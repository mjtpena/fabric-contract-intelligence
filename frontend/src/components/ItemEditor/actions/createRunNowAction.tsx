import { PlayRegular } from '@fluentui/react-icons';
import type { RibbonAction } from '../ItemEditor';

interface CreateRunNowActionOptions {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function createRunNowAction(options: CreateRunNowActionOptions): RibbonAction {
  return {
    disabled: options.disabled,
    icon: <PlayRegular />,
    key: 'run-now',
    label: 'Run now',
    onClick: options.onClick,
  };
}
