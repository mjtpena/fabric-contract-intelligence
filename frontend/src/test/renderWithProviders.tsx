import { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MemoryRouter } from 'react-router-dom';

interface RenderWithProvidersOptions {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { route = '/' } = options;

  return render(
    <FluentProvider theme={webLightTheme}>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={[route]}
      >
        {ui}
      </MemoryRouter>
    </FluentProvider>,
  );
}
