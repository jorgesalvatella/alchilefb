import { render, screen } from '@testing-library/react';
import { DriverStats } from '../DriverStats';
import { Order } from '@/lib/types';

describe('DriverStats Component', () => {
  const createMockOrder = (id: string, status: Order['status'], createdAt: Date): Order => ({
    id,
    userId: 'user123',
    items: [],
    totalVerified: 100,
    total: 100,
    paymentMethod: 'Efectivo',
    status,
    createdAt,
    shippingAddress: 'whatsapp',
  });

  it('should render all three stat cards', () => {
    const orders: Order[] = [];
    render(<DriverStats orders={orders} />);

    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('En Camino')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('should count pending orders correctly', () => {
    const orders: Order[] = [
      createMockOrder('1', 'Preparando', new Date()),
      createMockOrder('2', 'Preparando', new Date()),
      createMockOrder('3', 'En Reparto', new Date()),
    ];

    render(<DriverStats orders={orders} />);

    const pendingCards = screen.getAllByText('2');
    expect(pendingCards.length).toBeGreaterThan(0);
  });

  it('should count in-progress orders correctly', () => {
    const orders: Order[] = [
      createMockOrder('1', 'Preparando', new Date()),
      createMockOrder('2', 'En Reparto', new Date()),
      createMockOrder('3', 'En Reparto', new Date()),
    ];

    render(<DriverStats orders={orders} />);

    const inProgressCards = screen.getAllByText('2');
    expect(inProgressCards.length).toBeGreaterThan(0);
  });

  it('should count completed orders from today only', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const orders: Order[] = [
      createMockOrder('1', 'Entregado', today),
      createMockOrder('2', 'Entregado', today),
      createMockOrder('3', 'Entregado', yesterday),
    ];

    render(<DriverStats orders={orders} />);

    // Should show 2, not 3 (yesterday's order excluded)
    const completedCards = screen.getAllByText('2');
    expect(completedCards.length).toBeGreaterThan(0);
  });

  it('should show 0 when no orders exist', () => {
    const orders: Order[] = [];
    render(<DriverStats orders={orders} />);

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(3); // All three cards should show 0
  });

  it('should apply correct styling for pending orders (blue)', () => {
    const orders: Order[] = [createMockOrder('1', 'Preparando', new Date())];
    const { container } = render(<DriverStats orders={orders} />);

    const pendingCard = container.querySelector('.bg-blue-50');
    expect(pendingCard).toBeInTheDocument();
  });

  it('should apply correct styling for in-progress orders (green)', () => {
    const orders: Order[] = [createMockOrder('1', 'En Reparto', new Date())];
    const { container } = render(<DriverStats orders={orders} />);

    const inProgressCard = container.querySelector('.bg-green-50');
    expect(inProgressCard).toBeInTheDocument();
  });

  it('should apply correct styling for completed orders (gray)', () => {
    const orders: Order[] = [createMockOrder('1', 'Entregado', new Date())];
    const { container } = render(<DriverStats orders={orders} />);

    const completedCard = container.querySelector('.bg-gray-50');
    expect(completedCard).toBeInTheDocument();
  });

  it('should handle mixed order statuses correctly', () => {
    const today = new Date();
    const orders: Order[] = [
      createMockOrder('1', 'Preparando', today),
      createMockOrder('2', 'Preparando', today),
      createMockOrder('3', 'En Reparto', today),
      createMockOrder('4', 'En Reparto', today),
      createMockOrder('5', 'En Reparto', today),
      createMockOrder('6', 'Entregado', today),
      createMockOrder('7', 'Entregado', today),
      createMockOrder('8', 'Entregado', today),
      createMockOrder('9', 'Entregado', today),
    ];

    render(<DriverStats orders={orders} />);

    // Pending: 2
    const pending = screen.getAllByText('2');
    expect(pending.length).toBeGreaterThan(0);

    // In Progress: 3
    const inProgress = screen.getAllByText('3');
    expect(inProgress.length).toBeGreaterThan(0);

    // Completed Today: 4
    const completed = screen.getAllByText('4');
    expect(completed.length).toBeGreaterThan(0);
  });

  it('should not count "Pedido Realizado" as pending', () => {
    const orders: Order[] = [
      createMockOrder('1', 'Pedido Realizado', new Date()),
      createMockOrder('2', 'Preparando', new Date()),
    ];

    render(<DriverStats orders={orders} />);

    // Only "Preparando" should be counted, not "Pedido Realizado"
    const pendingCards = screen.getAllByText('1');
    expect(pendingCards.length).toBeGreaterThan(0);
  });

  it('should not count "Cancelado" in any category', () => {
    const orders: Order[] = [
      createMockOrder('1', 'Cancelado', new Date()),
      createMockOrder('2', 'Preparando', new Date()),
    ];

    render(<DriverStats orders={orders} />);

    // Pending: 1 (only "Preparando")
    const pendingCards = screen.getAllByText('1');
    expect(pendingCards.length).toBeGreaterThan(0);

    // Completed: 0 (canceled doesn't count)
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});
