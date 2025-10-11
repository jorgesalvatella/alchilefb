// Polyfill fetch for Node.js environment
import 'whatwg-fetch';

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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
