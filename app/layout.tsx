import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PulseCode - Gamified Coding Tracker for #buildinpublic',
  description: 'Track your coding journey, share your progress, and compete with other developers in style. The ultimate companion for #buildinpublic developers.',
  keywords: ['coding tracker', 'build in public', 'developer tools', 'github integration', 'coding stats'],
  openGraph: {
    title: 'PulseCode - Gamified Coding Tracker',
    description: 'Level up your #buildinpublic journey with automated tracking, quirky tweets, and epic achievements.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PulseCode - Gamified Coding Tracker',
    description: 'Level up your #buildinpublic journey with automated tracking, quirky tweets, and epic achievements.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="star-field" />
          <main className="relative z-10">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}