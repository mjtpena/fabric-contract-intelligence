import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MemoryRouter } from 'react-router-dom';

import App from './App';

describe('App', () => {
  it('renders the scaffold home page', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </FluentProvider>,
    );

    expect(screen.getByText('Fabric Contract Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contracts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Runs' })).toBeInTheDocument();
  });
});
