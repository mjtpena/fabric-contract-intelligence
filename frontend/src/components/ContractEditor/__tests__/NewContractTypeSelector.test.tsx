import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { NewContractTypeSelector } from '@/components/ContractEditor/NewContractTypeSelector';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('NewContractTypeSelector', () => {
  it('renders all target type options with intro copy', () => {
    renderWithProviders(<NewContractTypeSelector onConfirm={() => {}} />);

    expect(screen.getByText('Choose contract target type')).toBeInTheDocument();
    expect(
      screen.getByText('Select the type of Fabric data store this contract will govern.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Select target type' })).toBeInTheDocument();
    expect(screen.getByText('Delta tables in a OneLake Lakehouse')).toBeInTheDocument();
    expect(screen.getByText('Tables and views in a Fabric Warehouse')).toBeInTheDocument();
    expect(screen.getByText('KQL tables in an Eventhouse (KQL database)')).toBeInTheDocument();
    expect(screen.getByText('Semantic models and measure tables')).toBeInTheDocument();
    expect(screen.getByText('Tables and views in a Fabric SQL database')).toBeInTheDocument();
  });

  it('confirms the default lakehouse selection when no other radio is chosen', () => {
    const onConfirm = vi.fn();
    renderWithProviders(<NewContractTypeSelector onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('lakehouse');
  });

  it('confirms the newly selected target type after the user switches radios', () => {
    const onConfirm = vi.fn();
    renderWithProviders(<NewContractTypeSelector onConfirm={onConfirm} />);

    const warehouseRadio = screen
      .getAllByRole('radio')
      .find((node) => node.getAttribute('value') === 'warehouse');
    expect(warehouseRadio).toBeDefined();
    fireEvent.click(warehouseRadio!);

    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));
    expect(onConfirm).toHaveBeenCalledWith('warehouse');
  });

  it('renders the cancel button only when onCancel is provided', () => {
    const onCancel = vi.fn();
    const { rerender } = renderWithProviders(
      <NewContractTypeSelector onConfirm={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    rerender(<NewContractTypeSelector onConfirm={() => {}} onCancel={onCancel} />);
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
