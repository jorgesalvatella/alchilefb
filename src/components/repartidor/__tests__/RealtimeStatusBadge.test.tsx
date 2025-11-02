import { render, screen } from '@testing-library/react';
import { RealtimeStatusBadge } from '../RealtimeStatusBadge';

describe('RealtimeStatusBadge', () => {
  it('should render "CONECTANDO..." when loading is true', () => {
    render(<RealtimeStatusBadge loading={true} error={null} />);

    expect(screen.getByText(/CONECTANDO.../i)).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('should have pulse animation when loading', () => {
    const { container } = render(<RealtimeStatusBadge loading={true} error={null} />);

    const badge = container.querySelector('.animate-pulse');
    expect(badge).toBeInTheDocument();
  });

  it('should render "DESCONECTADO" when there is an error', () => {
    render(<RealtimeStatusBadge loading={false} error="Connection failed" />);

    expect(screen.getByText(/DESCONECTADO/i)).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('should have red styling when there is an error', () => {
    const { container } = render(<RealtimeStatusBadge loading={false} error="Connection failed" />);

    const badge = container.querySelector('.text-red-500');
    expect(badge).toBeInTheDocument();
  });

  it('should render "EN VIVO" when connected (not loading and no error)', () => {
    render(<RealtimeStatusBadge loading={false} error={null} />);

    expect(screen.getByText(/EN VIVO/i)).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should have green styling when connected', () => {
    const { container } = render(<RealtimeStatusBadge loading={false} error={null} />);

    const badge = container.querySelector('.text-green-500');
    expect(badge).toBeInTheDocument();
  });

  it('should not have pulse animation when connected', () => {
    const { container } = render(<RealtimeStatusBadge loading={false} error={null} />);

    const badge = container.querySelector('.animate-pulse');
    expect(badge).not.toBeInTheDocument();
  });

  it('should prioritize loading state over error state', () => {
    render(<RealtimeStatusBadge loading={true} error="Some error" />);

    // Should show loading, not error
    expect(screen.getByText(/CONECTANDO.../i)).toBeInTheDocument();
    expect(screen.queryByText(/DESCONECTADO/i)).not.toBeInTheDocument();
  });
});
