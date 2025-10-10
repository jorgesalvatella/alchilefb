import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminConceptsPage from './page';
import { useAuth } from '@/firebase/provider';
import { useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
  useAuth: jest.fn(),
  useFirestore: jest.fn(() => null),
}));
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockUseParams = useParams as jest.Mock;

describe('AdminConceptsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        getIdToken: () => Promise.resolve('test-token'),
      },
    });
    mockUseParams.mockReturnValue({
      id: 'test-unit-id',
      depId: 'test-dep-id',
      groupId: 'test-group-id',
    });
  });

  it('should display a loading message initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<AdminConceptsPage />);
    expect(screen.getByText('Cargando conceptos...')).toBeInTheDocument();
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los conceptos.'));
    render(<AdminConceptsPage />);
    await waitFor(() => {
      expect(screen.getByText('Error: No se pudo obtener los conceptos.')).toBeInTheDocument();
    });
  });

  it('should display the concepts when data is fetched successfully', async () => {
    const mockData = [{ id: '1', name: 'Coca-Cola' }];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    render(<AdminConceptsPage />);
    await waitFor(() => {
      expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    });
  });

  it('should call the correct nested API endpoint', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<AdminConceptsPage />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/control/unidades-de-negocio/test-unit-id/departamentos/test-dep-id/grupos/test-group-id/conceptos',
        expect.any(Object)
      );
    });
  });
});
