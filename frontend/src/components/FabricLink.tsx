import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useFabricSdk } from '@/hooks/useFabricSdk';

export interface FabricLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: ReactNode;
  mode?: 'append' | 'replaceAll';
  to: string;
}

export function FabricLink({ children, mode = 'replaceAll', onClick, to, ...props }: FabricLinkProps) {
  const sdk = useFabricSdk();
  const navigate = useNavigate();

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!sdk.isHosted) return;

    event.preventDefault();
    const openMode = event.metaKey || event.ctrlKey ? 'append' : mode;
    if (!(await sdk.openWorkloadRoute(to, openMode))) {
      navigate(to);
    }
  };

  return (
    <RouterLink {...props} to={to} onClick={(event) => { void handleClick(event); }}>
      {children}
    </RouterLink>
  );
}
