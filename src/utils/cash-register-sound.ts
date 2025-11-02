/**
 * Genera y reproduce un sonido de caja registradora sintético usando Web Audio API.
 * Sonido tipo "cha-ching" con dos tonos: uno agudo al inicio y uno más grave al final.
 */
export function playCashRegisterSound() {
  try {
    // Verificar si el navegador soporta Web Audio API
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContext) {
      console.warn('Web Audio API no soportada en este navegador');
      return;
    }

    const audioContext = new AudioContext();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.3; // Volumen moderado (30%)

    const now = audioContext.currentTime;

    // Primer tono: "Cha" - Sonido agudo y brillante
    const oscillator1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(1200, now); // Frecuencia alta
    oscillator1.frequency.exponentialRampToValueAtTime(800, now + 0.1); // Descenso rápido

    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator1.connect(gain1);
    gain1.connect(masterGain);

    oscillator1.start(now);
    oscillator1.stop(now + 0.15);

    // Segundo tono: "Ching" - Sonido metálico resonante
    const oscillator2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();

    oscillator2.type = 'triangle'; // Sonido más metálico
    oscillator2.frequency.setValueAtTime(2000, now + 0.08); // Más agudo, con delay
    oscillator2.frequency.exponentialRampToValueAtTime(1500, now + 0.3);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.12); // Ataque rápido
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5); // Decay largo

    oscillator2.connect(gain2);
    gain2.connect(masterGain);

    oscillator2.start(now + 0.08);
    oscillator2.stop(now + 0.5);

    // Tercer tono: Sonido de campana/resonancia
    const oscillator3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();

    oscillator3.type = 'sine';
    oscillator3.frequency.setValueAtTime(3000, now + 0.1);
    oscillator3.frequency.exponentialRampToValueAtTime(2500, now + 0.4);

    gain3.gain.setValueAtTime(0, now + 0.1);
    gain3.gain.linearRampToValueAtTime(0.2, now + 0.12);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    oscillator3.connect(gain3);
    gain3.connect(masterGain);

    oscillator3.start(now + 0.1);
    oscillator3.stop(now + 0.4);

    // Cleanup: cerrar el contexto después de que termine el sonido
    setTimeout(() => {
      audioContext.close();
    }, 1000);

  } catch (error) {
    console.error('Error al reproducir sonido de caja registradora:', error);
  }
}
