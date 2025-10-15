import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GooglePlacesAutocompleteWithMap from './GooglePlacesAutocompleteWithMap';

// Mock completo de la librería @react-google-maps/api
jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: jest.fn(),
  GoogleMap: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
  Marker: () => <div data-testid="mock-marker" />,
}));

// Mock de los íconos de lucide-react
jest.mock('lucide-react', () => ({
  MapPin: () => <span data-testid="map-pin-icon" />,
  CheckCircle2: () => <span data-testid="check-circle2-icon" />,
  Mouse: () => <span data-testid="mouse-icon" />,
  Search: () => <span data-testid="search-icon" />,
  MapPinned: () => <span data-testid="map-pinned-icon" />,
  LocateFixed: () => <span data-testid="locate-fixed-icon" />,
  Loader2: () => <span data-testid="loader2-icon" />,
}));

const { useJsApiLoader } = require('@react-google-maps/api');

describe('GooglePlacesAutocompleteWithMap', () => {
  const mockOnChange = jest.fn();
  const mockOnAddressSelect = jest.fn();

  // Mock robusto del objeto global 'google'
  const mockGoogle = {
    maps: {
      places: {
        Autocomplete: jest.fn().mockImplementation(() => ({
          addListener: jest.fn(),
          getPlace: jest.fn(),
        })),
      },
      event: {
        clearInstanceListeners: jest.fn(),
      },
      Animation: { BOUNCE: 1, DROP: 2 },
    },
  };

  const mockGeolocation = {
    getCurrentPosition: jest.fn(),
  };

  beforeAll(() => {
    global.google = mockGoogle as any;
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useJsApiLoader as jest.Mock).mockReturnValue({ isLoaded: true, loadError: null });
    global.fetch = jest.fn();
  });

  it('debería manejar el éxito de "Mi ubicación" correctamente', async () => {
    // 1. Mock Geolocation para llamar al callback de éxito
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success({
        coords: { latitude: 51.1, longitude: 45.3 },
      });
    });

    // 2. Mock Fetch para devolver una dirección
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{ formatted_address: 'Dirección de prueba, 123' }],
      }),
    });

    render(<GooglePlacesAutocompleteWithMap value="" onChange={mockOnChange} onAddressSelect={mockOnAddressSelect} />);
    
    // 3. Simular click
    fireEvent.click(screen.getByRole('button', { name: /mi ubicación/i }));

    // 4. Verificar estado de carga
    expect(screen.getByText(/ubicando.../i)).toBeInTheDocument();

    // 5. Esperar el resultado final en el DOM
    await screen.findByText('✓ Ubicación confirmada');

    // 6. Verificar que las funciones fueron llamadas
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('latlng=51.1,45.3'));
    expect(mockOnChange).toHaveBeenCalledWith('Dirección de prueba, 123');
    expect(mockOnAddressSelect).toHaveBeenCalledWith(expect.objectContaining({
      formattedAddress: 'Dirección de prueba, 123'
    }));
    expect(screen.queryByText(/ubicando.../i)).not.toBeInTheDocument();
  });

  it('debería manejar el error de permiso denegado en "Mi ubicación"', async () => {
    // 1. Mock Geolocation para llamar al callback de error
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
      error!({ code: 1, message: 'Permission Denied' });
    });

    render(<GooglePlacesAutocompleteWithMap value="" onChange={mockOnChange} onAddressSelect={mockOnAddressSelect} />);
    
    // 2. Simular click
    fireEvent.click(screen.getByRole('button', { name: /mi ubicación/i }));

    // 3. Esperar el mensaje de error
    await screen.findByText(/Permiso de ubicación denegado/i);

    expect(screen.queryByText(/ubicando.../i)).not.toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});