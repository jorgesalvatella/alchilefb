import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminConceptsPage from './page';
import { useUser } from '@/firebase/provider';
import { useParams } from 'next/navigation';

// Mocks
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));
global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockUseParams = jest.requireMock('next/navigation').useParams;

describe('AdminConceptsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: {
        getIdToken: async () => 'test-token',
      },
      isUserLoading: false,
    });
    mockUseParams.mockReturnValue({
      id: 'test-unit-id',
      depId: 'test-dep-id',
      groupId: 'test-group-id',
    });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('should display a loading message initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<AdminConceptsPage />);
    const loadingMessages = screen.getAllByText('Cargando conceptos...');
    expect(loadingMessages.length).toBeGreaterThan(0);
  });

  it('should display an error message if data fetching fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('No se pudo obtener los conceptos.'));
    render(<AdminConceptsPage />);
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Error: No se pudo obtener los conceptos\./);
      expect(errorMessages.length).toBeGreaterThan(0);
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
      const conceptNames = screen.getAllByText('Coca-Cola');
      expect(conceptNames.length).toBeGreaterThan(0);
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
