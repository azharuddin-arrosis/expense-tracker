import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';
import { AuthGuard } from '@/components/AuthGuard';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Finance Keluarga',
  description: 'Aplikasi pencatatan pemasukan dan pengeluaran bulanan keluarga',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finance Keluarga',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#10B981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full bg-gray-50">
        <AppProvider>
          <AuthGuard>{children}</AuthGuard>
          <PwaRegister />
        </AppProvider>
      </body>
    </html>
  );
}
