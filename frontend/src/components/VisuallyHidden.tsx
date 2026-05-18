import type { ReactNode } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
});

export interface VisuallyHiddenProps {
  children: ReactNode;
  className?: string;
  /** When true, renders an `aria-live="polite"` region for status announcements. */
  liveRegion?: boolean;
  id?: string;
}

/**
 * Visually hides content while keeping it accessible to assistive tech.
 * Standard Fabric-native sr-only pattern.
 */
export function VisuallyHidden({ children, className, id, liveRegion }: VisuallyHiddenProps) {
  const styles = useStyles();
  if (liveRegion) {
    return (
      <div
        aria-atomic="true"
        aria-live="polite"
        className={mergeClasses(styles.root, className)}
        id={id}
        role="status"
      >
        {children}
      </div>
    );
  }
  return (
    <span className={mergeClasses(styles.root, className)} id={id}>
      {children}
    </span>
  );
}
