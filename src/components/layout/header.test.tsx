import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './header';
import { useAuth, useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCart } from '@/context/cart-context';
import { usePathname } from 'next/navigation';
import React from 'react';

// Mock de los módulos y hooks
jest.mock('@/firebase', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}));

jest.mock('@/hooks/use-logo-url', () => ({
  useLogoUrl: () => ({
    logoUrl: '/default-logo.png',
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock shadcn/ui components that use portals to render inline
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: { children: React.ReactNode;[key: string]: any }) => <div {...props}>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));


const mockUseAuth = useAuth as jest.Mock;
const mockUseUser = useUser as jest.Mock;
const mockUseIsMobile = useIsMobile as jest.Mock;
const mockUseCart = useCart as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

const mockSignOut = jest.fn();

const mockUser = {
  email: 'test@example.com',
  photoURL: 'https://example.com/avatar.png',
  getIdTokenResult: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ signOut: mockSignOut });
    mockUseCart.mockReturnValue({ itemCount: 0 });
    mockUsePathname.mockReturnValue('/');
    mockUseIsMobile.mockReturnValue(false); // Default to desktop
  });

  describe('Usuario no autenticado', () => {
    beforeEach(() => {
      mockUseUser.mockReturnValue({ user: null, userData: null, isUserLoading: false });
    });

    it('debería renderizar los enlaces de navegación base', () => {
      render(<Header />);
      expect(screen.getAllByText('Menú')[0]).toBeInTheDocument();
    });

    it('debería mostrar el botón de Ingresar', () => {
      render(<Header />);
      const loginElements = screen.getAllByText(/Perfil|Ingresar/);
      expect(loginElements.length).toBeGreaterThan(0);
    });

    it('no debería mostrar el menú de Control', () => {
      render(<Header />);
      expect(screen.queryByText('Control')).not.toBeInTheDocument();
    });
  });

  describe('Usuario autenticado (Cliente)', () => {
    beforeEach(() => {
      mockUser.getIdTokenResult.mockResolvedValue({
        claims: { admin: false, super_admin: false },
      } as any);
      mockUseUser.mockReturnValue({
        user: mockUser,
        userData: { photoURL: 'https://example.com/avatar.png', email: 'test@example.com' },
        isUserLoading: false
      });
    });

    it('debería mostrar el menú de usuario con su avatar', async () => {
      render(<Header />);
      await waitFor(() => {
        expect(screen.getAllByText('Mi Cuenta')[0]).toBeInTheDocument();
        expect(screen.getAllByText(mockUser.email)[0]).toBeInTheDocument();
        expect(screen.getAllByText('Mis Pedidos')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Cerrar Sesión')[0]).toBeInTheDocument();
      });
    });

    it('debería llamar a signOut al hacer clic en Cerrar Sesión', async () => {
        render(<Header />);
        const logoutButtons = await screen.findAllByText('Cerrar Sesión');
        fireEvent.click(logoutButtons[0].closest('div')!);
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Usuario Administrador', () => {
    beforeEach(() => {
      mockUser.getIdTokenResult.mockResolvedValue({
        claims: { admin: false, super_admin: true },
      } as any);
      mockUseUser.mockReturnValue({
        user: mockUser,
        userData: { photoURL: 'https://example.com/avatar.png', email: 'test@example.com' },
        isUserLoading: false
      });
    });

    it('debería mostrar el menú de Control', async () => {
      render(<Header />);
      const controlButtons = await screen.findAllByText('Control');
      expect(controlButtons.length).toBeGreaterThan(0);
    });

    it('debería mostrar las opciones de super_admin en el menú de Control', async () => {
        // Simular modo móvil para que el Sheet muestre todo el menú
        mockUseIsMobile.mockReturnValue(true);
        render(<Header />);

        // El menú móvil renderiza todo directamente (no necesita dropdown)
        await screen.findAllByText('Configuración Avanzada'); // Label específico de super_admin

        expect(screen.getAllByText('Catálogo de Gastos')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Productos de Venta')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Pedidos')[0]).toBeInTheDocument();
    });
  });

  describe('Carrito de Compras', () => {
    it('no debería mostrar el contador si el carrito está vacío', () => {
      mockUseUser.mockReturnValue({ user: null, userData: null, isUserLoading: false });
      mockUseCart.mockReturnValue({ itemCount: 0 });
      render(<Header />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('debería mostrar el contador con el número correcto de artículos', () => {
      mockUseUser.mockReturnValue({ user: null, userData: null, isUserLoading: false });
      mockUseCart.mockReturnValue({ itemCount: 5 });
      render(<Header />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Vista Móvil', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseUser.mockReturnValue({ user: null, userData: null, isUserLoading: false });
    });

    it('debería renderizar el contenido del menú móvil', () => {
      render(<Header />);
      expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /carrito/i }).length).toBeGreaterThan(0);
    });
  });
});
