'use client'
/**
 * ============================================================================
 *  DLE ENTERTAINMENT — HOMEPAGE (Figma pixel-perfect port)
 *  Source of truth: Index.txt (Figma-to-code export)
 *  Filename intentionally kept as "Index" to match the Figma export
 * ============================================================================
 *  Drop-in usage inside Next.js app/page.js:
 *    import Frame from './figma/Index.jsx';
 *    export default function Page(){ return <Frame />; }
 *
 *  Image files expected in /public/figma/ (use the exact Figma filenames —
 *  do NOT rename them):
 *    3d-LOGO-FRONT-DLE-2026-1.png        – big DLE logo in hero (silver area)
 *    3d-LOGO-FRONT-DLE-2026-2.png        – small DLE shield in header
 *    3d-LOGO-FRONT-DLE-2026-3.png        – DLE watermark behind talents
 *    3d-LOGO-FRONT-DLE-2026-4.png        – DLE logo inside ABOUT card
 *    3d-LOGO-FRONT-DLE-2026-5.png        – big DLE logo in footer
 *    201440220-db7d4816-933c-40a5-8451-606d817bde5f-1.png – header grunge
 *    google-2991148-1.png                – Google "G" logo for Sign in button
 *    image.png                           – music logo / artwork behind Talents
 *    image.svg                           – search decoration (talents)
 *    image-21277.png                     – talents grunge texture
 *    image-21278.png                     – about/story grunge texture
 *    image-21279.png                     – FAQ grunge texture
 *    mask-group.png                      – contact capsule overlay
 *    untitled-1-1.png                    – artist on the left of ABOUT (red feathers)
 *    untitled-1-2.png                    – ABOUT background photo
 *    untitled-1-3.png                    – hero artist (right side of silver area)
 *    vector.svg                          – search bar underline (talents)
 *    vector-2.svg                        – SIGN IN card underline (contact)
 * ============================================================================
 */
