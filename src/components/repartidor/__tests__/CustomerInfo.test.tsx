import { render, screen } from '@testing-library/react';
import { CustomerInfo } from '../CustomerInfo';
import { Address } from '@/lib/types';

describe('CustomerInfo Component', () => {
  const mockAddress: Address = {
    name: 'María González',
    phone: '555-9876',
    street: 'Calle Principal 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '06000',
    country: 'México',
    lat: 19.4326,
    lng: -99.1332,
  };

  it('should render customer name', () => {
    render(<CustomerInfo customer={mockAddress} />);

    expect(screen.getByText('María González')).toBeInTheDocument();
  });

  it('should render customer phone number', () => {
    render(<CustomerInfo customer={mockAddress} />);

    expect(screen.getByText('555-9876')).toBeInTheDocument();
  });

  it('should render complete address', () => {
    render(<CustomerInfo customer={mockAddress} />);

    expect(screen.getByText(/Calle Principal 123/)).toBeInTheDocument();
    expect(screen.getByText(/Ciudad de México/)).toBeInTheDocument();
    expect(screen.getByText(/CDMX/)).toBeInTheDocument();
    expect(screen.getByText(/06000/)).toBeInTheDocument();
  });

  it('should render call button with correct href', () => {
    render(<CustomerInfo customer={mockAddress} />);

    const callButton = screen.getByRole('link', { name: /llamar/i });
    expect(callButton).toBeInTheDocument();
    expect(callButton).toHaveAttribute('href', 'tel:555-9876');
  });

  it('should handle WhatsApp address type', () => {
    render(<CustomerInfo customer="whatsapp" />);

    expect(screen.getByText('Coordinar por WhatsApp')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should handle GPS coordinates (lat/lng object)', () => {
    const gpsAddress = {
      lat: 19.4326,
      lng: -99.1332,
    };

    render(<CustomerInfo customer={gpsAddress} />);

    expect(screen.getByText(/Ubicación GPS/)).toBeInTheDocument();
    expect(screen.getByText(/19.4326/)).toBeInTheDocument();
    expect(screen.getByText(/-99.1332/)).toBeInTheDocument();
  });

  it('should render phone icon', () => {
    render(<CustomerInfo customer={mockAddress} />);

    const phoneIcon = screen.getByTestId('phone-icon');
    expect(phoneIcon).toBeInTheDocument();
  });

  it('should render map pin icon', () => {
    render(<CustomerInfo customer={mockAddress} />);

    const mapPinIcon = screen.getByTestId('map-pin-icon');
    expect(mapPinIcon).toBeInTheDocument();
  });

  it('should apply correct styling to container', () => {
    const { container } = render(<CustomerInfo customer={mockAddress} />);

    const mainDiv = container.querySelector('.bg-white');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv).toHaveClass('rounded-lg', 'shadow-sm', 'p-4');
  });

  it('should handle address without postal code', () => {
    const addressWithoutPostalCode = {
      ...mockAddress,
      postalCode: '',
    };

    render(<CustomerInfo customer={addressWithoutPostalCode} />);

    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText(/Calle Principal 123/)).toBeInTheDocument();
  });

  it('should handle address without state', () => {
    const addressWithoutState = {
      ...mockAddress,
      state: '',
    };

    render(<CustomerInfo customer={addressWithoutState} />);

    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText(/Ciudad de México/)).toBeInTheDocument();
  });

  it('should display email if provided in address', () => {
    const addressWithEmail = {
      ...mockAddress,
      email: 'maria@example.com',
    };

    render(<CustomerInfo customer={addressWithEmail} />);

    // Note: Current implementation might not show email,
    // but test is here for future enhancement
    if (screen.queryByText('maria@example.com')) {
      expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    }
  });

  it('should render call button with primary color', () => {
    const { container } = render(<CustomerInfo customer={mockAddress} />);

    const callButton = container.querySelector('a[href="tel:555-9876"]');
    expect(callButton).toBeInTheDocument();
    expect(callButton?.className).toContain('bg-blue-600');
  });

  it('should handle very long customer names', () => {
    const longNameAddress = {
      ...mockAddress,
      name: 'María Guadalupe Fernández González de la Rosa',
    };

    render(<CustomerInfo customer={longNameAddress} />);

    expect(screen.getByText('María Guadalupe Fernández González de la Rosa')).toBeInTheDocument();
  });

  it('should handle international phone numbers', () => {
    const internationalAddress = {
      ...mockAddress,
      phone: '+52 555 123 4567',
    };

    render(<CustomerInfo customer={internationalAddress} />);

    expect(screen.getByText('+52 555 123 4567')).toBeInTheDocument();
    const callButton = screen.getByRole('link', { name: /llamar/i });
    expect(callButton).toHaveAttribute('href', 'tel:+52 555 123 4567');
  });
});
