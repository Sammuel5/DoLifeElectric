'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const ASSET = {
  hero: '/uploads/images/home/AboutPage/DLE_Web Asset_Hero Image_No text.png',
  bare: '/uploads/images/home/AboutPage/DLE_Web Asset_Bare BG.png',
  kd: '/uploads/images/home/AboutPage/DLE_Web Asset_KD.png',
  storm: '/uploads/images/home/AboutPage/DLE_Web Asset_Storm.png',
  xbound: '/uploads/images/home/AboutPage/DLE_Web Asset_X-Bound.png',
  anghel: '/uploads/images/home/AboutPage/DLE_Web Asset_Anghel.png',
  section2Bg: '/uploads/images/home/AboutPage/DLE_Web_Section2_BG.png',
  logoSm: '/dlelogo/dle-logo-sm.png',
}

function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  const navH =
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    ) || 88
  const y = el.getBoundingClientRect().top + window.scrollY - navH + 8
  window.scrollTo({ top: y, behavior: 'smooth' })
}

export default function AboutPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div
      className="relative w-full bg-black text-white overflow-x-hidden"
      style={{ fontFamily: '"Montserrat","Inter",sans-serif' }}
    >
      <style jsx global>{`
        @media (min-width: 640px) {
          .s2-honeycomb {
            background-size: 130% auto !important;
            background-position: center 25% !important;
          }
          .s4-stats { grid-template-columns: 1fr 1fr 1fr !important; }
        }
        /* Desktop (lg+): pull X-Bound group higher & headline tighter for seamless S3→S4.
           Mobile keeps milder pull so heads aren't cut. */
        @media (min-width: 1024px) {
          .s4-xbound-wrap { margin-top: -700px !important; }
          .s4-headline { margin-top: -460px !important; }
        }
        /* Mobile hero: natural height so there's no empty black gap below tagline.
           Desktop (md+): keep the full-viewport cinematic hero. */
        .hero-sec { min-height: auto !important; }
        .hero-inner {
          min-height: auto !important;
          padding-top: clamp(60px, 16vh, 110px) !important;
          padding-bottom: clamp(50px, 12vh, 100px) !important;
        }
        @media (min-width: 768px) {
          .hero-sec { min-height: calc(100dvh - var(--nav-h)) !important; }
          .hero-inner {
            min-height: calc(100dvh - var(--nav-h)) !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      {/* ============================================================
          SECTION 1 — HERO
          Mobile: buttons stack full-width, tighter spacing, smaller type.
          Desktop: everything centered & larger.
          ============================================================ */}
      <section
        className="relative w-full overflow-hidden hero-sec"
        style={{ zIndex: 1 }}
      >
        <img
          src={ASSET.hero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{
            // On mobile, shift focus to center of the cave scene so faces aren't cropped
            objectPosition: 'center 45%',
            filter: 'contrast(1.05) brightness(0.85)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(60,45,10,0.55) 0%, rgba(90,65,15,0.70) 40%, rgba(20,15,5,0.92) 85%, #000 100%)',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 55%, rgba(201,168,76,0.22) 0%, rgba(0,0,0,0) 60%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 sm:px-4 w-full h-full hero-inner">
          {/* About + DLE lockup */}
          <div
            className="relative flex items-end justify-center select-none"
            style={{ marginBottom: 'clamp(4px, 1vw, 14px)' }}
          >
            <span
              className="relative leading-none"
              style={{
                fontFamily: '"Pinyon Script","Great Vibes",cursive',
                fontSize: 'clamp(64px, 18vw, 220px)',
                color: '#D9B85C',
                textShadow: '0 4px 30px rgba(0,0,0,0.6)',
                marginRight: '-0.06em',
                transform: 'translateY(-0.06em)',
                zIndex: 2,
              }}
            >
              About
            </span>
            <svg
              viewBox="0 0 60 60"
              className="absolute pointer-events-none"
              style={{
                width: 'clamp(14px, 3vw, 38px)',
                height: 'clamp(14px, 3vw, 38px)',
                left: '53.5%',
                top: '6%',
                transform: 'translate(-50%, -50%) rotate(-12deg)',
                zIndex: 3,
                filter: 'drop-shadow(0 0 10px rgba(245,222,144,0.9))',
              }}
              aria-hidden="true"
            >
              <path d="M28 6 L32 24 L50 28 L32 32 L28 50 L24 32 L6 28 L24 24 Z" fill="#F8E9B0" />
              <path d="M28 14 L30 25 L40 28 L30 31 L28 42 L26 31 L16 28 L26 25 Z" fill="#E6C76A" />
            </svg>
            <h1
              className="font-display font-bold uppercase leading-[0.82] tracking-[0.02em] relative"
              style={{
                fontSize: 'clamp(72px, 23vw, 260px)',
                color: '#E0C060',
                background: 'none',
                WebkitTextFillColor: 'initial',
                WebkitBackgroundClip: 'initial',
                backgroundClip: 'initial',
                filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.55))',
                zIndex: 1,
                letterSpacing: '0.01em',
              }}
            >
              DLE
            </h1>
          </div>

          <p
            className="text-white/85 uppercase font-light"
            style={{
              fontFamily: '"Montserrat","Inter",sans-serif',
              fontSize: 'clamp(9px, 2.2vw, 20px)',
              letterSpacing: '0.38em',
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              marginTop: '-0.1em',
              paddingLeft: '0.38em', // optical centering for wide tracking
            }}
          >
            ENTERTAINMENT INC.
          </p>

          {/* Buttons: stacked full-width on mobile, inline on sm+ */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 w-full max-w-[360px] sm:max-w-none sm:w-auto"
            style={{ marginTop: 'clamp(22px, 4.5vw, 52px)' }}
          >
            <button
              onClick={() => scrollToId('story')}
              className="font-display uppercase tracking-[0.2em] bg-gold text-black px-5 sm:px-7 py-2 sm:py-2 text-xs sm:text-sm font-bold hover:bg-[#E6C76A] transition-colors duration-300 w-full sm:w-auto"
              style={{ borderRadius: 6, minHeight: 40, fontSize: 'clamp(10px, 1.6vw, 13px)' }}
            >
              OUR STORY
            </button>
            <Link
              href="/artists"
              className="font-display uppercase tracking-[0.2em] border border-gold/80 text-gold px-5 sm:px-7 py-2 sm:py-2 text-xs sm:text-sm font-medium hover:bg-gold/10 transition-colors duration-300 w-full sm:w-auto text-center"
              style={{ borderRadius: 6, minHeight: 40, fontSize: 'clamp(10px, 1.6vw, 13px)', background: 'transparent' }}
            >
              MEET THE ARTISTS
            </Link>
          </div>

          <p
            className="text-white/75 uppercase tracking-[0.3em] sm:tracking-[0.42em] font-medium text-center"
            style={{
              fontFamily: '"Montserrat","Inter",sans-serif',
              fontSize: 'clamp(8px, 1.5vw, 13px)',
              marginTop: 'clamp(14px, 2.5vw, 24px)',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              paddingLeft: '0.3em',
              paddingRight: '0.3em',
              lineHeight: 1.5,
            }}
          >
            FOR ARTISTS WHO REFUSE TO DIM THEIR LIGHT.
          </p>
        </div>

        {/* Bottom fade into section 2 (seam must be pure black for shield) */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 'clamp(90px, 18%, 220px)',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.92) 70%, #000 100%)',
          }}
        />
      </section>

      {/* ============================================================
          SECTION 2 — KD MISSION
          Mobile: shield smaller, wordmark smaller, KD larger/full-width,
          headline/body stack tighter.
          ============================================================ */}
      <section
        id="story"
        className="relative w-full"
        style={{ backgroundColor: '#000', zIndex: 2 }}
      >
        {/* Honeycomb wave — larger on mobile so peaks frame KD tighter */}
        <div
          className="absolute inset-0 pointer-events-none s2-honeycomb"
          style={{
            zIndex: 1,
            backgroundImage: `url(${ASSET.section2Bg})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center 22%',
            backgroundSize: '180% auto',
            filter: 'contrast(1.08) saturate(1.15)',
            maskImage:
              'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 12%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 100%)',
            WebkitMaskImage:
              'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 12%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 100%)',
          }}
        />

        {/* Shield logo — straddles the seam */}
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            top: 0,
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
          }}
        >
          <img
            src={ASSET.logoSm}
            alt="DLE"
            className="w-auto block"
            style={{
              height: 'clamp(64px, 16vw, 170px)',
              filter:
                'drop-shadow(0 8px 24px rgba(0,0,0,0.85)) contrast(1.15) brightness(1.05) sepia(0.25) saturate(1.2) hue-rotate(-5deg)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center px-5 sm:px-4">
          {/* Wordmark below shield */}
          <div
            className="flex flex-col items-center text-center"
            style={{
              // Smaller shield on mobile = less top padding needed
              paddingTop: 'clamp(24px, 4vw, 60px)',
            }}
          >
            <div
              style={{
                fontFamily: '"Montserrat","Inter",sans-serif',
                color: 'rgba(201,168,76,0.55)',
              }}
            >
              <div
                className="uppercase font-semibold"
                style={{
                  fontSize: 'clamp(8px, 1.4vw, 13px)',
                  letterSpacing: '0.3em',
                  paddingLeft: '0.3em',
                }}
              >
                DLE ENTERTAINMENT
              </div>
              <div
                className="uppercase font-medium"
                style={{
                  fontSize: 'clamp(5.5px, 0.9vw, 9px)',
                  color: 'rgba(201,168,76,0.4)',
                  letterSpacing: '0.25em',
                  marginTop: 'clamp(3px, 0.6vw, 8px)',
                  paddingLeft: '0.25em',
                }}
              >
                LIVE · CREATE · PERFORM · INSPIRE
              </div>
            </div>
          </div>

          {/* KD portrait — bigger on mobile (closer to edges) */}
          <div
            className="relative w-full flex justify-center"
            style={{ marginTop: 'clamp(4px, 1vw, 16px)' }}
          >
            <img
              src={ASSET.kd}
              alt="KD"
              className="relative z-10"
              style={{
                width: 'clamp(280px, 75vw, 680px)',
                maxWidth: '95%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.7)) saturate(0.95)',
              }}
            />
          </div>

          {/* Text panel — ends on the company line; continuation bridges into S3 */}
          <div
            className="relative z-20 text-center w-full px-4"
            style={{
              marginTop: 'clamp(-50px, -8vw, -24px)',
              paddingTop: 'clamp(14px, 2vw, 26px)',
              paddingBottom: '0px',
              marginLeft: 'calc(50% - 50vw)',
              marginRight: 'calc(50% - 50vw)',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              // Solid black base so it meets S3's black without any color break.
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 35%, #000 70%)',
            }}
          >
            <h2
              className="font-display font-bold uppercase leading-[1.05] tracking-wide mx-auto"
              style={{
                fontSize: 'clamp(22px, 6.5vw, 64px)',
                textShadow: '0 4px 24px rgba(0,0,0,0.85)',
                maxWidth: '900px',
              }}
            >
              <span className="text-white/85">DLE — </span>
              <span className="gold-text">DO LIFE ELECTRIC</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — ANGHEL + STORM composite
          SEAMLESS from Section 2:
            - Same #000 black base (no color shift at the seam)
            - Bridge headline uses IDENTICAL size/weight/font/leading as S2's
              ".IS AN ELITE ENTERTAINMENT COMPANY" line so the sentence
              reads as one continuous thought with no visual break.
            - Artists pulled up so they appear directly beneath the text,
              fully visible (heads + hands + bodies all in frame).
          ============================================================ */}
      <section
        className="relative w-full overflow-visible"
        style={{
          paddingTop: '0px',
          paddingBottom: '0px',
          // Same pure black as Section 2 — only a very subtle warm glow in center
          background:
            'radial-gradient(ellipse at 50% 55%, rgba(140,100,28,0.22) 0%, rgba(60,45,15,0.10) 30%, rgba(0,0,0,0) 65%),' +
            '#000',
          zIndex: 4,
        }}
      >
        {/* MOBILE LAYOUT (<md):
            - Top row: Anghel (left) with fan-support text to his right
            - Bottom row: Storm (right) with platforms text to his left
            - Both rows use a flex side-by-side layout with artist image
              anchored to the outer edge and text on the inner side. */}
        <div className="relative z-10 w-full md:hidden" style={{ paddingTop: 'clamp(6px,1.5vw,12px)' }}>
          {/* Bridge headline — full width */}
          <p
            className="font-display font-bold uppercase text-white/90 leading-[1.15] text-center mx-auto px-4"
            style={{
              fontSize: 'clamp(14px, 4.2vw, 26px)',
              letterSpacing: '0.01em',
              textShadow: '0 3px 18px rgba(0,0,0,0.85)',
              maxWidth: '600px',
              marginBottom: 'clamp(14px,3vw,22px)',
            }}
          >
            .IS AN ELITE ENTERTAINMENT COMPANY
            <br />
            PROVIDING INFRASTRUCTURE FOR ARTISTS
            <br />
            WHO CHOOSE TO LIGHT UP THE WORLD.
          </p>

          {/* === TOP ROW: Anghel (left) + fan-support text (right) === */}
          <div className="relative w-full flex items-end" style={{ height: 'clamp(200px, 50vw, 320px)' }}>
            <img
              src={ASSET.anghel}
              alt="Anghel"
              className="absolute pointer-events-none"
              style={{
                left: '6%',
                bottom: 0,
                height: '100%',
                width: 'auto',
                maxWidth: 'none',
                objectFit: 'contain',
                objectPosition: 'left bottom',
                filter: 'drop-shadow(0 18px 35px rgba(0,0,0,0.7)) saturate(0.95)',
                zIndex: 2,
              }}
            />
            <p
              className="text-white/80 leading-[1.65] text-left"
              style={{
                position: 'absolute',
                right: '10px',
                top: '10%',
                width: '56%',
                fontFamily: '"Montserrat","Inter",sans-serif',
                fontSize: 'clamp(10px, 2.7vw, 13px)',
                letterSpacing: '0.04em',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                zIndex: 10,
              }}
            >
              Our fan support platform allows supporters worldwide to send gifts, food, clothing, and direct financial support to their favorite artists — securely, transparently, and with 100% of funds routed through DLE&rsquo;s official PayMongo accounts before being distributed to artists according to their contracts.
            </p>
          </div>

          {/* === BOTTOM ROW: Storm (right) + platforms text (left) === */}
          <div className="relative w-full flex items-end" style={{ height: 'clamp(200px, 50vw, 320px)', marginTop: 'clamp(6px,2vw,14px)' }}>
            <img
              src={ASSET.storm}
              alt="Storm"
              className="absolute pointer-events-none"
              style={{
                right: '6%',
                bottom: 0,
                height: '100%',
                width: 'auto',
                maxWidth: 'none',
                objectFit: 'contain',
                objectPosition: 'right bottom',
                filter: 'drop-shadow(0 18px 35px rgba(0,0,0,0.7)) saturate(0.95)',
                zIndex: 3,
              }}
            />
            <p
              className="text-white/80 leading-[1.65] text-right"
              style={{
                position: 'absolute',
                left: '10px',
                top: '18%',
                width: '56%',
                fontFamily: '"Montserrat","Inter",sans-serif',
                fontSize: 'clamp(10px, 2.7vw, 13px)',
                letterSpacing: '0.04em',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                zIndex: 10,
              }}
            >
              We build platforms, create opportunities, and power the careers of tomorrow&rsquo;s most compelling talents. From vocal powerhouses to master producers, DLE is the home for artists who refuse to dim their light.
            </p>
          </div>
        </div>
        {/* DESKTOP LAYOUT (md+):
            Two side-by-side columns so paragraphs CANNOT overlap:
              - LEFT column: Anghel anchored to bottom-left, his paragraph sits
                to his right (inner side of column) at torso height
              - RIGHT column: Storm anchored to bottom-right, his paragraph sits
                to his left (inner side of column) at chest/book height
            - Bridge headline stays centered top. */}
        <div className="relative z-10 w-full hidden md:block">
          {/* Subtle warm glow at center seam */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '40%',
              height: '60%',
              background:
                'radial-gradient(ellipse at 50% 60%, rgba(201,168,76,0.18) 0%, rgba(100,75,22,0.08) 40%, rgba(0,0,0,0) 75%)',
              zIndex: 1,
            }}
          />

          <div className="relative mx-auto" style={{ maxWidth: '1600px', padding: '0 clamp(20px,2vw,40px)' }}>
            {/* Bridge headline — centered above */}
            <p
              className="font-display font-bold uppercase text-white/90 leading-[1.2] text-center mx-auto"
              style={{
                fontSize: 'clamp(13px, 3.6vw, 32px)',
                letterSpacing: '0.01em',
                textShadow: '0 3px 18px rgba(0,0,0,0.85)',
                maxWidth: '1100px',
                position: 'relative',
                zIndex: 10,
              }}
            >
              .IS AN ELITE ENTERTAINMENT COMPANY
              <br className="hidden sm:block" />
              PROVIDING INFRASTRUCTURE FOR ARTISTS
              <br className="hidden lg:block" />
              WHO CHOOSE TO LIGHT UP THE WORLD.
            </p>

            {/* Two-column stage: left half = Anghel + his text, right half = Storm + his text */}
            <div
              className="relative w-full grid"
              style={{
                gridTemplateColumns: '1fr 1fr',
                height: 'clamp(340px, 40vw, 500px)',
                marginTop: 'clamp(-50px,-4vw,-30px)',
              }}
            >
              {/* ===== LEFT COLUMN (Anghel + fan-support text) ===== */}
              <div className="relative" style={{ zIndex: 2 }}>
                {/* Anghel anchored bottom-left of his column */}
                <img
                  src={ASSET.anghel}
                  alt="Anghel"
                  className="absolute pointer-events-none"
                  style={{
                    left: '-4%',
                    bottom: 0,
                    height: '100%',
                    width: 'auto',
                    maxWidth: 'none',
                    objectFit: 'contain',
                    objectPosition: 'left bottom',
                    filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.8)) saturate(0.95)',
                  }}
                />
                {/* Fan-support paragraph — in left column, anchored to the RIGHT edge
                    of the column (so it sits beside Anghel's right shoulder), left-aligned */}
                <p
                  className="absolute text-white/80 leading-[1.85] text-left"
                  style={{
                    right: '4%',
                    top: '42%',
                    transform: 'translateY(-50%)',
                    maxWidth: '340px',
                    width: 'calc(100% - 80px)',
                    fontFamily: '"Montserrat","Inter",sans-serif',
                    fontSize: 'clamp(11px, 0.95vw, 13px)',
                    letterSpacing: '0.06em',
                    textShadow: '0 2px 14px rgba(0,0,0,0.95)',
                    zIndex: 10,
                  }}
                >
                  Our fan support platform allows supporters
                  <br />worldwide to send gifts, food, clothing, and
                  <br />direct financial support to their favorite artists
                  <br />— securely, transparently, and with 100% of
                  <br />funds routed through DLE&rsquo;s official PayMongo
                  <br />accounts before being distributed to artists
                  <br />according to their contracts.
                </p>
              </div>

              {/* ===== RIGHT COLUMN (Storm + platforms text) ===== */}
              <div className="relative" style={{ zIndex: 3 }}>
                {/* Storm anchored bottom-right of his column */}
                <img
                  src={ASSET.storm}
                  alt="Storm"
                  className="absolute pointer-events-none"
                  style={{
                    right: '-4%',
                    bottom: 0,
                    height: '92%',
                    width: 'auto',
                    maxWidth: 'none',
                    objectFit: 'contain',
                    objectPosition: 'right bottom',
                    filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.8)) saturate(0.95)',
                  }}
                />
                {/* Platforms paragraph — in right column, anchored to the LEFT edge
                    of the column (so it sits beside Storm's left shoulder), right-aligned */}
                <p
                  className="absolute text-white/80 leading-[1.85] text-right"
                  style={{
                    left: '4%',
                    top: '52%',
                    transform: 'translateY(-50%)',
                    maxWidth: '340px',
                    width: 'calc(100% - 80px)',
                    fontFamily: '"Montserrat","Inter",sans-serif',
                    fontSize: 'clamp(11px, 0.95vw, 13px)',
                    letterSpacing: '0.06em',
                    textShadow: '0 2px 14px rgba(0,0,0,0.95)',
                    zIndex: 10,
                  }}
                >
                  We build platforms, create
                  <br />opportunities, and power the careers
                  <br />of tomorrow&rsquo;s most compelling
                  <br />talents. From vocal powerhouses to
                  <br />master producers, DLE is the home for
                  <br />artists who refuse to dim their light.
                </p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ============================================================
          SECTION 4 — X-BOUND / STATS / CTA
          Seamless from Section 3 (both start on #000, shared warm glow).
          - X-Bound group photo centered, warm gold radial behind
          - Headline: EVERY PLAY. EVERY DOWNLOAD. / EVERY GIFT. EVERY SHOW.
          - Subhead: WE TURN VOLTAGE INTO VELOCITY FOR THE ARTISTS WHO CARRY THE CURRENT.
          - 3 stat cards (100% / 24/7 / Global)
          - EXPLORE THE ROSTER gold CTA
          - Mobile: stacked, stats 1-col, CTA full-width
          ============================================================ */}
      <section
        className="relative w-full overflow-visible"
        style={{
          paddingTop: '0px',
          paddingBottom: 'clamp(60px, 10vw, 120px)',
          marginTop: '-2px',
          // Top 40% transparent (so S3 shows through during overlap), then solid black below
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.92) 55%, #000 75%)',
          zIndex: 10,
        }}
      >
        {/* X-Bound group portrait — FULL VIEWPORT WIDTH (no side cuts),
            pulled UP into Section 3 to eliminate the black gap.
            Top of the PNG is faded to transparent over a shorter band so the
            brown studio bg blends into S4's pure black (#000) for seamless S3→S4.
            Bottom faded for headline ledge. */}
        <div
          className="relative w-full flex justify-center s4-xbound-wrap"
          style={{
            // Mobile: mild pull-up so heads don't get cut.
            // Desktop: .s4-xbound-wrap media query pulls much higher.
            marginTop: 'clamp(-120px,-18vw,-320px)',
            // Bleed outside viewport on mobile too
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            width: '100vw',
            maxWidth: 'none',
            overflow: 'hidden',
            zIndex: 6,
          }}
        >
          <img
            src={ASSET.xbound}
            alt="DLE X-Bound"
            className="relative w-full"
            style={{
              // Full viewport width up to ultra-wide sizes
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              objectFit: 'cover',
              objectPosition: 'center top',
              // Shorter top fade: only the brown "ceiling" area of the PNG fades out,
              // so the members' heads are fully visible closer to the top edge
              // Top 0-4%: transparent (blends into S3 black).
              // 4-10%: fast fade-in so faces are VISIBLE as they overlap S3.
              // 10-70%: full opacity so bodies/clothes are sharp.
              // Bottom: soft fade for headline ledge.
              maskImage:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 3%, rgba(0,0,0,0.7) 7%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 68%, rgba(0,0,0,0.85) 82%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 3%, rgba(0,0,0,0.7) 7%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 68%, rgba(0,0,0,0.85) 82%, rgba(0,0,0,0) 100%)',
              filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.6)) saturate(0.98) contrast(1.02)',
            }}
          />
        </div>

        {/* Headline block */}
        <div className="relative z-10 text-center px-5 sm:px-8 s4-headline" style={{ marginTop: 'clamp(-120px,-16vw,-240px)' }}>
          <h2
            className="font-display font-bold uppercase leading-[1.05] mx-auto"
            style={{
              fontSize: 'clamp(26px, 7.5vw, 82px)',
              letterSpacing: '0.005em',
              textShadow: '0 4px 24px rgba(0,0,0,0.85)',
              maxWidth: '1100px',
            }}
          >
            <span className="text-white">EVERY PLAY.</span>{' '}
            <span className="gold-text">EVERY DOWNLOAD.</span>
            <br />
            <span className="gold-text">EVERY GIFT.</span>{' '}
            <span className="text-white">EVERY SHOW.</span>
          </h2>

          <p
            className="font-display font-bold uppercase text-white/90 leading-[1.15] mx-auto mt-4 sm:mt-5"
            style={{
              fontSize: 'clamp(13px, 3.2vw, 32px)',
              letterSpacing: '0.01em',
              maxWidth: '900px',
              textShadow: '0 3px 18px rgba(0,0,0,0.85)',
            }}
          >
            WE TURN VOLTAGE INTO VELOCITY FOR THE
            <br />
            ARTISTS WHO CARRY THE CURRENT.
          </p>

          {/* Gold divider */}
          <div
            className="mx-auto mt-6 sm:mt-8"
            style={{
              width: 'clamp(260px, 60vw, 760px)',
              height: '2px',
              background: 'linear-gradient(90deg, rgba(201,168,76,0) 0%, rgba(201,168,76,0.85) 50%, rgba(201,168,76,0) 100%)',
              opacity: 0.7,
            }}
          />

          {/* Stat cards — 1 col mobile, 3 cols sm+ */}
          <div
            className="s4-stats mx-auto mt-6 sm:mt-8 grid gap-3 sm:gap-4"
            style={{
              gridTemplateColumns: '1fr',
              maxWidth: '820px',
            }}
          >
            {[
              { n: '100%', t: 'Secure payments via PayMongo, BSP-licensed' },
              { n: '24/7', t: 'Artist support & fan engagement' },
              { n: 'Global', t: 'Fan community from anywhere in the world' },
            ].map((s) => (
              <div
                key={s.n}
                className="text-left sm:text-center px-5 py-4 sm:py-5"
                style={{
                  background: 'linear-gradient(180deg, rgba(26,26,26,0.9) 0%, rgba(16,16,16,0.9) 100%)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)',
                }}
              >
                <div
                  className="font-display font-bold gold-text leading-none"
                  style={{ fontSize: 'clamp(28px, 5.5vw, 52px)' }}
                >
                  {s.n}
                </div>
                <div
                  className="text-white/70 mt-2"
                  style={{
                    fontFamily: '"Montserrat","Inter",sans-serif',
                    fontSize: 'clamp(10px, 1.8vw, 13px)',
                    letterSpacing: '0.06em',
                    lineHeight: 1.5,
                  }}
                >
                  {s.t}
                </div>
              </div>
            ))}
          </div>

          {/* EXPLORE THE ROSTER CTA */}
          <div className="mt-7 sm:mt-9 flex justify-center">
            <Link
              href="/artists"
              className="font-display uppercase tracking-[0.2em] bg-gold text-black px-7 sm:px-9 py-3 text-xs sm:text-sm font-bold hover:bg-[#E6C76A] transition-colors duration-300 inline-flex items-center gap-2"
              style={{
                borderRadius: 2,
                minHeight: 44,
                fontSize: 'clamp(10px, 1.8vw, 13px)',
                boxShadow: '0 8px 24px rgba(201,168,76,0.18)',
              }}
            >
              EXPLORE THE ROSTER
              <span style={{ fontSize: '1.1em', marginLeft: '2px' }}>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
