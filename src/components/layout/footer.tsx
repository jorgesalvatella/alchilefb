import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-dark-charcoal text-light-gray pb-6">
      <div className="container mx-auto px-6 text-center">
        <div className="flex justify-center gap-4 mb-4 text-sm">
            <Link href="/terminos-y-condiciones" className="hover:text-white transition-colors">Términos y Condiciones</Link>
            <span className="text-gray-500">|</span>
            <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
        </div>
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Al Chile Meatballs. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