import { useEffect, useMemo, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'

/* ------------------------------- image paths ------------------------------ */
const IMG = {
  logo1:      '/figma/3d-LOGO-FRONT-DLE-2026-1.png',
  logo2:      '/figma/3d-LOGO-FRONT-DLE-2026-2.png',
  logo3:      '/figma/3d-LOGO-FRONT-DLE-2026-3.png',
  logo4:      '/figma/3d-LOGO-FRONT-DLE-2026-4.png',
  logo5:      '/figma/3d-LOGO-FRONT-DLE-2026-5.png',
  headerTex:  '/figma/201440220-db7d4816-933c-40a5-8451-606d817bde5f-1.png',
  google:     '/figma/google-2991148-1.png',
  musicLogo:  '/figma/image.png',
  searchDeco: '/figma/image.svg',
  talentsTex: '/figma/image-21277.png',
  storyTex:   '/figma/image-21278.png',
  faqTex:     '/figma/image-21279.png',
  mask:       '/figma/mask-group.png',
  storyLeft:  '/figma/untitled-1-1.png',
  storyBg:    '/figma/untitled-1-2.png',
  heroArtist: '/figma/untitled-1-3.png',
  vector:     '/figma/vector.svg',
  vector2:    '/figma/vector-2.svg',
}

/* --------------------------------- data ---------------------------------- */
const navItems = [
  ['HOME', 'hero'],
  ['ABOUT', 'about'],
  ['FAQ', 'faq'],
  ['CONTACT', 'contact'],
  ['ARTIST', 'talents'],
  ['MUSIC', 'music'],
]

const faqItems = [
  ['HOW DO I SEND A GIFT TO AN ARTIST?',
   'Sign in, open an artist profile, then select a supported gift option.'],
  ['DO I NEED TO SIGN IN TO DONATE?',
   'Yes. Signing in protects artists, supporters, and all donation records.'],
  ['IS MY PAYMENT INFORMATION SAFE?',
   'Payments are securely processed through PayMongo, a BSP-licensed, PCI-DSS compliant payment processor.'],
  ['WHAT PAYMENT METHODS DO YOU ACCEPT?',
   'Available payment options (QR Ph, GCash, Maya, cards, online banking, 7-Eleven) are shown securely during checkout.'],
  ['HOW DOES THE MONEY REACH THE ARTIST?',
   'Funds are routed through official DLE PayMongo accounts and distributed according to artist contracts.'],
  ['CAN I GET A REFUND?',
   'For urgent donation or refund support, contact DLE at info@dle-entertainment.com with your PayMongo reference number.'],
  ['HOW DO I DOWNLOAD MUSIC?',
   'Sign in with Google, then select a track or album download.'],
  ['CAN I AUDITION OR JOIN DLE?',
   'Use the contact form to submit a business or artist inquiry.'],
]

const footerColumns = [
  ['QUICK LINKS', ['About Us', 'FAQ', 'Contact', 'Music', 'Artists']],
  ['LEGAL',       ['Terms of Service', 'Privacy Policy', 'Support']],
  ['CONNECT',     ['info@dle-entertainment.com', 'dle-entertainment.com']],
]

const PLACEHOLDER_CARDS = [
  { size: 'sm', name: 'Name', bio: 'Bio', group: 'Group', image: null },
  { size: 'md', name: 'Name', bio: 'Bio', group: 'Group', image: null },
  { size: 'lg', name: 'Name', bio: 'Bio', group: 'Group', image: null },
  { size: 'md', name: 'Name', bio: 'Bio', group: 'Group', image: null },
  { size: 'sm', name: 'Name', bio: 'Bio', group: 'Group', image: null },
]

const PLACEHOLDER_TRACKS = [
  ['Title', 'Composer'], ['Title', 'Composer'], ['The Hole', 'Yana Sao'],
  ['Title', 'Composer'], ['Title', 'Composer'], ['Title', 'Composer'],
  ['The Hole', 'Yana Sao'], ['Title', 'Composer'], ['Title', 'Composer'],
  ['Title', 'Composer'],
]

const scrollToSection = (id) => {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ------------------------------- component -------------------------------- */
export default function Frame() {
  const { data: session } = useSession()
  const signedIn = !!session

  const [talentFilter, setTalentFilter] = useState('ALL')
  const [talentQuery, setTalentQuery] = useState('')
  const [musicQuery, setMusicQuery] = useState('')
  const [activeFaq, setActiveFaq] = useState(null)
  const [playingTrack, setPlayingTrack] = useState(null)

  const [artists, setArtists] = useState([])
  const [tracks, setTracks] = useState([])
  const [artistsLoaded, setArtistsLoaded] = useState(false)

  /* Fetch real artists + music; fall back to placeholders if API is empty */
  useEffect(() => {
    fetch('/api/artists')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setArtists(list)
        setArtistsLoaded(true)
      })
      .catch(() => setArtistsLoaded(true))

    fetch('/api/music')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.tracks || data?.musics || [])
        setTracks(list)
      })
      .catch(() => {})
  }, [])

  /* Build talent cards from real artists when available */
  const talentCards = useMemo(() => {
    if (!artistsLoaded || artists.length === 0) return PLACEHOLDER_CARDS
    // Assign size cycle: sm,md,lg,md,sm repeating
    const sizeMap = ['sm', 'md', 'lg', 'md', 'sm']
    return artists.slice(0, 10).map((a, i) => ({
      size: sizeMap[i % sizeMap.length],
      name: a.name || 'Name',
      bio:  a.title || a.bio || (a.isGroup ? 'Group' : 'Artist'),
      group: a.isGroup ? 'GROUP' : (a.groupName || 'ARTIST'),
      image: a.image || null,
      href: `/artists${a._id ? `?id=${a._id}` : ''}`,
    }))
  }, [artists, artistsLoaded])

  /* Build tracks from real data when available */
  const trackList = useMemo(() => {
    if (tracks.length === 0) return PLACEHOLDER_TRACKS
    return tracks.slice(0, 10).map((t) => [t.title || 'Title', t.artistName || 'Composer'])
  }, [tracks])

  const filteredCards = useMemo(() => {
    const q = talentQuery.trim().toLowerCase()
    let list = talentCards
    if (talentFilter === 'GROUP') list = list.filter((c) => /group/i.test(c.group))
    if (talentFilter === 'ARTIST') list = list.filter((c) => !/group/i.test(c.group))
    if (!q) return list
    return list.filter((c) => `${c.name} ${c.bio} ${c.group}`.toLowerCase().includes(q))
  }, [talentCards, talentFilter, talentQuery])

  const filteredTracks = useMemo(() => {
    const q = musicQuery.trim().toLowerCase()
    if (!q) return trackList
    return trackList.filter(([t, a]) => `${t} ${a}`.toLowerCase().includes(q))
  }, [trackList, musicQuery])

  return (
    <main className="relative w-full overflow-x-hidden overflow-y-hidden bg-white text-white"
          style={{ minWidth: '100%' }}>
      {/*
        The design is fixed at 1920px wide. We wrap everything in a scaled
        container so it fits the viewport on desktop, and shows horizontal
        scroll on mobile (matches Figma exactly).
      */}
      <div className="relative mx-auto" style={{ width: '1920px' }}>

        {/* ========================= HERO ========================= */}
        <section id="hero" className="relative h-[1037px] bg-[#ababab]">
          <header className="absolute inset-x-0 top-0 z-20 h-[150px] bg-[#726a56]">
            <img
              className="absolute inset-0 h-[150px] w-[1920px] object-cover mix-blend-soft-light"
              src={IMG.headerTex} alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <nav aria-label="Primary navigation" className="relative h-full">
              {navItems.map(([label, target], index) => {
                const positions = [
                  'left-[141px]', 'left-[320px]', 'left-[479px]', 'left-[601px]',
                  'left-[1317px]', 'left-[1477px]',
                ]
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => scrollToSection(target)}
                    className={`absolute top-[50px] ${positions[index]} h-[51px] px-[33px] text-[25px] font-medium leading-[51px] text-white transition-colors hover:opacity-80 ${index === 0 ? 'rounded-[100px] bg-[#141414]' : ''}`}
                    style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}
                  >
                    {label}
                  </button>
                )
              })}
            </nav>
            <Link href="/" aria-label="DLE Home">
              <img
                className="absolute left-[891px] top-6 h-[103px] w-[138px] object-contain"
                src={IMG.logo2}
                alt="DLE Entertainment"
                onError={(e) => { e.currentTarget.src = '/dlelogo/dle-logo-sm.png' }}
              />
            </Link>
            <button
              type="button"
              onClick={() => signedIn ? null : signIn('google')}
              className="absolute left-[1627px] top-9 h-[79px] w-[267px] rounded-[10px] bg-[linear-gradient(90deg,#141414_0%,#2b2b2b_100%)] text-[25px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}
            >
              {signedIn ? (session?.user?.name?.split(' ')[0]?.toUpperCase() || 'SIGNED IN') : 'SIGN IN'}
            </button>
          </header>

          <img
            className="absolute left-[332px] top-[244px] h-[191px] w-[257px] object-contain"
            src={IMG.logo1}
            alt="DLE Entertainment"
            onError={(e) => { e.currentTarget.src = '/dlelogo/dle-logo.png' }}
          />
          <img
            className="absolute left-[1266px] top-[231px] h-[806px] w-[654px] object-contain object-bottom"
            src={IMG.heroArtist}
            alt="DLE featured artist"
            onError={(e) => {
              e.currentTarget.src = '/uploads/images/home/hero-artist-2.png'
              e.currentTarget.onerror = () => { e.currentTarget.src = '/uploads/character 2.png' }
            }}
          />

          <div className="absolute left-[171px] top-[455px] text-center text-[130px] leading-[104px] text-black"
               style={{ fontFamily: "'Imperial Script', 'Great Vibes', 'Brush Script MT', cursive" }}>
            R
          </div>
          <div className="absolute left-[256px] top-[492px] text-6xl leading-[48px] text-black"
               style={{ fontFamily: "'Imperial Script', 'Great Vibes', 'Brush Script MT', cursive" }}>
            edifining The
          </div>
          <h1 className="absolute left-[188px] top-[524px] text-center text-[200px] font-black uppercase leading-[160px] text-[#4d3c13]"
              style={{ fontFamily: "'Helvetica Neue Condensed Black', 'Oswald', 'Impact', 'Arial Narrow', sans-serif", letterSpacing: '-0.02em' }}>
            VISION
          </h1>
          <p className="absolute left-[267px] top-[721px] w-[410px] text-center text-xl leading-[22.8px] text-black"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}>
            Elite infrastructure for artists who choose to Do Life Electric.
          </p>
          <p className="absolute left-[823px] top-[564px] text-3xl leading-[30px] text-black"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {'{{ DLE montage home video }}'}
          </p>
          <button
            type="button"
            onClick={() => scrollToSection('talents')}
            className="absolute left-[284px] top-[791px] h-[65px] w-[354px] rounded-[10px] bg-[linear-gradient(90deg,#4d3c14_0%,#7d642b_100%)] text-xl font-bold text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif", fontWeight: 700 }}
          >
            EXPLORE THE ROSTER
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('about')}
            className="absolute left-[284px] top-[871px] h-[65px] w-[354px] rounded-[10px] bg-[linear-gradient(90deg,#141414_0%,#2b2b2b_100%)] text-xl font-bold text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif", fontWeight: 700 }}
          >
            OUR STORY
          </button>
        </section>

        {/* ========================= TALENTS ========================= */}
        <section
          id="talents"
          className="relative h-[1193px] overflow-hidden bg-[linear-gradient(180deg,#141414_0%,#3d3c3c_50%,#141414_99%)]"
        >
          <img
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-70"
            src={IMG.talentsTex} alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <img
            className="absolute left-[610px] top-[83px] h-[1120px] w-[1896px] object-contain opacity-15"
            src={IMG.musicLogo} alt="DLE visual artwork"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <img
            className="absolute left-[14px] top-[1114px] h-[1120px] w-[1896px] object-contain opacity-10"
            src={IMG.logo3} alt="DLE visual artwork"
            onError={(e) => { e.currentTarget.src = '/dlelogo/dle-logo.png' }}
          />
          <div className="absolute left-[-453px] top-[198px] h-[949px] w-[651px] rounded-full bg-[#141414] blur-[250px]" />
          <div className="absolute left-[1714px] top-[198px] h-[949px] w-[651px] rounded-full bg-[#141414] blur-[250px]" />

          <h2 className="absolute left-[610px] top-[83px] text-[100px] font-bold leading-[92px] text-[#967625]"
              style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
            OUR TALENTS
          </h2>
          <p className="absolute left-[251px] top-[209px] w-[1418px] text-xl font-bold leading-[24px] text-white/90"
             style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
            Browse all groups and artists. Click any card or member name to watch their video and send gifts.
            Every artist — solo or in a group — is listed below.
          </p>

          {/* Search bar */}
          <div className="absolute left-[105px] top-[296px] h-[65px] w-[1223px] border border-[#ababab] bg-[#1a1a1a]">
            <img
              className="pointer-events-none absolute left-[47px] top-[45%] h-[55%] w-[88%] -translate-y-1/2 opacity-60"
              src={IMG.vector} alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <input
              aria-label="Search artists"
              value={talentQuery}
              onChange={(event) => setTalentQuery(event.target.value)}
              placeholder="Search artists by name, title..."
              className="relative h-full w-full bg-transparent px-[74px] text-xl text-[#ababab] placeholder:text-[#ababab]/60 focus:outline-none"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            />
          </div>

          {/* Filters — Figma had typo "ARIST"; we render "ARTIST" but keep the exact layout */}
          <div className="absolute left-[1359px] top-[296px] flex gap-4">
            {['ALL', 'GROUP', 'ARTIST'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTalentFilter(filter)}
                className={`h-[65px] w-[143px] border text-[25px] font-medium transition-colors ${
                  talentFilter === filter
                    ? 'border-[#4d3c13] bg-[#4d3c13] text-white'
                    : 'border-white text-white hover:bg-white/10'
                }`}
                style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Talent cards horizontal row */}
          <div className="absolute left-[-57px] top-[436px] flex min-w-[2038px] items-center gap-8 pb-4"
               style={{ overflowX: 'auto' }}>
            {filteredCards.length === 0 && (
              <p className="w-full text-center text-white/60 text-2xl pt-20"
                 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                No artists match your search.
              </p>
            )}
            {filteredCards.map((card, index) => {
              const dimensions =
                card.size === 'lg' ? 'h-[633px] w-[488px]'
                : card.size === 'md' ? 'h-[486px] w-[375px]'
                : 'h-[436px] w-[336px]'
              const CardTag = card.href ? 'a' : 'div'
              return (
                <CardTag
                  key={`${card.name}-${index}`}
                  {...(card.href ? { href: card.href } : {})}
                  className={`${dimensions} relative flex-shrink-0 rounded-[30px] overflow-hidden bg-[#c4c4c4] group`}
                >
                  {card.image ? (
                    <img src={card.image} alt={card.name}
                         className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3d3c3c] to-[#141414]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 h-[205px] w-full rounded-b-[30px] border border-black bg-[linear-gradient(99deg,#4d3c14_0%,#a17e27_100%)] p-[25px]">
                    <h3 className="text-[35px] font-bold leading-none text-white"
                        style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
                      {card.name}
                    </h3>
                    <p className="mt-3 text-xl leading-snug text-white/90"
                       style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                      {card.bio}
                    </p>
                    <strong className="absolute bottom-6 right-6 text-[35px] text-white/95"
                            style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
                      {card.group}
                    </strong>
                  </div>
                </CardTag>
              )
            })}
          </div>
        </section>

        {/* ========================= MUSIC ========================= */}
        <section
          id="music"
          className="relative h-[996px] bg-[linear-gradient(180deg,#141414_0%,#3d3c3c_50%,#141414_100%)]"
        >
          <h2 className="absolute left-[666px] top-[60px] text-[100px] font-bold leading-[92px] text-[#977725]"
              style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
            OUR MUSIC
          </h2>
          <p className="absolute left-[725px] top-[186px] text-xl font-bold text-white/90"
             style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
            Pick an album to listen to — tap any song to play.
          </p>

          <div className="absolute left-[350px] top-[273px] h-[65px] w-[1225px] border border-[#ababab] bg-[#1a1a1a]">
            <img
              className="pointer-events-none absolute left-[42px] top-[50%] h-[55%] w-[93%] -translate-y-1/2 opacity-60"
              src={IMG.searchDeco} alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <input
              aria-label="Search music"
              value={musicQuery}
              onChange={(event) => setMusicQuery(event.target.value)}
              placeholder="Search songs, artists, albums..."
              className="relative h-full w-full bg-transparent px-[68px] text-xl text-[#ababab] placeholder:text-[#ababab]/60 focus:outline-none"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            />
          </div>

          <div className="absolute left-[-102px] top-[422px] grid w-[2067px] grid-cols-5 gap-x-9 gap-y-8">
            {filteredTracks.map(([title, composer], index) => (
              <button
                key={`${title}-${index}`}
                type="button"
                onClick={() => setPlayingTrack(playingTrack === index ? null : index)}
                className={`relative h-[121px] w-[370px] flex-shrink-0 rounded-[20px] border-2 text-left transition-colors ${
                  playingTrack === index ? 'border-[#a17e27]' : 'border-[#553d03] hover:border-[#a17e27]/70'
                } bg-[linear-gradient(133deg,#4d3d15_0%,#7d642b_100%)]`}
              >
                <span className="absolute left-3.5 top-2.5 flex h-[102px] w-[104px] items-center justify-center rounded-[20px] bg-white">
                  <span className="text-3xl text-[#4d3d15]">♪</span>
                </span>
                <span className="absolute left-32 top-7 truncate pr-3 text-[35px] font-bold leading-[32px] text-white"
                      style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700, maxWidth: '220px' }}>
                  {title}
                </span>
                <span className="absolute left-32 top-[61px] truncate pr-3 text-xl text-white/85"
                      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", maxWidth: '220px' }}>
                  {composer}
                </span>
              </button>
            ))}
          </div>

          <div className="absolute left-[496px] top-[751px] h-[175px] w-[919px] rounded-[20px] bg-[#7a622a45]" />
          <p className="absolute left-[538px] top-[784px] w-[835px] text-center text-[25px] font-medium text-white/95"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}>
            Streaming is free for everyone — sign in with Google to download tracks.
          </p>
          <button
            type="button"
            onClick={() => signedIn ? (window.location.href = '/music') : signIn('google')}
            className="absolute left-[785px] top-[831px] h-[65px] w-[354px] rounded-[10px] bg-[linear-gradient(90deg,#4d3c14_0%,#7d642b_100%)] text-xl font-bold text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif", fontWeight: 700 }}
          >
            {signedIn ? 'GO TO MUSIC' : 'SIGN IN TO DOWNLOAD'}
          </button>
        </section>

        {/* ========================= ABOUT ========================= */}
        <section
          id="about"
          className="relative h-[1151px] overflow-hidden bg-[linear-gradient(180deg,#7b632a_0%,#514017_100%)]"
        >
          <img
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60"
            src={IMG.storyTex} alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <img
            className="absolute left-0 top-0 h-[1153px] w-[1359px] object-cover opacity-60"
            src={IMG.storyBg} alt="DLE artist story background"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <img
            className="absolute left-11 top-0 h-[1165px] w-[944px] object-contain object-left-bottom"
            src={IMG.storyLeft} alt="DLE artist"
            onError={(e) => {
              e.currentTarget.src = '/uploads/images/home/about-artist.png'
              e.currentTarget.onerror = () => { e.currentTarget.src = '/uploads/character.png' }
            }}
          />

          <article className="absolute left-[524px] top-[68px] h-[979px] w-[1190px] rounded-[30px] border-[10px] border-[#7a6431] bg-[#534831]/95 backdrop-blur-[2px]">
            <img
              className="absolute left-[587px] top-[51px] h-[161px] w-[268px] object-contain"
              src={IMG.logo4}
              alt="DLE Entertainment"
              onError={(e) => { e.currentTarget.src = '/dlelogo/dle-logo-sm.png' }}
            />
            <h2 className="absolute left-[630px] top-[218px] w-[268px] text-center text-xl font-bold text-white"
                style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
              DO LIFE ELECTRIC
            </h2>
            <p className="absolute left-[329px] top-[280px] w-[785px] text-center text-xl font-medium leading-[28px] text-white"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}>
              IS AN ELITE ENTERTAINMENT COMPANY PROVIDING INFRASTRUCTURE FOR
              ARTISTS WHO CHOOSE TO LIGHT UP THE WORLD.
            </p>
            <p className="absolute left-[342px] top-[375px] w-[757px] text-center text-xl leading-[26px] text-white/90"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              We build platforms, create opportunities, and power the careers of
              tomorrow&apos;s most compelling talents. From vocal powerhouses to
              master producers, DLE is the home for artists who refuse to dim their
              light.
              <br /><br />
              Our fan support platform allows supporters worldwide to send gifts,
              food, clothing, and direct financial support to their favorite
              artists — securely, transparently, and with 100% of funds routed
              through DLE&apos;s official PayMongo accounts before being distributed
              to artists according to their contracts.
              <br /><br />
              Every play. Every download. Every gift. Every show. We turn voltage
              into velocity for the artists who carry the current.
            </p>

            <div className="absolute bottom-[50px] left-[343px] flex gap-[30px]">
              {[
                ['100%', 'Secure payments via PayMongo, BSP-licensed'],
                ['24/7',  'Artist support & fan engagement'],
                ['GLOBAL','Fan community from anywhere in the world'],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="h-[215px] w-[232px] rounded-[10px] border-[3px] border-black bg-[linear-gradient(180deg,#fff_0%,#d7d7d7_100%)] p-4 text-center text-[#4d3d15]"
                >
                  <strong
                    className={`block font-bold leading-none ${title === 'GLOBAL' ? 'text-[50px]' : 'text-[70px]'}`}
                    style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}
                  >
                    {title}
                  </strong>
                  <p className="mt-4 text-xl font-medium leading-[24px] text-[#4d3d15]"
                     style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* ========================= FAQ ========================= */}
        <section id="faq" className="relative h-[1354px] overflow-hidden bg-[#141414]">
          <img
            className="absolute inset-0 h-[1409px] w-full object-cover opacity-60"
            src={IMG.faqTex} alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="absolute left-[172px] top-[150px] h-[1142px] w-[1575px] rounded-[20px] border-[10px] border-[#4d3c13] bg-[#ae955c4d]" />
          <div className="absolute left-[264px] top-[64px] h-[137px] w-[1396px] rounded-[20px] border-[5px] border-[#5b4d2a] bg-[#4d3c13]" />
          <h2 className="absolute left-[421px] top-[117px] w-[1080px] text-center text-[50px] font-bold leading-[50px] text-white"
              style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
            SUPPORT FREQUENTLY ASKED QUESTIONS
          </h2>

          <div className="absolute left-[269px] top-[235px] w-[1369px]">
            {faqItems.map(([question, answer], index) => (
              <div key={question} className="border-t-[3px] border-white">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  aria-expanded={activeFaq === index}
                  className="flex min-h-[107px] w-full items-center justify-center px-6 text-center text-3xl text-white transition-colors hover:text-[#e6cc7a]"
                  style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {question}
                </button>
                {activeFaq === index && (
                  <p className="px-6 pb-6 text-center text-xl leading-relaxed text-white/90"
                     style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                    {answer}
                  </p>
                )}
              </div>
            ))}
            <div className="border-t-[3px] border-white pt-16 text-center text-[40px] text-white"
                 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Still have questions?{' '}
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="font-bold underline hover:text-[#e6cc7a]"
                style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}
              >
                Contact us.
              </button>
            </div>
          </div>
        </section>

        {/* ========================= CONTACT ========================= */}
        <section id="contact" className="relative h-[747px] bg-[#141414]">
          <div className="absolute left-[198px] top-[77px] h-[568px] w-[1548px] overflow-hidden rounded-[240px_0px_240px_0px] border-[10px] border-[#4f3e17] bg-[#7d642b]">
            <img
              className="absolute -left-[30px] -top-[30px] h-[628px] w-[1608px] object-cover mix-blend-overlay opacity-80"
              src={IMG.mask} alt=""
              onError={(e) => {
                e.currentTarget.src = '/uploads/images/home/contact-bg.png'
                e.currentTarget.onerror = () => { e.currentTarget.src = '/uploads/Contact Background photo.png' }
              }}
            />
          </div>

          <div className="absolute left-[361px] top-[140px] w-[700px] text-white">
            <p className="text-xl leading-4" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              GET IN TOUCH
            </p>
            <h2 className="mt-[35px] text-[50px] font-bold leading-[50px]"
                style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
              CONTACT US
            </h2>
            <p className="mt-4 text-[15px] text-white/85"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              Sign in with Google required to send messages (prevents spam)
            </p>
            <a
              href="mailto:info@dle-entertainment.com"
              className="mt-7 flex h-[50px] w-[207px] items-center justify-center rounded-[50px] bg-white text-center text-[25px] text-black transition-opacity hover:opacity-90"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}
            >
              DIRECT EMAIL
            </a>
            <p className="mt-3 text-[25px]"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              info@dle-entertainment.com
            </p>
            <p className="mt-3 text-[25px]"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              dle-entertainment.com
            </p>
            <p className="mt-12 w-[658px] text-[25px] leading-[32px]"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              For business inquiries, artist submissions, or fan support questions
              — sign in and send us a message using the form, or email us directly.
              <br />
              For urgent donation/refund issues, please include your PayMongo
              reference number in your message.
            </p>
          </div>

          <div className="absolute left-[1094px] top-[105px] h-[470px] w-[584px] rounded-[50px] border-[5px] border-[#4f3e17] bg-black">
            <img
              className="absolute left-0 top-[56px] h-[178px] w-[556px] object-contain opacity-30"
              src={IMG.vector2} alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <h3 className="absolute left-[147px] top-[105px] w-[300px] text-center text-3xl font-bold text-white"
                style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
              {signedIn ? 'SIGNED IN' : 'SIGN IN REQUIRED'}
            </h3>
            <p className="absolute left-[45px] top-[160px] w-[484px] text-center text-xl leading-[26px] text-white/90"
               style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
              {signedIn
                ? 'You are ready to send a message to DLE Entertainment.'
                : 'To help prevent spam and protect our inbox, please sign in with your Google account before sending a message. It only takes a second — we never post anything to your account.'}
            </p>
            <button
              type="button"
              onClick={() => signedIn ? (window.location.href = '/contact') : signIn('google')}
              className="absolute bottom-[75px] left-[67px] flex h-20 w-[439px] items-center justify-center gap-3 rounded-[10px] bg-[linear-gradient(90deg,#4d3c14_0%,#7d642b_100%)] text-xl font-bold text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}
            >
              <img
                className="h-[41px] w-[41px] object-contain"
                src={IMG.google}
                alt=""
                onError={(e) => {
                  // Inline Google G fallback so button never looks broken
                  e.currentTarget.outerHTML =
                    '<svg width="32" height="32" viewBox="0 0 48 48" style="flex:0 0 auto"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.8 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.8 6.1 29.1 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13.1-5.1l-6.1-5.2C29 35.4 26.6 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5.2C41.2 36.1 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>'
                }}
              />
              {signedIn ? 'CONTINUE TO CONTACT FORM' : 'SIGN IN WITH GOOGLE'}
            </button>
          </div>
        </section>

        {/* ========================= FOOTER ========================= */}
        <footer className="relative h-[1193px] border-[5px] border-[#7d642b] bg-[#141414]">
          <img
            className="absolute left-[825px] top-[55px] h-[191px] w-[257px] object-contain"
            src={IMG.logo5}
            alt="DLE Entertainment"
            onError={(e) => { e.currentTarget.src = '/dlelogo/dle-logo.png' }}
          />
          <p className="absolute left-[403px] top-[291px] w-[1114px] text-center text-3xl text-white/95"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 }}>
            Do Life Electric — Elite infrastructure for those who choose to light up the world.
          </p>
          <div className="absolute left-32 top-[432px] h-[3px] w-[1651px] bg-white" />
          <div className="absolute left-[183px] top-[514px] grid grid-cols-3 gap-x-[360px] text-white">
            {footerColumns.map(([heading, links]) => (
              <section key={heading} className="w-[230px] text-3xl leading-[38.4px]">
                <h2 className="mb-[30px] font-bold"
                    style={{ fontFamily: "'Helvetica Neue', 'Montserrat', sans-serif", fontWeight: 700 }}>
                  {heading}
                </h2>
                {links.map((link) => {
                  const isExternal = /@|dle-entertainment\.com$/.test(link)
                  if (isExternal) {
                    const href = link.includes('@') ? `mailto:${link}` : `https://${link}`
                    return (
                      <a key={link} href={href}
                         className="block text-left text-white/90 hover:text-[#e6cc7a] transition-colors"
                         style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                        {link}
                      </a>
                    )
                  }
                  return (
                    <button
                      type="button"
                      key={link}
                      onClick={() => {
                        const map = { FAQ: 'faq', Contact: 'contact', Support: 'contact', Music: 'music', Artists: 'talents', 'About Us': 'about' }
                        scrollToSection(map[link] || 'about')
                      }}
                      className="block text-left text-white/90 hover:text-[#e6cc7a] transition-colors"
                      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                    >
                      {link}
                    </button>
                  )
                })}
              </section>
            ))}
          </div>
          <div className="absolute left-32 top-[849px] h-[3px] w-[1651px] bg-white" />
          <p className="absolute left-[575px] top-[925px] w-[770px] text-center text-3xl text-white/95"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            © 2026 DLE ENTERTAINMENT. ALL RIGHTS RESERVED.
          </p>
          <p className="absolute left-[858px] top-[1030px] text-3xl text-white/95"
             style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Do Life Electric
          </p>
        </footer>

      </div>

      {/* Scale the fixed 1920 canvas to fit browser width on large screens; horizontal scroll on small */}
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @media (min-width: 1280px) {
          /* optional: could transform-scale here, but horizontal scroll preserves pixel fidelity */
        }
      `}</style>
    </main>
  )
}
