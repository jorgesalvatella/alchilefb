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
import { PWAInstaller } from '@/components/pwa/PWAInstaller';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt';
import type { Metadata, Viewport } from 'next';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Al Chile Delivery - Auténtica comida mexicana',
  description: 'The spiciest and most authentic Mexican food delivery.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Al Chile',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#C11B17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        className={`${roboto.variable} font-sans bg-black text-white`}
      >
        <FirebaseClientProvider>
          <CartProvider>
            <PWAInstaller />
            <FCMProvider />
            <NotificationPermissionBanner />
            <InstallPrompt />
            <UpdatePrompt />
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
