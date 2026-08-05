'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { PlayerProvider } from './MusicPlayer'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <PlayerProvider>
        {children}
        <Toaster
          position="top-center"
          containerStyle={{
            top: 72,
            left: 12,
            right: 12,
            bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 80px)',
          }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1A1A1A',
              color: '#fff',
              border: '1px solid rgba(201,168,76,0.3)',
              fontSize: 14,
              padding: '10px 14px',
              maxWidth: '100%',
              wordBreak: 'break-word',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0A0A0A' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0A0A0A' } },
          }}
        />
      </PlayerProvider>
    </SessionProvider>
  )
}
