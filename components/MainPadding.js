'use client'
import { usePathname } from 'next/navigation'

// On the homepage ("/"), the page content begins at the very top (the light silver
// hero renders its own gold pill nav inside the hero). On every other page we pad
// 4rem from the top to make room for the fixed dark Navbar.
export default function MainPadding({ children }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  return (
    <main
      className={`flex-1 flex flex-col ${isHome ? '' : 'pt-16 safe-top'}`}
    >
      {children}
    </main>
  )
}
