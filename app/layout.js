import './globals.css'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Providers from '@/components/Providers'
import SetupBanner from '@/components/SetupBanner'
import CustomCursor from '@/components/CustomCursor'
import { ThemeProvider, themeInitScript } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'DLE Entertainment — Do Life Electric',
  description: 'Elite entertainment infrastructure for artists who choose to Do Life Electric. Stream music, support artists, and experience the vision.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://dle-entertainment.com'),
  icons: {
    icon: [
      { url: '/dlelogo/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: '/dlelogo/apple-touch-icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <head>
        {/* Runs BEFORE React hydrates — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.className} flex flex-col`}
        style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      >
        <ThemeProvider>
          <Providers>
            <Navbar />
            <SetupBanner />
            <main className="flex-1 flex flex-col safe-bottom">{children}</main>
            <Footer />
            <CustomCursor />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
