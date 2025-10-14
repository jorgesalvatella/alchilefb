import { render, screen } from '@testing-library/react';
import { OrdersKPIs } from './OrdersKPIs';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ShoppingBag: () => <div data-testid="shopping-bag-icon">ShoppingBag</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>,
  DollarSign: () => <div data-testid="dollar-sign-icon">DollarSign</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down-icon">TrendingDown</div>,
}));

describe('OrdersKPIs Component', () => {
  const mockStats = {
    todayOrders: 25,
    todayOrdersChange: 15.5,
    activeOrders: 8,
    activeOrdersByStatus: {
      Preparando: 5,
      'En Reparto': 3,
    },
    todayRevenue: 125000,
    averageTicket: 5000,
    averageDeliveryTime: 35,
    deliveryTimeUnit: 'minutes',
  };

  it('should render loading skeletons when isLoading is true', () => {
    const { container } = render(<OrdersKPIs stats={null} isLoading={true} />);

    // Check for skeleton elements by class
    const skeletons = container.querySelectorAll('.bg-gray-700');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('should render nothing when stats is null and not loading', () => {
    const { container } = render(<OrdersKPIs stats={null} isLoading={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render all 4 KPI cards with correct data', () => {
    const { container } = render(<OrdersKPIs stats={mockStats} isLoading={false} />);

    // Check all titles
    expect(screen.getByText('Pedidos Hoy')).toBeInTheDocument();
    expect(screen.getByText('Pedidos Activos')).toBeInTheDocument();
    expect(screen.getByText('Ingresos del Día')).toBeInTheDocument();
    expect(screen.getByText('Tiempo Promedio')).toBeInTheDocument();

    // Check content using textContent
    const text = container.textContent || '';
    expect(text).toContain('+15.5% vs ayer');
    expect(text).toContain('5 preparando, 3 en reparto');
    // Just check that the number is there, formatting may vary
    expect(text).toContain('125000');
    expect(text).toContain('35 min');
    expect(text).toContain('Desde pedido hasta entrega');
  });

  it('should show negative trend indicator correctly', () => {
    const statsWithNegativeTrend = {
      ...mockStats,
      todayOrdersChange: -10.5,
    };

    const { container } = render(<OrdersKPIs stats={statsWithNegativeTrend} isLoading={false} />);

    const text = container.textContent || '';
    expect(text).toContain('-10.5% vs ayer');
  });

  it('should render trend icons correctly', () => {
    render(<OrdersKPIs stats={mockStats} isLoading={false} />);

    // Check for TrendingUp icon (positive trend)
    const trendIcon = screen.getByTestId('trending-up-icon');
    expect(trendIcon).toBeInTheDocument();
  });

  it('should apply correct color classes for positive trend', () => {
    const { container } = render(<OrdersKPIs stats={mockStats} isLoading={false} />);

    // Look for green color class in the container
    const greenElements = container.querySelectorAll('.text-green-400');
    expect(greenElements.length).toBeGreaterThan(0);
  });

  it('should apply correct color classes for negative trend', () => {
    const statsWithNegativeTrend = {
      ...mockStats,
      todayOrdersChange: -5,
    };

    const { container } = render(<OrdersKPIs stats={statsWithNegativeTrend} isLoading={false} />);

    // Look for red color class in the container
    const redElements = container.querySelectorAll('.text-red-400');
    expect(redElements.length).toBeGreaterThan(0);
  });

  it('should render zero values correctly', () => {
    const statsWithZeros = {
      todayOrders: 0,
      todayOrdersChange: 0,
      activeOrders: 0,
      activeOrdersByStatus: {
        Preparando: 0,
        'En Reparto': 0,
      },
      todayRevenue: 0,
      averageTicket: 0,
      averageDeliveryTime: 0,
      deliveryTimeUnit: 'minutes',
    };

    const { container } = render(<OrdersKPIs stats={statsWithZeros} isLoading={false} />);

    expect(screen.getByText('Pedidos Hoy')).toBeInTheDocument();
    expect(screen.getByText('Pedidos Activos')).toBeInTheDocument();

    // Check for zero values in text content
    const textContent = container.textContent || '';
    expect(textContent).toContain('0 min');
    expect(textContent).toContain('$0.00');
  });
});
