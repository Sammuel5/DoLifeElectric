// This file runs FIRST on server startup (before any routes or DB code).
// We apply the Windows DNS fix here so that every connection uses the OS resolver.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('./dns-fix')
      // eslint-disable-next-line no-console
      console.log('🔧 DNS compatibility patch applied (Windows DoH/VPN/antivirus friendly)')
    } catch (e) {
      console.warn('DNS patch failed to load:', e.message)
    }
  }
}
