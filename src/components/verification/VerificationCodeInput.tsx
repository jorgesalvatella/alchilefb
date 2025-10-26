'use client';

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface VerificationCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Separar el código en 6 dígitos
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (index: number, newValue: string) => {
    // Solo aceptar números
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    // Actualizar el dígito en la posición
    const newDigits = [...digits];
    newDigits[index] = newValue;
    const newCode = newDigits.join('').trim();
    onChange(newCode);

    // Auto-focus al siguiente input si se escribió un dígito
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: si el input está vacío, retroceder al anterior
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();

    // Validar que solo contenga números y tenga máximo 6 dígitos
    if (/^\d{1,6}$/.test(pastedText)) {
      onChange(pastedText);

      // Focus al último dígito pegado o al último input
      const targetIndex = Math.min(pastedText.length - 1, 5);
      setTimeout(() => {
        inputRefs.current[targetIndex]?.focus();
      }, 0);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      backgroundColor: 'rgba(249, 115, 22, 0.2)',
      borderRadius: '12px'
    }}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="0"
          autoComplete="off"
          style={{
            width: '50px',
            height: '60px',
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#ea580c',
            color: 'white',
            border: '4px solid white',
            borderRadius: '8px',
            outline: 'none',
            opacity: disabled ? '0.5' : '1',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />
      ))}
    </div>
  );
}
