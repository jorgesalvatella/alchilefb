import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminBusinessUnitsPage from './page';
import { useUser } from '@/firebase/provider';
import { useParams } from 'next/navigation';

// Mock de los hooks de Next.js y Firebase
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
  useFirestore: jest.fn(() => null),
}));

// Mock de fetch
global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;

describe('AdminBusinessUnitsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock por defecto para un usuario logueado y carga completada
    mockUseUser.mockReturnValue({
      user: {
        getIdToken: () => Promise.resolve('test-token'),
      },
      isUserLoading: false,
    });
    (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
    });
  });

  it('should display a loading message when isUserLoading is true', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: true });
    render(<AdminBusinessUnitsPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los datos.'));
    render(<AdminBusinessUnitsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: No se pudo obtener los datos.')).toBeInTheDocument();
    });
  });

  it('should display the business units when data is fetched successfully', async () => {
    const mockData = [
      { id: '1', name: 'Sucursal Centro', razonSocial: 'Al Chile Centro SA de CV', address: 'Calle Falsa 123', phone: '555-1234' },
    ];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<AdminBusinessUnitsPage />);

    await waitFor(() => {
      expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    });
  });

  it('should not fetch data if user is not authenticated and loading is finished', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });
    render(<AdminBusinessUnitsPage />);
    expect(fetch).not.toHaveBeenCalled();
  });
});