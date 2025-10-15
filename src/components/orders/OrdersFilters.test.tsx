import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersFilters } from './OrdersFilters';

describe('OrdersFilters Component', () => {
  const mockOnStatusChange = jest.fn();
  const mockOnSearchChange = jest.fn();
  const mockOnDateFilterChange = jest.fn();

  const defaultProps = {
    selectedStatus: 'all' as const,
    onStatusChange: mockOnStatusChange,
    searchTerm: '',
    onSearchChange: mockOnSearchChange,
    dateFilter: 'today' as const,
    onDateFilterChange: mockOnDateFilterChange,
    statusCounts: {
      all: 10,
      'Pedido Realizado': 2,
      'Preparando': 3,
      'En Reparto': 1,
      'Entregado': 4,
      'Cancelado': 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all status filter pills with counts', () => {
    render(<OrdersFilters {...defaultProps} />);
    
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    
    expect(screen.getByText('Recibido')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Preparando')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should call onStatusChange when a status pill is clicked', () => {
    render(<OrdersFilters {...defaultProps} />);
    
    const preparandoButton = screen.getByText('Preparando');
    fireEvent.click(preparandoButton);
    
    expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
    expect(mockOnStatusChange).toHaveBeenCalledWith('Preparando');
  });

  it('should call onSearchChange when typing in the search input', () => {
    render(<OrdersFilters {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Buscar por ID, cliente o dirección.../i);
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith('test search');
  });

  it('should call onDateFilterChange when a new date filter is selected', () => {
    render(<OrdersFilters {...defaultProps} />);
    
    // Abrir el selector
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.pointerDown(selectTrigger);

    // Seleccionar una nueva opción (getByText funciona para las opciones del Select de Radix)
    const weekOption = screen.getByText('Última Semana');
    fireEvent.click(weekOption);

    expect(mockOnDateFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnDateFilterChange).toHaveBeenCalledWith('week');
  });

  it('should highlight the selected status pill', () => {
    render(<OrdersFilters {...defaultProps} selectedStatus="Preparando" />);
    
    const preparandoButton = screen.getByText('Preparando').closest('button');
    // La clase 'ring-2' se usa para resaltar el botón seleccionado
    expect(preparandoButton).toHaveClass('ring-2');

    const todosButton = screen.getByText('Todos').closest('button');
    expect(todosButton).not.toHaveClass('ring-2');
  });
});
