'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

// This runs before React hydrates to prevent a flash of wrong theme.
// It must be a tiny script injected in <head>.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('dle-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'}if(t==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light')}else{document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();`

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read from localStorage on mount
    try {
      const saved = localStorage.getItem('dle-theme')
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved)
      } else {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
        setThemeState(prefersLight ? 'light' : 'dark')
      }
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
    }
    try { localStorage.setItem('dle-theme', theme) } catch {}

    // Update theme-color meta tag for mobile browser UI
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#F7F3EB' : '#0A0A0A')
    }
  }, [theme, mounted])

  const setTheme = t => setThemeState(t)
  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
