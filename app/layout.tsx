import './globals.css';
import type { Metadata } from 'next';
import { Montserrat as FontSans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth-provider';
import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: 'CloutNest | Developer Stats Dashboard',
    template: '%s | CloutNest'
  },
  description: 'CloutNest helps developers track their coding journey, view coding streaks, and visualize their GitHub activity',
  keywords: ['coding stats', 'github analytics', 'developer metrics', 'code tracking', 'programming dashboard'],
  authors: [{ name: 'CloutNest Team' }],
  creator: 'CloutNest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cloutnest.dev',
    title: 'CloutNest | Developer Stats Dashboard',
    description: 'Track your coding journey and showcase your developer achievements',
    siteName: 'CloutNest',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'CloutNest Dashboard Preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CloutNest | Developer Stats Dashboard',
    description: 'Track your coding journey and showcase your developer achievements',
    images: ['/twitter-image.png']
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'manifest', url: '/site.webmanifest' }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add theme color for mobile browsers */}
        <meta name="theme-color" content="#000000" />
        {/* Add viewport for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://cloutnest.dev" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
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
  )
}