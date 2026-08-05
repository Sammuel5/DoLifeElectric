'use client'
import { useEffect, useRef, useState } from 'react'

// Custom DLE cursor: gold ring + mini DLE shield logo in center + short fading particle trail.
// Desktop/laptop only — automatically hides on touch devices (mobile/tablet).
// - Default: ring + gold DLE logo (tinted from the real logo)
// - Hover over clickables: logo grows slightly (subtle scale) + glows gold
// - Click (mousedown): logo "pops" a little bigger, flashes bright gold glow
export default function CustomCursor() {
  const ringRef = useRef(null)
  const shieldRef = useRef(null)
  const trailRef = useRef(null)
  const [enabled, setEnabled] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [clicked, setClicked] = useState(false)

  // Refs for 60fps animation loop (avoid re-renders during movement)
  const mouse = useRef({ x: -200, y: -200 })
  const ringPos = useRef({ x: -200, y: -200 })
  const shieldPos = useRef({ x: -200, y: -200 })
  const shieldScale = useRef(1)
  const ringScale = useRef(1)
  const particles = useRef([])
  const rafRef = useRef(null)

  // Smoothly interpolate scale toward targets based on state
  const targetShieldScale = useRef(1)
  const targetRingScale = useRef(1)

  useEffect(() => {
    // Hover scale: 1 → 1.25 (noticeable but not huge)
    targetShieldScale.current = hovering ? 1.25 : 1
    // Ring gently grows a touch too
    targetRingScale.current = hovering ? 1.08 : 1
  }, [hovering])

  useEffect(() => {
    // Click pop: briefly scale to 1.45 then relax back to hover target
    if (clicked) {
      shieldScale.current = 1.5
      targetShieldScale.current = hovering ? 1.25 : 1
    }
  }, [clicked, hovering])

  useEffect(() => {
    // Only enable on devices with a fine pointer (mouse)
    const hasFinePointer = typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!hasFinePointer) return
    setEnabled(true)

    // Hide the native cursor globally
    document.documentElement.style.cursor = 'none'
    const styleTag = document.createElement('style')
    styleTag.id = 'custom-cursor-style'
    styleTag.textContent = `
      html, body { cursor: none !important; }
      a, button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"],
      label, summary, select, .cursor-pointer, [class*="cursor-pointer"] { cursor: none !important; }
    `
    document.head.appendChild(styleTag)

    const onMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      if (ringRef.current && ringRef.current.style.opacity !== '1') {
        ringRef.current.style.opacity = '1'
        shieldRef.current.style.opacity = '1'
      }

      // Spawn trail particles (throttled to ~40/sec)
      const now = performance.now()
      if (!particles.lastSpawn || now - particles.lastSpawn > 25) {
        particles.lastSpawn = now
        const dx = e.clientX - (particles.lastX ?? e.clientX)
        const dy = e.clientY - (particles.lastY ?? e.clientY)
        const speed = Math.sqrt(dx * dx + dy * dy)
        if (speed > 2) {
          particles.current.push({
            x: e.clientX,
            y: e.clientY,
            age: 0,
            size: Math.min(3 + speed * 0.07, 6),
          })
        }
        particles.lastX = e.clientX
        particles.lastY = e.clientY
      }

      // Detect hover state
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const textInputTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number', '']
      let isTextInput = false
      let isClickable = false
      if (el) {
        const target = el.closest('a, button, [role="button"], label, summary, input, textarea, select, .cursor-pointer, [class*="cursor-pointer"]')
        if (target) {
          if (target.tagName === 'INPUT') {
            const t = (target.type || 'text').toLowerCase()
            if (textInputTypes.includes(t)) {
              isTextInput = true
            } else {
              isClickable = true
            }
          } else if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            isTextInput = true
          } else {
            isClickable = true
          }
        }
      }
      setHovering(isClickable && !isTextInput)
      document.body.classList.toggle('over-text-input', isTextInput)
    }

    const onDown = () => setClicked(true)
    const onUp = () => setClicked(false)
    const onLeave = () => {
      mouse.current.x = -300
      mouse.current.y = -300
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)

    // Main animation loop (60fps)
    const animate = () => {
      const tx = mouse.current.x
      const ty = mouse.current.y

      // Ease position toward mouse
      ringPos.current.x += (tx - ringPos.current.x) * 0.18
      ringPos.current.y += (ty - ringPos.current.y) * 0.18
      shieldPos.current.x += (tx - shieldPos.current.x) * 0.5
      shieldPos.current.y += (ty - shieldPos.current.y) * 0.5

      // Ease scale toward target (for hover/click animations)
      shieldScale.current += (targetShieldScale.current - shieldScale.current) * 0.2
      ringScale.current += (targetRingScale.current - ringScale.current) * 0.15

      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%) scale(${ringScale.current})`
      }
      if (shieldRef.current) {
        shieldRef.current.style.transform =
          `translate3d(${shieldPos.current.x}px, ${shieldPos.current.y}px, 0) translate(-50%, -50%) scale(${shieldScale.current})`
      }

      // Render particle trail
      if (trailRef.current) {
        particles.current = particles.current.filter(p => p.age < 1)
        let html = ''
        for (let i = particles.current.length - 1; i >= 0; i--) {
          const p = particles.current[i]
          p.age += 0.04
          if (p.age < 1) {
            const opacity = (1 - p.age) * 0.55
            const size = p.size * (1 - p.age * 0.7)
            html += `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(201,168,76,${opacity});transform:translate(-50%,-50%);pointer-events:none"></div>`
          }
        }
        trailRef.current.innerHTML = html
      }

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      const st = document.getElementById('custom-cursor-style')
      if (st) st.remove()
      document.documentElement.style.cursor = ''
      document.body.classList.remove('over-text-input')
    }
  }, [])

  if (!enabled) return null

  return (
    <>
      {/* Trail layer */}
      <div
        ref={trailRef}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}
      />

      {/* Outer gold ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: 30, height: 30,
          borderRadius: '50%',
          border: '1.5px solid #C9A84C',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
          boxShadow: '0 0 8px rgba(201,168,76,0.15)',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Inner DLE shield logo */}
      <div
        ref={shieldRef}
        aria-hidden="true"
        className={`dle-cursor-shield ${hovering ? 'hovering' : ''} ${clicked ? 'clicked' : ''}`}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: 20, height: 20,
          pointerEvents: 'none',
          zIndex: 10000,
          willChange: 'transform',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
      >
        <img
          src="/dlelogo/dle-logo-sm.png"
          alt=""
          draggable="false"
          className="dle-cursor-logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'brightness(0) saturate(100%) invert(73%) sepia(45%) saturate(580%) hue-rotate(5deg) brightness(92%) contrast(89%)',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'block',
            transition: 'filter 0.2s ease-out',
            transformOrigin: 'center center',
          }}
        />
      </div>

      <style jsx global>{`
        .dle-cursor-shield.hovering .dle-cursor-logo {
          filter: brightness(0) saturate(100%) invert(78%) sepia(42%) saturate(620%) hue-rotate(5deg) brightness(97%) contrast(90%)
                  drop-shadow(0 0 5px rgba(230,199,106,0.95))
                  drop-shadow(0 0 12px rgba(201,168,76,0.55));
        }
        .dle-cursor-shield.clicked .dle-cursor-logo {
          filter: brightness(0) saturate(100%) invert(88%) sepia(25%) saturate(600%) hue-rotate(2deg) brightness(108%) contrast(95%)
                  drop-shadow(0 0 10px rgba(255,240,180,1))
                  drop-shadow(0 0 22px rgba(230,199,106,0.95));
        }
        iframe, video { cursor: none !important; }
        body.over-text-input .dle-cursor-ring,
        body.over-text-input .dle-cursor-shield {
          opacity: 0 !important;
        }
      `}</style>
    </>
  )
}
