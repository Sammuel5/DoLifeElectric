'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/*
 * Shared carousel used on the homepage Our Talents section and the /artists page.
 *
 * On mobile (< md) it's a touch-swipe horizontal row with scroll-snap.
 * On desktop (md+) it's a paginated carousel with ◀ / ▶ arrow buttons and
 * gold pill page dots. 3 cards/page at md, 4 at lg, 5 at xl.
 */

/* Mobile swipe row */
export function MobileSwipeRow({ children }) {
  return (
    <div className="relative">
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </div>
  )
}

/* Easing function for buttery-smooth page transitions */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function smoothScrollTo(el, to, duration = 550) {
  const start = el.scrollLeft
  const change = to - start
  const startTime = performance.now()
  function step(now) {
    const elapsed = now - startTime
    const t = Math.min(1, elapsed / duration)
    el.scrollLeft = start + change * easeOutCubic(t)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/* Desktop paginated carousel */
export function DesktopCarousel({ children }) {
  const scrollerRef = useRef(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateState = () => {
    const el = scrollerRef.current
    if (!el) return
    const total = el.children.length
    const pageWidth = el.clientWidth
    const maxScroll = el.scrollWidth - el.clientWidth
    const scrollLeft = el.scrollLeft
    const firstCard = el.children[0]
    const cardW = firstCard ? firstCard.getBoundingClientRect().width + 20 /* gap-5 = 1.25rem ~20px */ : pageWidth / 5
    const visible = Math.max(1, Math.round(pageWidth / cardW))
    const totalPages = Math.max(1, Math.ceil(total / visible))
    const current = maxScroll <= 1 ? 0 : Math.round(scrollLeft / pageWidth)
    setPages(totalPages)
    setPage(Math.min(current, totalPages - 1))
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft < maxScroll - 4)
  }

  useEffect(() => {
    updateState()
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => updateState()
    const onResize = () => updateState()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const t1 = setTimeout(updateState, 60)
    const t2 = setTimeout(updateState, 450)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [children])

  // When children change (filter / search), reset to page 1
  useEffect(() => {
    const el = scrollerRef.current
    if (el) {
      el.scrollTo({ left: 0 })
      updateState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  const scrollBy = (dir) => {
    const el = scrollerRef.current
    if (!el) return
    const target = el.scrollLeft + dir * el.clientWidth
    smoothScrollTo(el, Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target)))
  }

  const scrollToPage = (idx) => {
    const el = scrollerRef.current
    if (!el) return
    smoothScrollTo(el, idx * el.clientWidth)
  }

  const showControls = pages > 1

  return (
    <div className="relative">
      {showControls && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous page"
            disabled={!canPrev}
            className={`absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-black/70 hover:bg-gold text-white hover:text-dark backdrop-blur-sm transition-all duration-200 border-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
              canPrev ? 'opacity-90 hover:opacity-100 cursor-pointer' : 'opacity-25 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next page"
            disabled={!canNext}
            className={`absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-black/70 hover:bg-gold text-white hover:text-dark backdrop-blur-sm transition-all duration-200 border-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
              canNext ? 'opacity-90 hover:opacity-100 cursor-pointer' : 'opacity-25 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar select-none"
        style={{
          scrollPaddingLeft: 0,
          scrollPaddingRight: 0,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'auto', // we animate ourselves in JS for smoother feel
        }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className="snap-start flex-shrink-0"
                style={{ flexBasis: 'calc((100% - 4 * 1.25rem) / 5)' }}
              >
                <DesktopCardWrapper>{child}</DesktopCardWrapper>
              </div>
            ))
          : children && (
              <div
                className="snap-start flex-shrink-0"
                style={{ flexBasis: 'calc((100% - 4 * 1.25rem) / 5)' }}
              >
                <DesktopCardWrapper>{children}</DesktopCardWrapper>
              </div>
            )}
      </div>

      {showControls && (
        <div className="hidden md:flex items-center justify-center gap-2.5 mt-5 md:mt-7">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`Go to page ${i + 1}`}
              className={`transition-all duration-300 ease-out rounded-full border-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 p-0 m-0 ${
                i === page
                  ? 'w-7 h-2.5'
                  : 'w-2.5 h-2.5 hover:bg-white/60'
              }`}
              style={{
                backgroundColor: i === page ? '#C9A84C' : 'rgba(255,255,255,0.30)',
                boxShadow: i === page ? '0 0 10px rgba(201,168,76,0.45)' : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* Responsive card widths: 5/4/3 cards per view at xl/lg/md */
function DesktopCardWrapper({ children }) {
  return (
    <>
      <style jsx>{`
        @media (max-width: 1279px) {
          div {
            flex-basis: calc((100% - 3 * 1.25rem) / 4) !important;
          }
        }
        @media (max-width: 1023px) {
          div {
            flex-basis: calc((100% - 2 * 1rem) / 3) !important;
          }
        }
      `}</style>
      {children}
    </>
  )
}
