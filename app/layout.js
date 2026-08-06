import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Providers from '@/components/Providers'
import SetupBanner from '@/components/SetupBanner'
import CustomCursor from '@/components/CustomCursor'

// Fonts are loaded via the @import in globals.css (Oswald + Inter) to avoid
// a build-time fetch to Google Fonts that can fail in restricted networks.

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
    <html lang="en" className="h-full">
      <body
        className={`bg-dark text-white flex flex-col`}
        style={{ minHeight: '100dvh' }}
      >
        <Providers>
          <Navbar />
          <SetupBanner />
          <main className="flex-1 flex flex-col pt-16 safe-top">{children}</main>
          <Footer />
          <CustomCursor />
        </Providers>
      </body>
    </html>
  )
}
