import { Badge } from '@fluentui/react-components';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const displayText = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  return (
    <Badge
      appearance="filled"
      color={getStatusColor(normalizedStatus)}
      shape="rounded"
      size="medium"
    >
      {displayText}
    </Badge>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
    case 'passed':
      return 'success';
    case 'deprecated':
    case 'warning':
    case 'warned':
      return 'warning';
    case 'archived':
    case 'failed':
    case 'error':
      return 'danger';
    default:
      return 'informative';
  }
}
