import { Button, MessageBar, MessageBarActions, MessageBarBody } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({ message, onRetry, retryLabel = 'Retry' }: ErrorBannerProps) {
  return (
    <MessageBar intent="error" role="alert">
      <MessageBarBody>{message}</MessageBarBody>
      {onRetry ? (
        <MessageBarActions>
          <Button appearance="secondary" icon={<ArrowClockwiseRegular />} size="small" onClick={onRetry}>
            {retryLabel}
          </Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}
