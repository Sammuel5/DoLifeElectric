'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function LoginContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params?.get('callbackUrl') || '/'

  useEffect(() => {
    if (session) router.replace(callbackUrl)
  }, [session, router, callbackUrl])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full bg-dark-card border border-white/10 p-8 md:p-10 text-center">
        <img src="/dlelogo/dle-logo-sm.png" alt="DLE Entertainment" className="h-16 mx-auto mb-6 object-contain" />
        <h1 className="font-display text-3xl text-white uppercase mb-2">Sign In</h1>
        <p className="text-white/50 text-sm mb-8">Sign in with Google to securely send gifts and support artists.</p>
        <button onClick={() => signIn('google', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white text-dark font-semibold py-3 px-6 hover:bg-white/90 transition-colors">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 18.9 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.6 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </button>
        <p className="text-white/40 text-xs mt-6">By signing in, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-white/50">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
