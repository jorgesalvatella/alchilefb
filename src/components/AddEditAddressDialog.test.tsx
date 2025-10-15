import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddEditAddressDialog from './AddEditAddressDialog';

// Mock the complex child component
jest.mock('@/components/GooglePlacesAutocompleteWithMap', () => {
  return jest.fn(({ onAddressSelect }) => (
    <button data-testid="mock-autocomplete" onClick={() => onAddressSelect({
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      lat: 34.05,
      lng: -118.24,
      formattedAddress: '123 Main St, Anytown, CA 12345',
    })}>
      Select Address
    </button>
  ));
});

describe('AddEditAddressDialog', () => {
  const onSave = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSave.mockClear();
    onClose.mockClear();
  });

  it('should render in "add" mode', () => {
    render(<AddEditAddressDialog isOpen={true} onClose={onClose} onSave={onSave} />);
    expect(screen.getByText('📍 Añadir Nueva Dirección')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selecciona una dirección primero/i })).toBeDisabled();
  });

  it('should render in "edit" mode with pre-filled data', () => {
    const addressToEdit = {
      id: '1',
      streetAddress: '456 Old St',
      city: 'Oldtown',
      state: 'TX',
      zipCode: '67890',
      lat: 30.26,
      lng: -97.74,
      formattedAddress: '456 Old St, Oldtown, TX 67890',
    };
    render(<AddEditAddressDialog isOpen={true} onClose={onClose} onSave={onSave} addressToEdit={addressToEdit} />);
    expect(screen.getByText('✏️ Editar Dirección')).toBeInTheDocument();
    // The save button should be enabled because lat/lng are present
    expect(screen.getByRole('button', { name: /✓ Guardar Dirección/i })).toBeEnabled();
  });

  it('should enable save button and call onSave when an address is selected', async () => {
    render(<AddEditAddressDialog isOpen={true} onClose={onClose} onSave={onSave} />);
    
    // Initially disabled
    const saveButton = screen.getByRole('button', { name: /Selecciona una dirección primero/i });
    expect(saveButton).toBeDisabled();

    // Simulate address selection
    const autocomplete = screen.getByTestId('mock-autocomplete');
    fireEvent.click(autocomplete);

    // Wait for state updates and button to be enabled
    await waitFor(() => {
      const enabledSaveButton = screen.getByRole('button', { name: /✓ Guardar Dirección/i });
      expect(enabledSaveButton).toBeEnabled();
      fireEvent.click(enabledSaveButton);
    });

    // Verify onSave was called with correct data
    expect(onSave).toHaveBeenCalledWith({
      id: undefined,
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      lat: 34.05,
      lng: -118.24,
      formattedAddress: '123 Main St, Anytown, CA 12345',
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<AddEditAddressDialog isOpen={true} onClose={onClose} onSave={onSave} />);
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
