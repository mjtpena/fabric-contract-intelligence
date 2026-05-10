export interface FabricPathContext {
  workspaceId: string;
  itemType: string;
  itemId: string | null;
}

export function parseFabricPathContext(pathname: string): FabricPathContext | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 3 || segments[0].toLowerCase() !== 'groups') {
    return null;
  }

  const workspaceId = decodeURIComponent(segments[1] ?? '');
  const itemType = decodeURIComponent(segments[2] ?? '');
  const itemId = segments[3] ? decodeURIComponent(segments[3]) : null;

  if (!workspaceId || !itemType) {
    return null;
  }

  return {
    itemId,
    itemType,
    workspaceId,
  };
}

export function resolveWorkloadRouteForItemType(itemType: string): '/contracts/editor' | '/contracts/policies' | '/contracts/runs' | null {
  const normalized = itemType.toLowerCase();

  if (normalized.endsWith('.contract')) {
    return '/contracts/editor';
  }

  if (normalized.endsWith('.contractpolicy')) {
    return '/contracts/policies';
  }

  if (normalized.endsWith('.contractreport')) {
    return '/contracts/runs';
  }

  return null;
}
