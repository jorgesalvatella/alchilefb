// Polyfill fetch for Node.js environment
import 'whatwg-fetch';

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock lucide-react to prevent ESM parsing errors.
// We provide simple mock components for each icon used.
jest.mock('lucide-react', () => ({
  PlusCircle: () => <span data-testid="plus-circle-icon" />,
  Pen: () => <span data-testid="pen-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  FolderKanban: () => <span data-testid="folder-icon" />,
  X: () => <span data-testid="x-icon" />,
  Link2: () => <span data-testid="link2-icon" />, // Añadido para la página de conceptos
}));
