import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from './page';

// Mock de next/link
jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

// Mock del módulo de imágenes placeholder
jest.mock('@/lib/placeholder-images', () => ({
  PlaceHolderImages: {
    getRandomImage: () => ({ imageUrl: 'https://via.placeholder.com/150' }),
  },
}));

// Mock para el componente Image de Next.js
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));


describe('CartPage', () => {
  it('should render empty cart message when there are no items', () => {
    // Espiar y mockear useState para devolver un carrito vacío
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [[], jest.fn()]);
    render(<CartPage />);
    
    expect(screen.getByText('Tu Carrito está Vacío')).toBeInTheDocument();
    expect(screen.getByText('Ir al Menú')).toBeInTheDocument();
  });

  it('should render cart items and summary correctly', () => {
    render(<CartPage />);

    // Encontrar la fila del Taco de Pastor
    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    expect(within(tacoRow).getByDisplayValue('2')).toBeInTheDocument();
    expect(within(tacoRow).getByText('$25.00')).toBeInTheDocument(); // Precio unitario
    expect(within(tacoRow).getByText('$50.00')).toBeInTheDocument(); // Total línea

    // Encontrar la fila del Agua de Horchata
    const horchataRow = screen.getByText('Agua de Horchata').closest('div.flex');
    expect(within(horchataRow).getByDisplayValue('1')).toBeInTheDocument();
    expect(within(horchataRow).getAllByText('$20.00').length).toBe(2); // Unitario y total son iguales

    // Encontrar la tarjeta de resumen
    const summaryCard = screen.getByText('Total del Pedido').closest('div.rounded-lg');
    // Subtotal: (25 * 2) + (20 * 1) = 50 + 20 = $70.00
    // El componente actualmente NO calcula IVA (línea 56: const total = subtotal)
    // Como subtotal y total son iguales, habrá 2 instancias de $70.00
    expect(within(summaryCard).getAllByText('$70.00').length).toBe(2);
  });

  it('should update totals when quantity is increased', async () => {
    render(<CartPage />);

    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    const plusButton = within(tacoRow).getByTestId('plus-circle-icon');

    fireEvent.click(plusButton);

    await waitFor(() => {
      // Verificar la fila del producto
      expect(within(tacoRow).getByDisplayValue('3')).toBeInTheDocument();
      expect(within(tacoRow).getByText('$75.00')).toBeInTheDocument();

      // Verificar el resumen
      // Nuevo subtotal: (25 * 3) + (20 * 1) = 75 + 20 = $95.00
      // Como subtotal y total son iguales, habrá 2 instancias de $95.00
      const summaryCard = screen.getByText('Total del Pedido').closest('div.rounded-lg');
      expect(within(summaryCard).getAllByText('$95.00').length).toBe(2);
    });
  });

  it('should update totals when quantity is decreased', async () => {
    render(<CartPage />);

    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    const minusButton = within(tacoRow).getByTestId('minus-circle-icon');

    fireEvent.click(minusButton);

    await waitFor(() => {
      // Verificar la fila del producto
      expect(within(tacoRow).getByDisplayValue('1')).toBeInTheDocument();
      // Cuando quantity es 1, el precio unitario y total son iguales: $25.00
      expect(within(tacoRow).getAllByText('$25.00').length).toBe(2);

      // Verificar el resumen
      // Nuevo subtotal: (25 * 1) + (20 * 1) = 25 + 20 = $45.00
      // Como subtotal y total son iguales, habrá 2 instancias de $45.00
      const summaryCard = screen.getByText('Total del Pedido').closest('div.rounded-lg');
      expect(within(summaryCard).getAllByText('$45.00').length).toBe(2);
    });
  });

  it('should update totals when an item is removed', async () => {
    render(<CartPage />);

    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    const trashButton = within(tacoRow).getByTestId('trash-2-icon');

    fireEvent.click(trashButton);

    await waitFor(() => {
      expect(screen.queryByText('Taco de Pastor')).not.toBeInTheDocument();

      // Verificar el resumen solo con el agua
      // Nuevo subtotal: (20 * 1) = $20.00
      // Como subtotal y total son iguales, habrá 2 instancias de $20.00
      const summaryCard = screen.getByText('Total del Pedido').closest('div.rounded-lg');
      expect(within(summaryCard).getAllByText('$20.00').length).toBe(2);
    });
  });
});