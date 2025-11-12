'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  digits: number;
}

export const COUNTRIES: Country[] = [
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', digits: 10 },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', digits: 10 },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹', digits: 8 },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻', digits: 8 },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳', digits: 8 },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮', digits: 8 },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', digits: 8 },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦', digits: 8 },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', digits: 10 },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', digits: 10 },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', digits: 9 },
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪', digits: 9 },
  { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴', digits: 8 },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', digits: 9 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', digits: 10 },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾', digits: 8 },
  { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾', digits: 9 },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', digits: 11 },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸', digits: 9 },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  disabled?: boolean;
  error?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  disabled = false,
  error,
}: CountryPhoneInputProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Solo permitir números
    const cleaned = input.replace(/\D/g, '');
    // Limitar a la cantidad de dígitos del país
    const limited = cleaned.slice(0, selectedCountry.digits);
    onChange(limited);
  };

  const formatPhoneDisplay = (phone: string): string => {
    if (!phone) return '';

    // Formatear según el país
    if (selectedCountry.code === 'MX' || selectedCountry.code === 'US' || selectedCountry.code === 'CO' || selectedCountry.code === 'AR') {
      // Formato: XXX XXX XXXX
      if (phone.length <= 3) return phone;
      if (phone.length <= 6) return `${phone.slice(0, 3)} ${phone.slice(3)}`;
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    } else if (selectedCountry.code === 'BR') {
      // Formato Brasil: XX XXXXX XXXX
      if (phone.length <= 2) return phone;
      if (phone.length <= 7) return `${phone.slice(0, 2)} ${phone.slice(2)}`;
      return `${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}`;
    } else {
      // Formato genérico: XXXX XXXX
      if (phone.length <= 4) return phone;
      return `${phone.slice(0, 4)} ${phone.slice(4)}`;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-white/80">
        Número de Teléfono <span className="text-red-500">*</span>
      </Label>

      <div className="flex gap-2">
        {/* Selector de País */}
        <Select
          value={selectedCountry.code}
          onValueChange={(code) => {
            const country = COUNTRIES.find(c => c.code === code);
            if (country) {
              onCountryChange(country);
              onChange(''); // Limpiar el teléfono al cambiar de país
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.dialCode}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700 max-h-[300px]">
            {COUNTRIES.map((country) => (
              <SelectItem
                key={country.code}
                value={country.code}
                className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-sm text-gray-400">{country.dialCode}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Input de Teléfono */}
        <div className="flex-1">
          <Input
            id="phone"
            type="tel"
            value={formatPhoneDisplay(value)}
            onChange={handlePhoneChange}
            placeholder={`${selectedCountry.digits} dígitos`}
            maxLength={selectedCountry.digits + Math.floor(selectedCountry.digits / 3)} // Para espacios
            disabled={disabled}
            className={`bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 ${
              error ? 'border-red-500' : ''
            }`}
          />
        </div>
      </div>

      {/* Información y Errores */}
      <div className="space-y-1">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <p className="text-xs text-gray-400">
            {selectedCountry.name}: {selectedCountry.dialCode} + {selectedCountry.digits} dígitos
          </p>
        )}

        {value && (
          <p className="text-xs text-green-400">
            Formato E.164: {selectedCountry.dialCode}{value.replace(/\D/g, '')}
          </p>
        )}
      </div>
    </div>
  );
}
