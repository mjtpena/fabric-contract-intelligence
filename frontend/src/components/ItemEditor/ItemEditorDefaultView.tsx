import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type ItemEditorView = 'editor' | 'empty';

interface ViewNavigationContextValue {
  navigateTo: (view: ItemEditorView) => void;
  view: ItemEditorView;
}

const ViewNavigationContext = createContext<ViewNavigationContextValue | null>(null);

interface ItemEditorDefaultViewProps {
  children: ReactNode;
  initialView: ItemEditorView;
}

export function ItemEditorDefaultView({
  children,
  initialView,
}: ItemEditorDefaultViewProps) {
  const [view, setView] = useState<ItemEditorView>(initialView);

  useEffect(() => {
    if (initialView === 'editor') {
      setView('editor');
    }
  }, [initialView]);

  const value = useMemo<ViewNavigationContextValue>(
    () => ({
      navigateTo: setView,
      view,
    }),
    [view],
  );

  return <ViewNavigationContext.Provider value={value}>{children}</ViewNavigationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useViewNavigation() {
  const context = useContext(ViewNavigationContext);

  if (!context) {
    throw new Error('useViewNavigation must be used inside ItemEditorDefaultView.');
  }

  return context;
}
