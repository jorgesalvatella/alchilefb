interface VerificationCodeDisplayProps {
  code: string;
}

export default function VerificationCodeDisplay({ code }: VerificationCodeDisplayProps) {
  // Separar el código en dígitos individuales
  const digits = code.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <div className="mb-8">
      <p className="text-white/60 text-sm mb-3 text-center">
        Tu código de verificación:
      </p>
      <div className="flex justify-center gap-2 md:gap-3">
        {digits.map((digit, index) => (
          <div
            key={index}
            className="w-12 h-16 md:w-14 md:h-18 bg-gradient-to-br from-orange-500/20 to-red-600/20 border-2 border-orange-500/50 rounded-lg flex items-center justify-center backdrop-blur-sm"
          >
            <span className="text-3xl md:text-4xl font-bold text-white">
              {digit !== ' ' ? digit : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
