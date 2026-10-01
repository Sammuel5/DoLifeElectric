'use client'
import { useState, useRef, useEffect } from 'react'

/**
 * SmartImage — <img> wrapper that survives first-hit Cloudinary cold-starts.
 *
 * Problem: on a brand new user's first visit, Cloudinary has to generate the
 * f_auto,q_auto,w_N derivative on-the-fly (2-10s on free plan). If the
 * browser's 48 simultaneous image requests pile up before that derivative is
 * ready, a few of them can fail or time out → the user sees the browser's
 * broken-image icon on some cards.
 *
 * This component:
 *   1. Starts loading eagerly when `priority` is true (first-page cards).
 *   2. If the image errors, retries ONCE after 2 seconds (Cloudinary finishes
 *      transcoding within that window >95% of the time).
 *   3. If the retry also fails (or src is empty), shows the DLE shield logo
 *      as a graceful fallback instead of a torn-page icon.
 *
 * All props are passed through to the underlying <img>, so you can drop this
 * in wherever you'd use a plain <img>.
 */
export const FALLBACK_IMAGE = '/dlelogo/dle-logo-sm.webp'

export default function SmartImage({
  src,
  alt = '',
  fallback = FALLBACK_IMAGE,
  priority = false,
  retryDelay = 2000,
  className = '',
  style,
  ...rest
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallback)
  const [errored, setErrored] = useState(false)
  const retriedRef = useRef(false)
  const imgRef = useRef(null)

  // If src prop changes (e.g. artist data loads in after initial render), reset
  useEffect(() => {
    retriedRef.current = false
    setErrored(false)
    setCurrentSrc(src || fallback)
  }, [src, fallback])

  const handleError = () => {
    // First error → schedule a single retry. Cloudinary will have finished
    // generating the on-the-fly derivative by then for ~95% of cases.
    if (!retriedRef.current && src && currentSrc !== fallback) {
      retriedRef.current = true
      // Cache-bust the URL so the browser doesn't serve the cached failure.
      const retrySrc = src + (src.includes('?') ? '&' : '?') + '_cb=' + Date.now()
      setTimeout(() => {
        setCurrentSrc(retrySrc)
      }, retryDelay)
      return
    }
    // Second error (or empty src) → fall back to DLE logo so user sees
    // something polished instead of a broken-image icon.
    setErrored(true)
    setCurrentSrc(fallback)
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        // When showing the fallback logo, center it and tone it down so it
        // looks like a deliberate placeholder rather than a missing image.
        ...(errored ? { objectFit: 'contain', padding: '20%', opacity: 0.35 } : {}),
      }}
      loading={priority ? 'eager' : 'lazy'}
      // First-page visible images: high fetch priority so they beat carousels/
      // offscreen assets. Hidden/later images: default (auto).
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={handleError}
      {...rest}
    />
  )
}
