import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CloutNest - Coding Tracker for Vibe Coders Journey',
  description: 'Track your coding journey, share your progress, and compete with other developers in style. The ultimate companion for Vibe Code Journey developers.',
  keywords: ['coding tracker', 'build in public', 'developer tools', 'github integration', 'coding stats'],
  authors: [{ name: 'CloutNest Team' }],
  creator: 'CloutNest',
  metadataBase: new URL('https://cloutnest.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cloutnest.com',
    title: 'CloutNest - Coding Tracker',
    description: 'Level up your Vibe Code Journey with automated tracking, quirky tweets, and epic achievements.',
    siteName: 'CloutNest',
    images: [
      {
        url: '/homepage.png',
        width: 1200,
        height: 630,
        alt: 'CloutNest - Coding Tracker for Developers',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CloutNest - Coding Tracker',
    description: 'Level up your Vibe Code Journey with automated tracking, quirky tweets, and epic achievements.',
    creator: '@neburamsiah',
    images: ['/homepage.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#ffffff',
  applicationName: 'CloutNest',
  appleWebApp: {
    capable: true,
    title: 'CloutNest',
    statusBarStyle: 'black-translucent',
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
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}