import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Migsak Ops', template: '%s | Migsak Ops' },
  description: 'Attendance, daily updates, tasks and team activity for Migsak.',
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: '#202124',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-sm">{children}</body>
    </html>
  );
}
