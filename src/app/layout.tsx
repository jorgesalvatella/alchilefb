import { Roboto as FontSans } from "next/font/google"
import './globals.css'

import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { FirebaseProvider } from '@/firebase/provider'
import { FirebaseClientProvider } from '@/firebase/client-provider'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import FirebaseErrorListener from '@/components/FirebaseErrorListener'

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <FirebaseClientProvider>
          <div className="relative flex min-h-dvh flex-col">
            <Header />
            <main className="flex-1 pt-24">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
