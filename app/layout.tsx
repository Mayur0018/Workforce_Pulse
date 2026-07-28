import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '../components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Workforce Pulse — Analytics Dashboard',
  description: 'Real-time workforce analytics: automation opportunities, recoverable hours, cost insights, and anomaly detection from your employee activity data.',
  keywords: ['workforce analytics', 'automation', 'HR analytics', 'employee productivity'],
  openGraph: {
    title: 'Workforce Pulse — Analytics Dashboard',
    description: 'Workforce analytics SaaS with automation scoring, anomaly detection, and AI-powered insights.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
