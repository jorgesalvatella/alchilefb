import { playCashRegisterSound } from '../cash-register-sound';

describe('playCashRegisterSound', () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGainNode: any;

  beforeEach(() => {
    // Mock de los métodos de los nodos de audio
    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockGainNode = {
      gain: {
        value: 0,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };

    // Mock de AudioContext
    mockAudioContext = {
      currentTime: 0,
      destination: {},
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGainNode),
      close: jest.fn(),
    };

    // Mock de window.AudioContext
    (window as any).AudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should create AudioContext when called', () => {
    playCashRegisterSound();

    expect(window.AudioContext).toHaveBeenCalled();
  });

  it('should create master gain node and connect to destination', () => {
    playCashRegisterSound();

    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('should set master volume to 30%', () => {
    playCashRegisterSound();

    const masterGainCalls = mockAudioContext.createGain.mock.results;
    const masterGain = masterGainCalls[0].value;
    expect(masterGain.gain.value).toBe(0.3);
  });

  it('should create three oscillators for the sound', () => {
    playCashRegisterSound();

    // Debe crear 3 osciladores (uno por cada tono del sonido)
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);
  });

  it('should configure first oscillator (high "cha" sound)', () => {
    playCashRegisterSound();

    const firstOscillator = mockAudioContext.createOscillator.mock.results[0].value;

    expect(firstOscillator.type).toBe('sine');
    expect(firstOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1200, 0);
    expect(firstOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(800, 0.1);
    expect(firstOscillator.start).toHaveBeenCalledWith(0);
    expect(firstOscillator.stop).toHaveBeenCalledWith(0.15);
  });

  it('should configure second oscillator (metallic "ching" sound)', () => {
    playCashRegisterSound();

    const secondOscillator = mockAudioContext.createOscillator.mock.results[1].value;

    expect(secondOscillator.type).toBe('triangle');
    expect(secondOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(2000, 0.08);
    expect(secondOscillator.start).toHaveBeenCalledWith(0.08);
    expect(secondOscillator.stop).toHaveBeenCalledWith(0.5);
  });

  it('should configure third oscillator (bell resonance)', () => {
    playCashRegisterSound();

    const thirdOscillator = mockAudioContext.createOscillator.mock.results[2].value;

    expect(thirdOscillator.type).toBe('sine');
    expect(thirdOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(3000, 0.1);
    expect(thirdOscillator.start).toHaveBeenCalledWith(0.1);
    expect(thirdOscillator.stop).toHaveBeenCalledWith(0.4);
  });

  it('should connect all oscillators to gain nodes', () => {
    playCashRegisterSound();

    const oscillators = mockAudioContext.createOscillator.mock.results.map((r: any) => r.value);

    oscillators.forEach((osc: any) => {
      expect(osc.connect).toHaveBeenCalled();
    });
  });

  it('should close audio context after 1 second', () => {
    jest.useFakeTimers();
    playCashRegisterSound();

    expect(mockAudioContext.close).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(mockAudioContext.close).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should handle error gracefully when AudioContext is not supported', () => {
    // Remover AudioContext del window
    const originalAudioContext = (window as any).AudioContext;
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // No debe lanzar error
    expect(() => playCashRegisterSound()).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalledWith('Web Audio API no soportada en este navegador');

    consoleWarnSpy.mockRestore();
    (window as any).AudioContext = originalAudioContext;
  });

  it('should handle errors during sound generation', () => {
    // Hacer que createOscillator lance error
    mockAudioContext.createOscillator = jest.fn(() => {
      throw new Error('Test error');
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // No debe lanzar error
    expect(() => playCashRegisterSound()).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error al reproducir sonido de caja registradora:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should use webkitAudioContext as fallback', () => {
    // Remover AudioContext estándar
    delete (window as any).AudioContext;

    // Agregar webkitAudioContext
    (window as any).webkitAudioContext = jest.fn(() => mockAudioContext);

    playCashRegisterSound();

    expect((window as any).webkitAudioContext).toHaveBeenCalled();
  });
});
