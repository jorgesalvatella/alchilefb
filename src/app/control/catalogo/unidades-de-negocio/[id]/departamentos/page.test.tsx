import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDepartmentsPage from './page';
import { useAuth } from '@/firebase/provider';
import { useParams } from 'next/navigation';

// Mock de los hooks de Next.js y Firebase
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
  useAuth: jest.fn(),
  useFirestore: jest.fn(() => null),
}));

// Mock de fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockUseParams = useParams as jest.Mock;

describe('AdminDepartmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulamos un usuario y un ID de unidad de negocio por defecto
    mockUseAuth.mockReturnValue({
      user: {
        getIdToken: () => Promise.resolve('test-token'),
      },
    });
    mockUseParams.mockReturnValue({
      id: 'test-business-unit-id',
    });
  });

  it('should display a loading message initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Petición pendiente
    render(<AdminDepartmentsPage />);
    expect(screen.getByText('Cargando departamentos...')).toBeInTheDocument();
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los departamentos.'));
    render(<AdminDepartmentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: No se pudo obtener los departamentos.')).toBeInTheDocument();
    });
  });

  it('should display the departments when data is fetched successfully', async () => {
    const mockData = [
      { id: '1', name: 'Cocina' },
      { id: '2', name: 'Barra' },
    ];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cocina')).toBeInTheDocument();
      expect(screen.getByText('Barra')).toBeInTheDocument();
    });
  });

  it('should call the correct nested API endpoint', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/control/unidades-de-negocio/test-business-unit-id/departamentos',
        expect.any(Object)
      );
    });
  });
});
