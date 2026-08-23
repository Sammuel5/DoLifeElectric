'use client'
import { useTheme } from './ThemeProvider'

/**
 * Creative gold-accent theme toggle.
 *
 * Variants:
 * - "icon":    Desktop navbar — round glowing celestial button (moon/sun).
 * - "drawer":  Mobile drawer  — full-width row with iOS-style switch + label.
 * - "button":  Compact square/button for admin dashboard utility bars.
 * - "menu":    Desktop user/ADMIN dropdown — row item matching the other
 *              menu entries (ADMIN DASHBOARD / SIGN OUT) with icon + label
 *              + iOS switch on the right.
 */
export default function ThemeToggle({ variant = 'icon' }) {
  const { theme, toggleTheme, mounted } = useTheme()
  const isDark = !mounted ? true : theme === 'dark'

  /* ============== MENU VARIANT (desktop ADMIN/account dropdown) ============== */
  if (variant === 'menu') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); toggleTheme() }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`w-full flex items-center justify-between px-5 py-3.5 font-display uppercase tracking-[0.15em] text-base transition-colors ${
          isDark ? 'text-white hover:bg-gold/10 hover:text-gold' : 'text-[#1A1713] hover:bg-[#f5ecd4] hover:text-[#8A7530]'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="relative w-5 h-5 flex items-center justify-center">
            {/* Moon (dark mode on) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              className={`absolute transition-all duration-400 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <defs>
                <linearGradient id="mm-moon" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#E6C76A" />
                  <stop offset="100%" stopColor="#C9A84C" />
                </linearGradient>
              </defs>
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="url(#mm-moon)" />
            </svg>
            {/* Sun (light mode on) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              className={`absolute transition-all duration-400 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <defs>
                <linearGradient id="mm-sun" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#E6C76A" />
                  <stop offset="100%" stopColor="#A8893A" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="4" fill="url(#mm-sun)" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <line key={deg} x1="12" y1="2.5" x2="12" y2="5" stroke="url(#mm-sun)"
                  strokeWidth="1.8" strokeLinecap="round"
                  transform={`rotate(${deg} 12 12)`} />
              ))}
            </svg>
          </span>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </span>
        {/* iOS-style switch */}
        <span
          className="relative inline-block w-10 h-[22px] rounded-full flex-shrink-0 transition-colors duration-300"
          style={{ background: isDark ? '#141414' : 'rgba(138,117,48,0.35)' }}
        >
          <span
            className="absolute top-[3px] rounded-full transition-all duration-300"
            style={{
              width: 16,
              height: 16,
              left: isDark ? 3 : 23,
              background: isDark ? 'rgba(255,255,255,0.85)' : '#B8943F',
              boxShadow: isDark ? 'none' : '0 0 10px rgba(201,168,76,0.6)',
            }}
          />
        </span>
      </button>
    )
  }

  /* ============== BUTTON VARIANT (compact admin bar) ============== */
  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex items-center gap-2 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-widest font-semibold transition-all hover:opacity-90 active:scale-95 rounded-sm self-start sm:self-auto"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,23,19,0.05)',
          border: `1px solid ${isDark ? 'rgba(201,168,76,0.35)' : 'rgba(184,148,63,0.35)'}`,
          color: isDark ? 'var(--gold)' : '#8A7530',
        }}
      >
        <span className="relative w-[18px] h-[18px] flex items-center justify-center">
          {/* Moon */}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            className={`absolute transition-all duration-400 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="currentColor" />
          </svg>
          {/* Sun */}
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            className={`absolute transition-all duration-400 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          >
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <line key={deg} x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round"
                transform={`rotate(${deg} 12 12)`} />
            ))}
          </svg>
        </span>
        <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
      </button>
    )
  }

  /* ============== DRAWER VARIANT ============== */
  if (variant === 'drawer') {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`w-full flex items-center justify-between px-2 py-3 font-display uppercase tracking-[0.12em] text-base transition-colors ${
          isDark ? 'text-white hover:text-gold' : 'text-[#1A1713] hover:text-[#8A7530]'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="relative w-6 h-6 flex items-center justify-center">
            <DrawerIcon isDark={isDark} />
          </span>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </span>
        <span
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)' }}
        >
          <span
            className="relative inline-block w-10 h-5 rounded-full transition-colors duration-300"
            style={{ background: isDark ? '#141414' : 'rgba(138,117,48,0.3)' }}
          >
            <span
              className="absolute top-0.5 rounded-full transition-all duration-300"
              style={{
                width: 16,
                height: 16,
                left: isDark ? 2 : 22,
                background: isDark ? 'rgba(255,255,255,0.85)' : '#B8943F',
                boxShadow: isDark ? 'none' : '0 0 10px rgba(201,168,76,0.6)',
              }}
            />
          </span>
        </span>
      </button>
    )
  }

  /* ============== DESKTOP ICON VARIANT ============== */
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 overflow-hidden ml-2"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1f1f1f 0%, #0a0a0a 100%)'
          : 'linear-gradient(135deg, #fff8e7 0%, #f2e5bf 100%)',
        border: `1.5px solid ${isDark ? '#C9A84C' : '#A8893A'}`,
        boxShadow: isDark
          ? '0 0 16px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,220,140,0.15)'
          : '0 0 16px rgba(201,168,76,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Moon icon (visible in dark mode) */}
      <span
        className={`absolute transition-all duration-500 ease-out ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="moon-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E6C76A" />
              <stop offset="100%" stopColor="#C9A84C" />
            </linearGradient>
          </defs>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            fill="url(#moon-g)"
          />
        </svg>
      </span>

      {/* Sun icon (visible in light mode) */}
      <span
        className={`absolute transition-all duration-500 ease-out ${
          !isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
        }`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ animation: 'theme-sun-spin 12s linear infinite' }}
        >
          <defs>
            <linearGradient id="sun-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E6C76A" />
              <stop offset="100%" stopColor="#A8893A" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="4" fill="url(#sun-g)" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line
              key={deg}
              x1="12"
              y1="2.5"
              x2="12"
              y2="5"
              stroke="url(#sun-g)"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </svg>
      </span>

      {/* Glow halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 20px rgba(201,168,76,0.25)'
            : 'inset 0 0 20px rgba(201,168,76,0.35)',
        }}
      />
    </button>
  )
}

/* Small icon used inside drawer variant */
function DrawerIcon({ isDark }) {
  return (
    <>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`absolute transition-all duration-500 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
        }`}
      >
        <defs>
          <linearGradient id="m2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E6C76A" />
            <stop offset="100%" stopColor="#C9A84C" />
          </linearGradient>
        </defs>
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="url(#m2)" />
      </svg>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`absolute transition-all duration-500 ${
          !isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      >
        <defs>
          <linearGradient id="s2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E6C76A" />
            <stop offset="100%" stopColor="#A8893A" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="4" fill="url(#s2)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <line
            key={deg}
            x1="12"
            y1="2"
            x2="12"
            y2="4.5"
            stroke="url(#s2)"
            strokeWidth="1.8"
            strokeLinecap="round"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
      </svg>

      <style jsx>{`
        @keyframes theme-sun-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
