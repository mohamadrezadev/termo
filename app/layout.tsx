import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import ThemeProvider to avoid SSR issues
const ThemeProvider = dynamic(
  () => import('@/components/theme-provider').then((mod) => ({ default: mod.ThemeProvider })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Thermal Analyzer Pro - Advanced Thermal Image Analysis',
  description: 'Professional thermal imaging analysis application with advanced measurement tools and bilingual support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}