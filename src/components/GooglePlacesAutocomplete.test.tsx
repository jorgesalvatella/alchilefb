import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useJsApiLoader } from '@react-google-maps/api';

// Mock the Google Maps API loader
jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: jest.fn(),
}));

const mockUseJsApiLoader = useJsApiLoader as jest.Mock;

// Mock the global google.maps object
const mockGetPlace = jest.fn(() => ({
  address_components: [
    { long_name: '1600', types: ['street_number'] },
    { long_name: 'Amphitheatre Parkway', types: ['route'] },
    { long_name: 'Mountain View', types: ['locality'] },
    { long_name: 'Santa Clara County', types: ['administrative_area_level_2'] },
    { long_name: 'California', types: ['administrative_area_level_1'] },
    { long_name: 'United States', types: ['country'] },
    { long_name: '94043', types: ['postal_code'] },
  ],
  formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
  geometry: {
    location: {
      lat: () => 37.422,
      lng: () => -122.084,
    },
  },
}));

const mockAddListener = jest.fn((event, callback) => {
  if (event === 'place_changed') {
    callback();
  }
});

global.google = {
  maps: {
    places: {
      Autocomplete: jest.fn(() => ({
        getPlace: mockGetPlace,
        addListener: mockAddListener,
      })),
    },
    event: {
      clearInstanceListeners: jest.fn(),
    },
  } as any,
};

describe('GooglePlacesAutocomplete', () => {
  const onChange = jest.fn();
  const onAddressSelect = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
    onAddressSelect.mockClear();
    mockGetPlace.mockClear();
    mockAddListener.mockClear();
    (global.google.maps.places.Autocomplete as jest.Mock).mockClear();
  });

  it('renders loading state', () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: false, loadError: null });
    render(<GooglePlacesAutocomplete value="" onChange={onChange} />);
    expect(screen.getByPlaceholderText('Cargando...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: false, loadError: new Error('Failed to load') });
    render(<GooglePlacesAutocomplete value="" onChange={onChange} />);
    expect(screen.getByText(/Error al cargar Google Maps/i)).toBeInTheDocument();
  });

  it('initializes autocomplete and handles place selection', async () => {
    mockUseJsApiLoader.mockReturnValue({ isLoaded: true, loadError: null });
    render(<GooglePlacesAutocomplete value="" onChange={onChange} onAddressSelect={onAddressSelect} />);

    // Wait for the component to initialize the autocomplete
    await waitFor(() => {
      expect(global.google.maps.places.Autocomplete).toHaveBeenCalled();
      expect(mockAddListener).toHaveBeenCalledWith('place_changed', expect.any(Function));
    });

    // The mock listener calls the callback immediately, simulating a place selection
    await waitFor(() => {
      expect(mockGetPlace).toHaveBeenCalled();
      expect(onAddressSelect).toHaveBeenCalledWith({
        street: '1600 Amphitheatre Parkway',
        neighborhood: '',
        city: 'Mountain View',
        state: 'California',
        postalCode: '94043',
        country: 'United States',
        lat: 37.422,
        lng: -122.084,
        formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      });
      expect(onChange).toHaveBeenCalledWith('1600 Amphitheatre Parkway, Mountain View, CA 94043, USA');
    });
  });
});
