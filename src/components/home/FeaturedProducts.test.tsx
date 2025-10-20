import { render, screen, waitFor } from '@testing-library/react';
import { FeaturedProducts } from './FeaturedProducts';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock global fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('FeaturedProducts Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render loading skeletons initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Prevent fetch from resolving
    const { container } = render(<FeaturedProducts />);

    // Verificar que se renderizan múltiples elementos con la clase animate-pulse (skeletons)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Verificar que NO se muestra el mensaje de "no hay productos destacados"
    expect(screen.queryByText(/no hay productos destacados/i)).not.toBeInTheDocument();
  });

  it('should fetch and display featured products correctly', async () => {
    const mockProducts = [
      { id: 'prod1', name: 'Tacos de Fuego', price: 150, description: 'Pica pero sabroso', imageUrl: '' },
      { id: 'prod2', name: 'Albóndigas Suaves', price: 120, description: 'Como las de mamá', imageUrl: '' },
    ];
    const mockPromotions = [];

    // Mock both fetch calls (products and promotions)
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProducts) })  // productos-venta/latest
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockPromotions) }); // promotions/featured

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText('Tacos de Fuego')).toBeInTheDocument();
      expect(screen.getByText('Albóndigas Suaves')).toBeInTheDocument();
    });

    expect(screen.getByText(/ver menú completo/i)).toBeInTheDocument();
  });

  it('should display an empty state message when no products are featured', async () => {
    // Mock both fetch calls returning empty arrays
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })  // productos-venta/latest
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // promotions/featured

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText(/no hay productos destacados/i)).toBeInTheDocument();
    });
  });

  it('should display the empty state if the API fetch fails', async () => {
    // Mock both fetch calls failing (one fails, one succeeds with empty array)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })  // productos-venta/latest fails
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // promotions/featured succeeds but empty

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText(/no hay productos destacados/i)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error al obtener productos destacados:', 500);
    consoleErrorSpy.mockRestore();
  });
});