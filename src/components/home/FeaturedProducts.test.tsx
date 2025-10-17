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
    render(<FeaturedProducts />);
    const skeletons = screen.getAllByLabelText('Cargando...'); // Assuming Skeleton has aria-label
    expect(skeletons.length).toBe(4);
  });

  it('should fetch and display featured products correctly', async () => {
    const mockProducts = [
      { id: 'prod1', name: 'Tacos de Fuego', price: 150, description: 'Pica pero sabroso', imageUrl: '' },
      { id: 'prod2', name: 'Albóndigas Suaves', price: 120, description: 'Como las de mamá', imageUrl: '' },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProducts) });

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText('Tacos de Fuego')).toBeInTheDocument();
      expect(screen.getByText('Albóndigas Suaves')).toBeInTheDocument();
    });

    expect(screen.getByText(/ver menú completo/i)).toBeInTheDocument();
  });

  it('should display an empty state message when no products are featured', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText(/no hay productos destacados/i)).toBeInTheDocument();
    });
  });

  it('should display the empty state if the API fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<FeaturedProducts />);

    await waitFor(() => {
      expect(screen.getByText(/no hay productos destacados/i)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching latest products:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});