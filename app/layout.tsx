import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { ScanProvider } from '@/lib/scan-context';

export const metadata: Metadata = {
  title: 'NovaDx | AI-Powered Precision Diagnosis',
  description: 'Premium medical imaging platform for radiologists and oncologists.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ScanProvider>
          <AppShell>{children}</AppShell>
        </ScanProvider>
      </body>
    </html>
  );
}
