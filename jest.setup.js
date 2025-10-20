// Polyfill fetch for Node.js environment
import 'whatwg-fetch';

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock PointerEvent for Radix UI components
class MockPointerEvent extends Event {
  button;
  ctrlKey;
  pointerType;

  constructor(type, props) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
window.PointerEvent = MockPointerEvent;

// Polyfill for Pointer Events API used by Radix UI in JSDOM
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  window.HTMLElement.prototype.setPointerCapture = jest.fn();
}

// Polyfill for scrollIntoView used by Radix UI in JSDOM
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}

// Polyfill for matchMedia used by Radix UI and other libraries in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de @radix-ui/react-focus-scope para evitar bucles de foco infinitos en JSDOM
// Este es el mock más importante para resolver el problema de "Maximum call stack size exceeded"
jest.mock('@radix-ui/react-focus-scope', () => {
  const actual = jest.requireActual('@radix-ui/react-focus-scope');
  return {
    ...actual,
    FocusScope: ({ children }) => children,
  };
});

// Mock de @radix-ui/react-portal para que renderice inline en lugar de usar portales
// Esto es necesario para que las opciones del Select sean accesibles en las pruebas
jest.mock('@radix-ui/react-portal', () => {
  const actual = jest.requireActual('@radix-ui/react-portal');
  return {
    ...actual,
    Portal: ({ children }) => children,
  };
});

// Mock de @radix-ui/react-portal para que renderice inline en lugar de usar portales
// Esto es necesario para que las opciones del Select sean accesibles en las pruebas
jest.mock('@radix-ui/react-portal', () => {
  const actual = jest.requireActual('@radix-ui/react-portal');
  return {
    ...actual,
    Portal: ({ children }) => children,
  };
});

// Mock genérico para lucide-react que captura CUALQUIER ícono
jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        // Ignorar propiedades especiales de módulos
        if (prop === '__esModule') return true;
        if (prop === 'default') return undefined;

        // Para cualquier otra propiedad (nombre de ícono), devolver un componente mock
        // eslint-disable-next-line react/display-name
        return (props) => {
          const iconName = String(prop)
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .substring(1);
          return <span data-testid={`${iconName}-icon`} {...props} />;
        };
      },
    }
  );
});

// Mock global para next/navigation (useRouter, usePathname, useSearchParams)
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  })),
  useParams: jest.fn(() => ({})),
}));

// Mock global para el Firebase provider (useUser, useAuth, etc)
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(() => ({
    user: null,
    isUserLoading: false,
  })),
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
  })),
  useFirestore: jest.fn(() => ({
    db: {},
  })),
}));

// Mock también para @/firebase por si se importa directamente
jest.mock('@/firebase', () => ({
  useUser: jest.fn(() => ({
    user: null,
    isUserLoading: false,
  })),
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
  })),
}));
