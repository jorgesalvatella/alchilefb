import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-black text-light-gray py-6">
      <div className="container mx-auto px-6 text-center">
        <div className="flex justify-center gap-4 mb-4 text-sm">
            <Link href="/terminos-y-condiciones" className="text-gray-400 hover:text-white transition-colors">Términos y Condiciones</Link>
            <span className="text-gray-600">|</span>
            <Link href="/politica-privacidad" className="text-gray-400 hover:text-white transition-colors">Política de Privacidad</Link>
        </div>
        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Al Chile Meatballs. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
