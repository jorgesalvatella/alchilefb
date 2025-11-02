import { Roboto } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/cart-context';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FCMProvider } from '@/components/notifications/FCMProvider';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-sans',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${roboto.variable} font-sans bg-black text-white`}
      >
        <FirebaseClientProvider>
          <CartProvider>
            <FCMProvider />
            <NotificationPermissionBanner />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <Toaster />
            <SonnerToaster position="top-right" theme="dark" richColors />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
