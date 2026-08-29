'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import {
  Users, Music, BarChart3, Search, Trash2, Edit, X, Shield, UserPlus, UserMinus,
  Crown, Download, Activity, Play, DownloadCloud, Trash, ArrowLeft, Sparkles,
  TrendingUp, Eye, EyeOff, Home, LayoutDashboard, LineChart, Check, Clock,
  Disc3, Tag, Plus, Terminal, MessageSquare, Send, Lock, Wifi,
  Megaphone, Calendar, CalendarClock, Video, Image as ImageIcon, Timer,
  Upload as UploadIcon, MousePointerClick,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

/* =========================================================================
   DLE Admin Dashboard — Cinematic, professional, theme-aware.
   Tabs: Overview, Artists, Music, Plays & Downloads, Gifts, Announcements, Admins.
   Super admin can grant analytics/announcements permissions so specific admins
   can view those areas. Delete-actions always stay owner-only.
   ========================================================================= */

async function safeFetch(url, fallback) {
  try {
    const res = await fetch(url)
    if (res.status === 503) {
      const data = await res.json().catch(() => null)
      return (data && typeof data === 'object' && Array.isArray(fallback))
        ? fallback
        : (data ?? fallback)
    }
    return res.json()
  } catch (_) {
    return fallback
  }
}

const formatPHP = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [artists, setArtists] = useState([])
  const [tracks, setTracks] = useState([])
  const [genres, setGenres] = useState([])
  const [admins, setAdmins] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbDown, setDbDown] = useState(false)

  const isSuperAdmin = !!session?.user?.isSuperAdmin
  const isPrimaryOwner = !!session?.user?.isPrimaryOwner
  const perms = session?.user?.permissions || {}
  const canMusic = isSuperAdmin || perms.music === true
  const canArtists = isSuperAdmin || perms.artists !== false
  const canDonations = isSuperAdmin || perms.donations === true
  const canAnalytics = isSuperAdmin || perms.analytics === true
  const canAnnouncements = isSuperAdmin || perms.announcements === true
  const canManageAdmins = isPrimaryOwner // ONLY the primary (founder) owner can add/remove/promote admins
  const isAdmin = !!session?.user?.isAdmin

  const tabs = useMemo(() => {
    const t = [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }]
    if (canArtists) t.push({ id: 'artists', label: 'Artists', icon: Users })
    if (canMusic) t.push({ id: 'music', label: 'Music', icon: Music })
    if (canAnalytics) t.push({ id: 'musicactivity', label: 'Plays & Downloads', icon: Activity })
    if (canDonations) t.push({ id: 'donations', label: 'Gifts', icon: BarChart3 })
    if (canAnnouncements) t.push({ id: 'announcements', label: 'Announcements', icon: Megaphone })
    if (canManageAdmins) t.push({ id: 'admins', label: 'Admins', icon: Shield })
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canArtists, canMusic, canDonations, canAnalytics, canAnnouncements, canManageAdmins])

  useEffect(() => {
    // Auto-redirect removed — unauthenticated visitors see the DevChat screen
    // and can click "Authenticate with Google" there to sign in.
  }, [status, router])

  useEffect(() => {
    if (!isAdmin) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (!tabs.length) return
    if (!tabs.find(t => t.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  const loadAll = async () => {
    setLoading(true)
    const [st, a, m, g, ad, an] = await Promise.all([
      safeFetch('/api/admin/stats', { ok: false }),
      safeFetch('/api/artists', []),
      canMusic ? safeFetch('/api/music', []) : Promise.resolve([]),
      canMusic ? safeFetch('/api/genres', []) : Promise.resolve([]),
      canManageAdmins ? safeFetch('/api/admins', []) : Promise.resolve([]),
      canAnnouncements ? safeFetch('/api/announcements/admin', { announcements: [] }) : Promise.resolve({ announcements: [] }),
    ])
    const any503 =
      (st && st.dbDown === true) ||
      (a && typeof a === 'object' && 'dbDown' in a && a.dbDown) ||
      (m && typeof m === 'object' && 'dbDown' in m && m.dbDown) ||
      (g && typeof g === 'object' && 'dbDown' in g && g.dbDown) ||
      (ad && typeof ad === 'object' && 'dbDown' in ad && ad.dbDown)
    setDbDown(any503 === true)
    setStats(st && st.ok ? st : null)
    setArtists(Array.isArray(a) ? a : [])
    setTracks(Array.isArray(m) ? m : [])
    setGenres(Array.isArray(g) ? g : [])
    setAdmins(Array.isArray(ad) ? ad : [])
    setAnnouncements(Array.isArray(an?.announcements) ? an.announcements : [])
    setLoading(false)
  }

  if (status === 'loading' || !session) {
    return <DevChat mode="unauthenticated" />
  }
  if (!isAdmin) {
    return <DevChat mode="forbidden" userEmail={session?.user?.email} userName={session?.user?.name} />
  }

  const userName = session.user.name || session.user.email?.split('@')[0] || 'Admin'
  const roleBadge = isPrimaryOwner
    ? { label: 'Owner', cls: 'chip-owner', icon: Crown }
    : isSuperAdmin
      ? { label: 'Co-Owner', cls: 'chip-owner', icon: Crown }
      : canAnalytics && canMusic && canDonations
        ? { label: 'Senior Admin', cls: 'chip-admin', icon: Shield }
        : { label: 'Admin', cls: 'chip-admin', icon: Shield }

  return (
    <>
      <style jsx global>{`
        .admin-mobile { word-break: break-word; }
        .admin-mobile table { border-collapse: separate; border-spacing: 0; }
        .admin-mobile td, .admin-mobile th { word-break: normal; }
        .admin-mobile input[type="file"] { max-width: 100%; }
        @media (max-width: 639px) {
          .admin-mobile table th,
          .admin-mobile table td { padding: 8px 6px !important; }
          .admin-mobile table th { font-size: 9px !important; letter-spacing: 0.06em !important; }
          .admin-mobile table td { font-size: 11px !important; }
          .admin-mobile table td .text-sm { font-size: 12px !important; }
          .admin-mobile table td .text-xs { font-size: 10px !important; }
          .admin-mobile .form-input { font-size: 16px !important; padding: 10px 12px !important; }
          .admin-mobile h1 { word-break: break-word; font-size: 1.5rem !important; }
          .admin-mobile h3 { font-size: 1rem !important; }
          .admin-mobile .btn-gold,
          .admin-mobile .btn-dark { min-height: 40px; font-size: 11px !important; }
          .admin-mobile img.avatar-sm { width: 36px !important; height: 36px !important; }
          .admin-mobile textarea.form-input { font-size: 14px !important; }
          .admin-mobile select.form-input { font-size: 14px !important; }
          .admin-mobile label { font-size: 12px !important; }
          .admin-mobile .space-y-4 > * + * { margin-top: 0.85rem !important; }
          .admin-mobile audio, .admin-mobile video, .admin-mobile img { max-width: 100% !important; }
          .admin-mobile .max-h-\\[600px\\] { max-height: 360px !important; }
        }
      `}</style>

      <div className="py-4 px-3 sm:py-8 sm:px-6 lg:py-10 lg:px-8 max-w-7xl mx-auto pb-28 admin-mobile w-full min-w-0 overflow-x-hidden">

        {/* ==================== HERO ==================== */}
        <div className="admin-hero rounded-sm p-5 sm:p-7 md:p-8 mb-6 md:mb-8">
          <div className="relative z-[1] flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex-shrink-0"
                  style={{ border: '2px solid var(--gold)' }}
                />
              ) : (
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 gold-text font-display text-xl"
                  style={{ background: 'var(--gold-dim)', border: '2px solid var(--gold)' }}
                >
                  {userName[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Sparkles size={12} className="text-gold" />
                  <span className={`chip ${roleBadge.cls}`}>
                    <roleBadge.icon size={10} />
                    {roleBadge.label}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] gold-text font-semibold">
                    Admin Control Panel
                  </span>
                </div>
                <h1
                  className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase leading-none break-words"
                  style={{ color: 'var(--text)' }}
                >
                  Welcome, {userName.split(' ')[0]}
                </h1>
                <p className="text-xs sm:text-sm mt-2 truncate" style={{ color: 'var(--text-muted)' }}>
                  Signed in as <span className="font-medium" style={{ color: 'var(--text)' }}>{session.user.email}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <Link href="/" className="btn-dark text-xs inline-flex items-center gap-2">
                <Home size={13} /> View Site
              </Link>
              <button
                onClick={loadAll}
                className="btn-dark text-xs inline-flex items-center gap-2"
                title="Refresh data"
              >
                <Sparkles size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick-stat strip (compact, in hero) */}
          <div className="relative z-[1] grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-6">
            <QuickStat
              icon={Users}
              label="Artists"
              value={stats && canArtists ? (stats.artists ?? 0) : '—'}
            />
            <QuickStat
              icon={Music}
              label="Tracks"
              value={stats && canMusic ? (stats.tracks ?? 0) : '—'}
            />
            {canMusic && (
              <QuickStat
                icon={Disc3}
                label="Genres"
                value={stats && canMusic ? (stats.genres ?? 0) : '—'}
              />
            )}
            <QuickStat
              icon={BarChart3}
              label="Total Gifts"
              value={stats && canDonations ? (stats.totalGifts ?? 0) : '—'}
              sub={stats && canDonations && stats.totalRevenue ? formatPHP(stats.totalRevenue / 100) + ' revenue' : null}
            />
            <QuickStat
              icon={Play}
              label="Total Plays"
              value={stats && canAnalytics ? (stats.totalPlays ?? 0).toLocaleString() : '—'}
              sub={stats && canAnalytics && typeof stats.uniqueListeners === 'number'
                ? `${stats.uniqueListeners.toLocaleString()} unique listeners`
                : null}
              gold
            />
          </div>
        </div>

        {dbDown && (
          <Callout tone="red" icon={Shield}>
            <strong className="font-semibold">Database is currently unreachable.</strong>{' '}
            Sign-in still works, but artists / tracks / gifts data cannot be loaded or edited right now.
            Wait a moment and refresh — if this persists, run{' '}
            <code className="px-1 py-0.5 rounded-sm text-[11px]" style={{ background: 'rgba(0,0,0,0.35)' }}>
              node test-db.js
            </code>{' '}
            in PowerShell. The most common Windows cause is antivirus HTTPS/TLS scanning blocking MongoDB Atlas.
          </Callout>
        )}

        {/* ==================== TABS ==================== */}
        <div className="mb-5 sm:mb-7 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 w-[calc(100%+1.5rem)] sm:w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="admin-tabs-pro">
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className={active ? 'active' : ''}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-dim)' }}>
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest">Loading dashboard…</p>
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <OverviewView stats={stats} onTab={setTab} perms={{ canArtists, canMusic, canDonations, canAnalytics, canAnnouncements, isSuperAdmin, isPrimaryOwner, canManageAdmins }} />
            )}
            {tab === 'artists' && (canArtists
              ? <ArtistsManager artists={artists} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Artists" description="You don't have artist management permission." />)}
            {tab === 'music' && (canMusic
              ? <MusicManager tracks={tracks} genres={genres} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Music Management" description="You don't have music upload permission. Ask the owner to grant it." />)}
            {tab === 'musicactivity' && (canAnalytics
              ? <MusicActivityView isSuperAdmin={isSuperAdmin} dbDown={dbDown} />
              : <NoAccessMessage feature="Plays & Downloads" description="You don't have permission to view listener analytics. Ask the owner to grant it." />)}
            {tab === 'donations' && (canDonations
              ? <DonationsView isSuperAdmin={isSuperAdmin} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Gifts & Reports" description="You don't have access to gift data. Ask the owner to grant it." />)}
            {tab === 'announcements' && (canAnnouncements
              ? <AnnouncementsManager announcements={announcements} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Announcements" description="You don't have permission to manage announcements." />)}
            {tab === 'admins' && (canManageAdmins
              ? <AdminsManager />
              : <NoAccessMessage feature="Admin Management" description="Only the primary owner can add, remove, or promote admins and co-owners." />)}
          </>
        )}
      </div>
    </>
  )
}

/* ---------- Helpers ---------- */

function QuickStat({ icon: Icon, label, value, sub, gold }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderLeft: gold ? '2px solid var(--gold)' : '2px solid var(--border)', paddingLeft: '0.9rem' }}>
      <div className="admin-stat-icon flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--text-dim)' }}>{label}</p>
        <p className={`font-display text-xl sm:text-2xl leading-tight ${gold ? 'gold-text' : ''}`} style={gold ? {} : { color: 'var(--text)' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function NoAccessMessage({ feature, description }) {
  return (
    <div className="py-12 sm:py-20 text-center surface-card p-8 sm:p-12 rounded-sm">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-dim)' }}>
        <Shield size={28} className="gold-text" />
      </div>
      <p className="font-display text-xl sm:text-2xl uppercase mb-3" style={{ color: 'var(--text)' }}>{feature}</p>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle, count, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4 sm:mb-5">
      <div>
        <h3 className="font-display text-xl sm:text-2xl uppercase flex items-center gap-2" style={{ color: 'var(--text)' }}>
          {Icon && <Icon size={18} className="gold-text" />}
          {title}
          {typeof count === 'number' && (
            <span className="text-xs sm:text-sm font-normal px-2 py-0.5 ml-1" style={{ color: 'var(--text-muted)', background: 'var(--gold-dim)', borderRadius: 4 }}>
              {count}
            </span>
          )}
        </h3>
        {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-3 sm:mb-4">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
      <input type="text" placeholder={placeholder} value={value} onChange={onChange} className="form-input pl-10 text-sm" />
    </div>
  )
}

function EmptyState({ message, emoji = '📭' }) {
  return (
    <div className="text-center py-10 surface-card rounded-sm">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}

function ListItemAvatar({ letter, src }) {
  return src
    ? <img src={src} className="w-11 h-11 sm:w-12 sm:h-12 object-cover flex-shrink-0 rounded-sm" style={{ border: '1px solid var(--border)' }} />
    : <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 font-display text-xl rounded-sm" style={{ background: 'var(--bg-elev)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>{letter}</div>
}

function StatCard({ label, value, sub, icon: Icon, accent = 'default' }) {
  const colorMap = {
    default: { color: 'var(--text)' },
    gold: { color: 'var(--gold)' },
    green: { color: '#34d399' },
    yellow: { color: '#fbbf24' },
    blue: { color: '#60a5fa' },
    red: { color: '#f87171' },
  }
  return (
    <div className="admin-stat-card pro rounded-sm">
      <div className="flex items-start justify-between relative z-[1]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--text-dim)' }}>{label}</p>
          <p className="font-display text-2xl sm:text-3xl mt-1.5 sm:mt-2" style={accent === 'gold' ? { color: 'var(--gold)' } : colorMap[accent]}>
            {value}
          </p>
          {sub && <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{sub}</p>}
        </div>
        {Icon && (
          <div className="admin-stat-icon flex-shrink-0 ml-3">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}

function Callout({ tone = 'info', icon: Icon, children }) {
  const tones = {
    info:   { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)', text: '#93c5fd' },
    gold:   { bg: 'var(--gold-dim)',         border: 'var(--gold)',          text: 'var(--gold)' },
    red:    { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', text: '#fca5a5' },
    green:  { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
  }
  const t = tones[tone]
  return (
    <div className="text-xs sm:text-sm p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-2.5 rounded-sm" style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.text }}>
      {Icon && <Icon size={15} className="flex-shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  )
}

function IoSSwitch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); if (!disabled) onChange(!on) }}
      className={`ios-switch ${on ? 'on' : ''}`}
      disabled={disabled}
      aria-pressed={on}
    />
  )
}

/* =========================================================================
   DEV CHAT — cinematic "secure line" access screen for unauthenticated
   visitors and non-admin users. Feels like you're messaging the developer.
   ========================================================================= */
const DEV_SCRIPTS = {
  unauthenticated: [
    { who: 'dev', text: "Hey. You found the back door." },
    { who: 'dev', text: "This is DLE Entertainment's admin control panel." },
    { who: 'dev', text: "Before I let you in — I need to know who you are." },
  ],
  forbidden: [
    { who: 'dev', text: "Hmm. I see you, stranger." },
    { who: 'dev', text: "You're signed in… but your name isn't on the guest list." },
    { who: 'dev', text: "This console is locked down. Artists, tracks, gifts, analytics — all of it." },
  ],
}

const QUICK_REPLIES = {
  unauthenticated: [
    { after: 3, text: "Who are you?", reply: "I'm Sam — the developer who built this. Nice to meet you." },
    { after: 4, text: "Let me in.", reply: "Can't do that until you authenticate. Google Sign-In takes two seconds." },
    { after: 5, text: "I'm supposed to be here.", reply: "Then sign in with the Google account Sam added to the admin list. I'll let you straight in." },
  ],
  forbidden: [
    { after: 3, text: "Can you give me access?", reply: "Only Sam (the owner) can grant admin access. Message him directly." },
    { after: 4, text: "I think this is a mistake.", reply: "If you should have access, reach out to Sam and ask him to add your email to the admin list." },
    { after: 5, text: "Take me back home.", reply: "No problem. Hit the button below and we'll get you out of here." },
  ],
}

function DevChat({ mode = 'unauthenticated', userEmail, userName }) {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [availableReplies, setAvailableReplies] = useState([])
  const [stage, setStage] = useState(0) // 0: intro typing, 1: awaiting reply, 2+: convo progressing
  const [booted, setBooted] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Boot sequence
  useEffect(() => {
    let cancelled = false
    const bootLines = [
      { delay: 200, text: '> establishing secure channel…', className: 'text-white/40' },
      { delay: 600, text: '> handshake: TLS_ECDHE_RSA_WITH_AES_256_GCM', className: 'text-white/40' },
      { delay: 1000, text: '> DLE ENTERTAINMENT · INTERNAL CONTROL PANEL', className: 'gold-text font-bold' },
      { delay: 1500, text: '> connection encrypted · logs monitored', className: 'text-white/40' },
    ]
    bootLines.forEach((b, i) => {
      setTimeout(() => {
        if (cancelled) return
        setMessages(m => [...m, { who: 'system', text: b.text, className: b.className, mono: true }])
        if (i === bootLines.length - 1) {
          setTimeout(() => {
            if (cancelled) return
            setBooted(true)
            startConversation()
          }, 400)
        }
      }, b.delay)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addDevMessage = (text, opts = {}) => {
    setTyping(true)
    const typeTime = Math.min(1800, 400 + text.length * 25)
    return new Promise(resolve => {
      setTimeout(() => {
        setTyping(false)
        setMessages(m => [...m, { who: 'dev', text, ...opts }])
        resolve()
      }, typeTime)
    })
  }

  const startConversation = async () => {
    const script = DEV_SCRIPTS[mode] || DEV_SCRIPTS.unauthenticated
    if (mode === 'forbidden' && userEmail) {
      await addDevMessage(`Signed-in account: ${userEmail}` + (userName ? ` (${userName})` : ''), { mono: true, dim: true })
      await new Promise(r => setTimeout(r, 400))
    }
    for (const line of script) {
      await addDevMessage(line.text)
      await new Promise(r => setTimeout(r, 350))
    }
    setAvailableReplies(QUICK_REPLIES[mode] || [])
    setStage(1)
  }

  const handleQuickReply = async (reply) => {
    // Push the user's message
    setMessages(m => [...m, { who: 'user', text: reply.text }])
    setAvailableReplies([])
    await new Promise(r => setTimeout(r, 300))
    await addDevMessage(reply.reply)
    // Show the CTA after a beat
    await new Promise(r => setTimeout(r, 500))
    setStage(2)
  }

  const handleFreeSend = async (e) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return
    setMessages(m => [...m, { who: 'user', text }])
    setInputValue('')
    setAvailableReplies([])
    await new Promise(r => setTimeout(r, 300))
    const canned = [
      "Got it. I'm logging this on my end.",
      "Interesting. Sam will take a look.",
      "I'll pass that along. In the meantime, you need proper credentials to go further.",
      "Right. Hit that authenticate button if you want in, otherwise the home page is that way 👇",
    ]
    await addDevMessage(canned[Math.floor(Math.random() * canned.length)])
    await new Promise(r => setTimeout(r, 400))
    setStage(2)
  }

  const goHome = () => router.push('/')
  const goLogin = () => router.push('/login?callbackUrl=/admin')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" style={{ background: '#050505' }}>
      <div className="w-full max-w-2xl my-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 rounded-t-sm font-mono text-[10px] sm:text-xs uppercase tracking-widest"
          style={{ background: '#0c0c0c', borderBottom: '1px solid #1a1a1a', color: '#6B6558' }}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500/70" />
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500/70" />
            <span className="inline-block w-2 h-2 rounded-full bg-green-500/70" />
            <span className="ml-2 hidden sm:inline">dle-secure-chat.sh</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Wifi size={10} /> ENCRYPTED</span>
            <Lock size={10} />
          </div>
        </div>

        {/* Chat body */}
        <div className="px-3 sm:px-5 py-4 sm:py-6 max-h-[75vh] overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)' }}
          id="dev-chat-scroll">
          {/* Messages */}
          <div className="space-y-3">
            {messages.map((m, i) => {
              if (m.who === 'system') {
                return (
                  <div key={i} className={`font-mono text-[11px] sm:text-xs ${m.className || 'text-white/50'}`}>
                    {m.text}
                  </div>
                )
              }
              if (m.who === 'dev') {
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold gold-text"
                      style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                      <Terminal size={14} />
                    </div>
                    <div className="max-w-[75%]">
                      <div className="text-[10px] uppercase tracking-widest font-semibold mb-1 gold-text">
                        Sam · Developer
                      </div>
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm"
                        style={{ background: '#141414', color: '#E8E3D5', border: '1px solid #1f1f1f' }}>
                        {m.mono ? (
                          <span className="font-mono text-xs" style={{ color: m.dim ? '#6B6558' : '#C9A84C' }}>{m.text}</span>
                        ) : m.text}
                      </div>
                    </div>
                  </div>
                )
              }
              // user
              return (
                <div key={i} className="flex items-start gap-2.5 justify-end">
                  <div className="max-w-[75%]">
                    <div className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-right"
                      style={{ color: 'var(--text-muted)' }}>
                      You
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm text-dark"
                      style={{ background: 'var(--gold)' }}>
                      {m.text}
                    </div>
                  </div>
                  <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#1a1a1a', color: 'var(--gold)', border: '1px solid #2a2a2a' }}>
                      <MessageSquare size={13} />
                    </div>
                </div>
              )
            })}

            {typing && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center gold-text"
                  style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                  <Terminal size={14} />
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: '#141414', border: '1px solid #1f1f1f' }}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {booted && stage === 1 && availableReplies.length > 0 && !typing && (
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              {availableReplies.map((r, i) => (
                <button key={i}
                  onClick={() => handleQuickReply(r)}
                  className="px-3 py-1.5 text-xs rounded-full transition-all hover:scale-[1.03]"
                  style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
                  {r.text}
                </button>
              ))}
            </div>
          )}

          {/* Free input — after quick replies are exhausted */}
          {booted && stage === 2 && !typing && (
            <form onSubmit={handleFreeSend} className="mt-5 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-black/60 px-3.5 py-2.5 text-sm rounded-full outline-none font-mono"
                style={{ border: '1px solid #1f1f1f', color: '#E8E3D5' }}
                autoFocus
              />
              <button type="submit"
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                style={{ background: 'var(--gold)', color: '#0A0A0A' }}>
                <Send size={15} className="ml-0.5" />
              </button>
            </form>
          )}
        </div>

        {/* Action bar */}
        <div className="px-4 py-4 rounded-b-sm flex flex-col sm:flex-row gap-2.5"
          style={{ background: '#0c0c0c', borderTop: '1px solid #1a1a1a' }}>
          {mode === 'unauthenticated' ? (
            <>
              <button onClick={goLogin}
                className="flex-1 btn-gold py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2">
                <Shield size={14} /> Authenticate with Google
              </button>
              <button onClick={goHome}
                className="btn-dark px-5 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Back to Site
              </button>
            </>
          ) : (
            <>
              <a href="mailto:ssammuelbarrientos@gmail.com?subject=Admin%20Access%20Request%20-%20DLE%20Entertainment"
                className="flex-1 btn-gold py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2 text-center">
                <MessageSquare size={14} /> Email Sam for Access
              </a>
              <button onClick={goHome}
                className="btn-dark px-5 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Back to Site
              </button>
            </>
          )}
        </div>

        {/* Footer line */}
        <p className="text-center text-[10px] font-mono mt-3 tracking-wider" style={{ color: '#3d3830' }}>
          DLE ENTERTAINMENT · UNAUTHORIZED ACCESS IS LOGGED · v1.0
        </p>
      </div>

      <style jsx>{`
        #dev-chat-scroll::-webkit-scrollbar { width: 6px; }
        #dev-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        #dev-chat-scroll::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 3px; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .animate-bounce { animation: bounce 1s infinite; }
      `}</style>
    </div>
  )
}

/* =========================================================================
   OVERVIEW
   ========================================================================= */
function OverviewView({ stats, onTab, perms }) {
  const spark = stats?.sparkline || []
  const maxPlays = Math.max(1, ...spark.map(s => s.plays))
  const maxDowns = Math.max(1, ...spark.map(s => s.downloads))
  const overallMax = Math.max(maxPlays, maxDowns)

  const quickLinks = []
  if (perms.canArtists) quickLinks.push({ id: 'artists', label: 'Artists', icon: Users, desc: 'Manage artists & groups' })
  if (perms.canMusic) quickLinks.push({ id: 'music', label: 'Music', icon: Music, desc: 'Upload tracks & manage genres' })
  if (perms.canAnalytics) quickLinks.push({ id: 'musicactivity', label: 'Analytics', icon: Activity, desc: 'Plays & downloads' })
  if (perms.canDonations) quickLinks.push({ id: 'donations', label: 'Gifts', icon: BarChart3, desc: 'View fan gifts' })
  if (perms.canAnnouncements) quickLinks.push({ id: 'announcements', label: 'Announcements', icon: Megaphone, desc: 'Pop-up greetings & promos' })
  if (perms.canManageAdmins) quickLinks.push({ id: 'admins', label: 'Admins', icon: Shield, desc: 'Manage admins & co-owners' })

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {perms.canArtists && (
          <StatCard label="Total Artists" value={(stats?.artists ?? 0).toLocaleString()} icon={Users} accent="gold" />
        )}
        {perms.canMusic && (
          <StatCard label="Total Tracks" value={(stats?.tracks ?? 0).toLocaleString()} icon={Music} />
        )}
        {perms.canMusic && (
          <StatCard label="Genres" value={(stats?.genres ?? 0).toLocaleString()} icon={Disc3} />
        )}
        {perms.canAnalytics && (
          <StatCard
            label="Plays (Last 7 days)"
            value={(stats?.playsLast7 ?? 0).toLocaleString()}
            sub={`${(stats?.totalPlays ?? 0).toLocaleString()} all-time`}
            icon={Play}
            accent="green"
          />
        )}
        {perms.canAnalytics && (
          <StatCard
            label="Downloads (7d)"
            value={(stats?.downloadsLast7 ?? 0).toLocaleString()}
            sub={`${(stats?.uniqueListeners ?? 0).toLocaleString()} unique listeners`}
            icon={DownloadCloud}
            accent="blue"
          />
        )}
        {perms.canDonations && (
          <StatCard
            label="Total Revenue"
            value={formatPHP((stats?.totalRevenue ?? 0) / 100)}
            sub={`${formatPHP((stats?.revenueLast30 ?? 0) / 100)} in last 30 days`}
            icon={BarChart3}
            accent="gold"
          />
        )}
        {perms.canDonations && (
          <StatCard
            label="Gifts Received"
            value={(stats?.totalGifts ?? 0).toLocaleString()}
            sub={`${stats?.giftsLast30 ?? 0} completed last 30d`}
            icon={BarChart3}
          />
        )}
        {perms.canAnnouncements && (
          <StatCard
            label="Active Pop-ups"
            value={(stats?.announcements ?? 0).toLocaleString()}
            sub="Site-wide greetings"
            icon={Megaphone}
          />
        )}
        {perms.isSuperAdmin && (
          <StatCard
            label="Team Admins"
            value={(stats?.adminCount ?? 0).toLocaleString()}
            sub="Managed accounts"
            icon={Shield}
          />
        )}
      </div>

      {/* Sparkline */}
      {perms.canAnalytics && spark.length > 0 && (
        <div className="surface-card p-4 sm:p-6 rounded-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-lg sm:text-xl uppercase flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <LineChart size={18} className="gold-text" /> Listener Activity — Last 7 Days
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                ▶ Plays &nbsp;·&nbsp; <span style={{ color: '#60a5fa' }}>⬇ Downloads</span>
              </p>
            </div>
            <button
              onClick={() => onTab('musicactivity')}
              className="text-[11px] uppercase tracking-widest font-semibold gold-text hover:opacity-80 flex items-center gap-1"
            >
              View All <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
          <div className="flex items-end gap-1 sm:gap-2 h-[90px] sm:h-[110px] px-1">
            {spark.map((d, i) => (
              <div key={i} className="spark-bar" title={`${d.label}: ${d.plays} plays, ${d.downloads} downloads`}>
                <div className="w-full flex items-end justify-center gap-[2px] h-full">
                  <div
                    className="bar"
                    style={{ height: `${(d.plays / overallMax) * 100}%`, minHeight: d.plays > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="bar down"
                    style={{ height: `${(d.downloads / overallMax) * 100}%`, minHeight: d.downloads > 0 ? '4px' : '0' }}
                  />
                </div>
                <div className="lbl">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="surface-card p-4 sm:p-6 rounded-sm">
        <h3 className="font-display text-lg sm:text-xl uppercase flex items-center gap-2 mb-4" style={{ color: 'var(--text)' }}>
          <LayoutDashboard size={18} className="gold-text" /> Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(q => {
            const Icon = q.icon
            return (
              <button
                key={q.id}
                onClick={() => onTab(q.id)}
                className="flex items-center gap-3 p-3.5 text-left rounded-sm transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="admin-stat-icon flex-shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="font-display uppercase text-sm tracking-wide" style={{ color: 'var(--text)' }}>{q.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{q.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {perms.isPrimaryOwner && (
        <Callout tone="gold" icon={Crown}>
          <strong className="font-semibold">Primary Owner:</strong> Use the <strong>Admins</strong> tab to invite team members as Admins or promote them to <strong>Co-Owner</strong>.
          Co-Owners have full access to everything <em>except</em> managing other admins. Only you can add/remove/promote people.
        </Callout>
      )}
    </div>
  )
}

/* =========================================================================
   ARTISTS MANAGER
   ========================================================================= */
function ArtistsManager({ artists, onRefresh }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', title: '', bio: '', image: '', videoUrl: '', isGroup: false, groupId: null })
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  const groups = artists.filter(a => a.isGroup)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return artists
    return artists.filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.title?.toLowerCase().includes(q) ||
      a.bio?.toLowerCase().includes(q)
    )
  }, [artists, query])

  const reset = () => setEditing(null) || setForm({ name: '', title: '', bio: '', image: '', videoUrl: '', isGroup: false, groupId: null })

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, groupId: (!form.groupId || form.groupId === '' || form.isGroup) ? null : form.groupId }
      const url = editing ? `/api/artists/${editing._id}` : '/api/artists'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.duplicate) {
        if (window.confirm(`⚠️ ${data.error}\n\nClick OK to add anyway, or Cancel to change.`)) {
          const res2 = await fetch('/api/artists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, forceCreate: true }) })
          const data2 = await res2.json().catch(() => ({}))
          if (res2.ok) { toast.success('Artist added (duplicate name)'); reset(); onRefresh() }
          else toast.error(data2.error || 'Failed')
        }
      } else if (res.ok) {
        toast.success(editing ? 'Artist updated' : 'Artist added')
        reset(); onRefresh()
      } else toast.error(data.error || 'Error saving artist')
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  const del = async id => {
    if (!confirm('Delete this artist?')) return
    const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); onRefresh() }
    else toast.error('Failed to delete')
  }

  const startEdit = a => {
    setEditing(a)
    const groupIdStr = a.groupId ? (typeof a.groupId === 'object' ? a.groupId.toString() : String(a.groupId)) : ''
    setForm({ name: a.name, title: a.title || '', bio: a.bio || '', image: a.image || '', videoUrl: a.videoUrl || '', isGroup: a.isGroup || false, groupId: groupIdStr || null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

const uploadFile = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', field === 'image' ? 'images' : 'videos')

    // For IMAGE uploads, organize files into a subfolder based on the group:
    //   - If this entry IS a group → use its own name
    //   - If this entry is a member of a group → use the parent group's name
    //   - Otherwise (solo artist) → no subfolder (keep flat)
    // Videos are NOT subfoldered (keploads simple; can extend later).
    if (field === 'image') {
      let subfolder = ''
      if (form.isGroup && form.name?.trim()) {
        subfolder = form.name.trim()
      } else if (!form.isGroup && form.groupId) {
        const parent = groups.find(g => String(g._id) === String(form.groupId))
        if (parent?.name) subfolder = parent.name
      }
      if (subfolder) fd.append('subfolder', subfolder)
    }

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) { setForm({ ...form, [field]: d.url }); toast.success('Uploaded!') }
    else toast.error(d.error || 'Upload failed')
  }

  const groupList = filtered.filter(a => a.isGroup)
  const soloList = filtered.filter(a => !a.isGroup)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
      <form onSubmit={save} className="surface-card p-4 sm:p-6 space-y-3.5 sm:space-y-4 h-fit order-2 lg:order-1 lg:col-span-2 min-w-0 rounded-sm">
        <div className="flex items-center gap-2 mb-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Users size={16} className="gold-text" />
          <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>
            {editing ? 'Edit Artist' : 'Add New Artist'}
          </h3>
        </div>
        <input required placeholder="Artist Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" />
        <input placeholder="Title (e.g. Vocal Powerhouse)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" />
        <textarea rows={3} placeholder="Bio" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="form-input resize-none" />
        <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={form.isGroup} onChange={e => setForm({...form, isGroup: e.target.checked, groupId: null})} className="accent-gold w-4 h-4" />
          <span>This is a group</span>
        </label>
        {!form.isGroup && groups.length > 0 && (
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Member of Group (optional)</label>
            <select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value || null})} className="form-input">
              <option value="">— Solo Artist (no group) —</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Image</label>
          <input type="file" accept="image/*" onChange={e => uploadFile(e, 'image')} className="text-[10px] sm:text-xs mb-2 block w-full min-w-0 truncate" style={{ color: 'var(--text-muted)' }} />
          <input placeholder="or paste URL" value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="form-input" />
          {form.image && <img src={form.image} alt="" className="mt-2 max-h-32 object-contain rounded-sm" style={{ border: '1px solid var(--border)', maxWidth: '100%' }} />}
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Opening Video</label>
          <input type="file" accept="video/*" onChange={e => uploadFile(e, 'videoUrl')} className="text-[10px] sm:text-xs mb-2 block w-full min-w-0 truncate" style={{ color: 'var(--text-muted)' }} />
          <input placeholder="YouTube, TikTok, MP4 URL" value={form.videoUrl} onChange={e => setForm({...form, videoUrl: e.target.value})} className="form-input" />
        </div>
        <div className="flex gap-2.5 pt-2">
          <button type="submit" disabled={saving} className="btn-gold flex-1 disabled:opacity-60 text-xs sm:text-sm">
            {saving ? 'Saving…' : (editing ? 'Update Artist' : 'Add Artist')}
          </button>
          {editing && <button type="button" onClick={reset} className="btn-dark">Cancel</button>}
        </div>
      </form>

      <div className="order-1 lg:order-2 lg:col-span-3">
        <SectionTitle icon={Users} title="Artists" count={filtered.length} subtitle={`${groups.length} group${groups.length !== 1 ? 's' : ''}`} />
        <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search artists by name, title, bio…" />
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {filtered.length === 0 && <EmptyState message={query ? 'No artists match your search.' : 'No artists yet. Add one to get started.'} emoji="🎤" />}
          {groupList.map(a => {
            const memberCount = artists.filter(m => m.groupId && String(m.groupId) === String(a._id)).length
            return (
              <div key={a._id} className="flex items-center gap-2.5 sm:gap-3 surface-card p-2.5 sm:p-3.5 min-w-0 rounded-sm hover:border-[var(--gold-dim)] transition-colors">
                <ListItemAvatar letter={a.name?.[0]} src={a.image} />
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase truncate text-sm sm:text-base flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text)' }}>
                    {a.name}
                    <span className="text-[9px] sm:text-[10px] gold-text px-1.5 py-0.5 font-semibold tracking-wider" style={{ background: 'var(--gold-dim)' }}>GROUP</span>
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.title || '—'}</p>
                  <p className="text-[10px] mt-0.5 gold-text/80 font-medium">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => startEdit(a)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-[var(--gold-dim)]" style={{ color: 'var(--text-muted)' }} title="Edit"><Edit size={15} /></button>
                <button onClick={() => del(a._id)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete"><Trash2 size={15} /></button>
              </div>
            )
          })}
          {soloList.map(a => {
            const parentGroup = a.groupId ? groups.find(g => String(g._id) === String(a.groupId)) : null
            return (
              <div key={a._id} className="flex items-center gap-2.5 sm:gap-3 surface-card p-2.5 sm:p-3.5 min-w-0 rounded-sm hover:border-[var(--gold-dim)] transition-colors">
                <ListItemAvatar letter={a.name?.[0]} src={a.image} />
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase truncate text-sm sm:text-base" style={{ color: 'var(--text)' }}>{a.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {a.title || '—'}{parentGroup && <span className="gold-text/80"> · {parentGroup.name}</span>}
                  </p>
                </div>
                <button onClick={() => startEdit(a)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-[var(--gold-dim)]" style={{ color: 'var(--text-muted)' }} title="Edit"><Edit size={15} /></button>
                <button onClick={() => del(a._id)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete"><Trash2 size={15} /></button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   MUSIC MANAGER
   ========================================================================= */
function MusicManager({ tracks, genres, onRefresh }) {
  const [form, setForm] = useState({ title: '', artistName: '', audioUrl: '', coverImage: '', album: '', genreId: '' })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState('all')

  // Genre manager state
  const [showGenres, setShowGenres] = useState(false)
  const [newGenreName, setNewGenreName] = useState('')
  const [addingGenre, setAddingGenre] = useState(false)
  const [editingGenre, setEditingGenre] = useState(null)
  const [editGenreName, setEditGenreName] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tracks
    if (genreFilter !== 'all') {
      list = list.filter(t => t.genreId && String(t.genreId) === String(genreFilter))
    }
    if (!q) return list
    return list.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.artistName?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q) ||
      t.genreName?.toLowerCase().includes(q)
    )
  }, [tracks, query, genreFilter])

  // Sort genres: by order then by trackCount desc then name
  const sortedGenres = useMemo(() => {
    return [...(genres || [])].sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0)
      if ((b.trackCount || 0) !== (a.trackCount || 0)) return (b.trackCount || 0) - (a.trackCount || 0)
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [genres])

  const reset = () => { setForm({ title: '', artistName: '', audioUrl: '', coverImage: '', album: '', genreId: '' }); setEditing(null) }
  const startEdit = t => {
    setEditing(t)
    setForm({
      title: t.title || '',
      artistName: t.artistName || '',
      audioUrl: t.audioUrl || '',
      coverImage: t.coverImage || '',
      album: t.album || '',
      genreId: t.genreId ? String(t.genreId) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async e => {
    e.preventDefault()
    if (!form.audioUrl && !editing) { toast.error('Please upload an audio file first or paste an audio URL'); return }
    if (!form.title.trim()) { toast.error('Track title is required'); return }
    if (!form.artistName.trim()) { toast.error('Artist name is required'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        artistName: form.artistName.trim(),
        audioUrl: form.audioUrl,
        coverImage: form.coverImage,
        album: form.album.trim(),
        genreId: form.genreId || null,
        artistId: null,
      }
      const url = editing ? `/api/music/${editing._id}` : '/api/music'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(editing ? 'Track updated!' : 'Track added!'); reset(); onRefresh() }
      else toast.error(data.error || 'Failed to save track.')
    } catch (err) { toast.error(err.message || 'Failed to save') }
    setSaving(false)
  }

  const del = async id => {
    if (!confirm('Delete this track?')) return
    const res = await fetch(`/api/music/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Track deleted'); onRefresh(); if (editing && editing._id === id) reset() }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed to delete') }
  }

  const uploadFile = async (e, field, folder) => {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file); fd.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) { setForm({ ...form, [field]: d.url }); toast.success('Uploaded!') }
    else toast.error(d.error || 'Upload failed')
  }

  // --- Genre CRUD helpers ---
  const addGenre = async (e) => {
    e.preventDefault()
    const name = newGenreName.trim()
    if (!name) { toast.error('Enter a genre name'); return }
    setAddingGenre(true)
    try {
      const res = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Genre "${name}" added`); setNewGenreName(''); onRefresh() }
      else toast.error(d.error || 'Failed to add genre')
    } catch (err) { toast.error(err.message) }
    setAddingGenre(false)
  }

  const startEditGenre = (g) => { setEditingGenre(g); setEditGenreName(g.name) }
  const cancelEditGenre = () => { setEditingGenre(null); setEditGenreName('') }
  const saveGenre = async () => {
    if (!editingGenre) return
    const name = editGenreName.trim()
    if (!name) { toast.error('Genre name cannot be empty'); return }
    try {
      const res = await fetch(`/api/genres/${editingGenre._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success('Genre renamed'); setEditingGenre(null); onRefresh() }
      else toast.error(d.error || 'Failed to update genre')
    } catch (err) { toast.error(err.message) }
  }
  const deleteGenre = async (g) => {
    if (!confirm(`Delete genre "${g.name}"?\n\nTracks in this genre will become uncategorized.`)) return
    try {
      const res = await fetch(`/api/genres/${g._id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Genre deleted'); if (genreFilter === g._id) setGenreFilter('all'); onRefresh() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed to delete') }
    } catch (err) { toast.error(err.message) }
  }

  const isEditing = id => editing && editing._id === id

  return (
    <div className="space-y-5">
      {/* ===== GENRES MANAGER (collapsible) ===== */}
      <div className="surface-card rounded-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGenres(!showGenres)}
          className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-[var(--gold-dim)]/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Disc3 size={18} className="gold-text" />
            <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>
              Genres
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
            >
              {sortedGenres.length}
            </span>
          </div>
          <span
            className="text-[11px] uppercase tracking-widest font-semibold transition-transform"
            style={{ color: 'var(--text-muted)', transform: showGenres ? 'rotate(180deg)' : 'none' }}
          >
            {showGenres ? '▾ Hide' : '▸ Manage'}
          </span>
        </button>
        {showGenres && (
          <div className="p-4 sm:p-5 pt-0 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Create genres here (e.g. <em>Hip-Hop, R&B, OPM, Pop</em>), then assign them to tracks below.
              Genres show up as clickable pills on the public Music page.
            </p>
            <form onSubmit={addGenre} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="New genre name..."
                value={newGenreName}
                onChange={e => setNewGenreName(e.target.value)}
                className="form-input flex-1"
              />
              <button
                type="submit"
                disabled={addingGenre}
                className="btn-gold px-4 inline-flex items-center justify-center gap-1.5 disabled:opacity-60 text-xs sm:text-sm whitespace-nowrap"
              >
                <Plus size={14} /> {addingGenre ? 'Adding…' : 'Add Genre'}
              </button>
            </form>
            {sortedGenres.length === 0 ? (
              <p className="text-xs italic py-3 text-center" style={{ color: 'var(--text-dim)' }}>
                No genres yet. Add one above to categorize your music.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedGenres.map(g => (
                  <div
                    key={g._id}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
                  >
                    {editingGenre && editingGenre._id === g._id ? (
                      <>
                        <input
                          autoFocus
                          value={editGenreName}
                          onChange={e => setEditGenreName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveGenre() } if (e.key === 'Escape') cancelEditGenre() }}
                          className="bg-transparent outline-none text-sm min-w-[80px]"
                          style={{ color: 'var(--text)' }}
                        />
                        <button
                          type="button"
                          onClick={saveGenre}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditGenre}
                          className="p-1 hover:text-white"
                          style={{ color: 'var(--text-muted)' }}
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Tag size={11} className="gold-text" />
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{g.name}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
                        >
                          {g.trackCount || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditGenre(g)}
                          className="p-1 rounded-full hover:bg-white/10 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          title="Rename"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGenre(g)}
                          className="p-1 rounded-full hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== TRACK UPLOAD / LIST ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
        <form onSubmit={save} className="surface-card p-4 sm:p-6 space-y-3.5 sm:space-y-4 h-fit min-w-0 rounded-sm order-2 lg:order-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <Music size={16} className="gold-text" />
            <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>{editing ? 'Edit Track' : 'Upload New Track'}</h3>
          </div>
          <input required placeholder="Track Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" />
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Artist Name *</label>
            <input required type="text" placeholder="e.g. Juan Dela Cruz, BTS, Sarah G." value={form.artistName} onChange={e => setForm({...form, artistName: e.target.value})} className="form-input" />
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Album (optional)</label>
            <input placeholder="Album name" value={form.album} onChange={e => setForm({...form, album: e.target.value})} className="form-input" />
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Genre (optional)</label>
            <select
              value={form.genreId}
              onChange={e => setForm({...form, genreId: e.target.value})}
              className="form-input"
            >
              <option value="">— Uncategorized —</option>
              {sortedGenres.map(g => (
                <option key={g._id} value={g._id}>{g.name}{g.trackCount ? ` (${g.trackCount})` : ''}</option>
              ))}
            </select>
            {sortedGenres.length === 0 && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-dim)' }}>
                Tip: Open the Genres panel above to add genres first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Audio File (MP3/WAV) {editing ? '(leave empty to keep current)' : '*'}</label>
            <input type="file" accept="audio/*" onChange={e => uploadFile(e, 'audioUrl', 'audio')} className="text-[10px] sm:text-xs mb-2 block w-full min-w-0 truncate" style={{ color: 'var(--text-muted)' }} />
            <input placeholder="or paste URL to MP3" value={form.audioUrl} onChange={e => setForm({...form, audioUrl: e.target.value})} className="form-input" />
            {form.audioUrl && (
              <div className="mt-2 p-2.5 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                <audio src={form.audioUrl} controls className="w-full max-w-full h-8" style={{maxWidth:"100%"}} />
                <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">✓ Audio ready</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Cover Image</label>
            <input type="file" accept="image/*" onChange={e => uploadFile(e, 'coverImage', 'images')} className="text-[10px] sm:text-xs mb-2 block w-full min-w-0 truncate" style={{ color: 'var(--text-muted)' }} />
            <input placeholder="or paste URL" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="form-input" />
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="submit" disabled={saving || (!editing && !form.audioUrl)} className="btn-gold flex-1 disabled:opacity-60 text-xs sm:text-sm">
              {saving ? 'Saving…' : (editing ? 'Update Track' : 'Add Track')}
            </button>
            {editing && <button type="button" onClick={reset} className="btn-dark">Cancel</button>}
          </div>
        </form>

        <div className="lg:col-span-3 order-1 lg:order-2 min-w-0">
          <SectionTitle icon={Music} title="Tracks" count={filtered.length} subtitle="Click a track to reassign its genre, album, or edit details." />
          <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tracks by title, artist, album, genre…" />

          {/* Genre quick-filter chips on the list */}
          {sortedGenres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 -mx-1 px-1">
              <button
                onClick={() => setGenreFilter('all')}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full transition-colors ${
                  genreFilter === 'all' ? 'gold-text' : ''
                }`}
                style={genreFilter === 'all'
                  ? { background: 'var(--gold-dim)', color: 'var(--gold)' }
                  : { background: 'var(--bg-elev)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                All ({tracks.length})
              </button>
              {sortedGenres.map(g => (
                <button
                  key={g._id}
                  onClick={() => setGenreFilter(genreFilter === g._id ? 'all' : g._id)}
                  className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full transition-colors ${
                    genreFilter === g._id ? 'gold-text' : ''
                  }`}
                  style={genreFilter === g._id
                    ? { background: 'var(--gold-dim)', color: 'var(--gold)' }
                    : { background: 'var(--bg-elev)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {g.name} ({g.trackCount || 0})
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.length === 0 && <EmptyState message={query || genreFilter !== 'all' ? 'No tracks match your filters.' : 'No tracks yet. Upload one to get started.'} emoji="🎵" />}
            {filtered.map(t => (
              <div key={t._id} className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 min-w-0 rounded-sm transition-colors surface-card ${isEditing(t._id) ? 'ring-1 ring-gold/40' : ''}`}>
                {t.coverImage
                  ? <img src={t.coverImage} className="w-11 h-11 sm:w-12 sm:h-12 object-cover flex-shrink-0 rounded-sm" style={{ border: '1px solid var(--border)' }} />
                  : <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 rounded-sm gold-text text-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>♪</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase truncate text-sm sm:text-base flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text)' }}>
                    {t.title}
                    {isEditing(t._id) && <span className="text-[9px] sm:text-[10px] gold-text px-1.5 py-0.5 font-semibold tracking-wider" style={{ background: 'var(--gold-dim)' }}>EDITING</span>}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {t.artistName}
                    {t.album ? <span> • {t.album}</span> : null}
                    {t.genreName ? (
                      <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold" style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}>
                        <Tag size={9} /> {t.genreName}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button onClick={() => startEdit(t)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-[var(--gold-dim)]" style={{ color: 'var(--text-muted)' }} title="Edit"><Edit size={15} /></button>
                <button onClick={() => del(t._id)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   DONATIONS VIEW (paginated)
   ========================================================================= */
const PER_PAGE = 10
function DonationsView({ isSuperAdmin, onRefresh }) {
  const [donations, setDonations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: PER_PAGE, total: 0, totalPages: 1, hasMore: false })
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingStatus, setEditingStatus] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pageRevenue, setPageRevenue] = useState(0)

  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query.trim()), 350); return () => clearTimeout(t) }, [query])
  useEffect(() => { setPage(1) }, [debouncedQuery, statusFilter])

  const fetchPage = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE), status: statusFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/donations?${params.toString()}`)
      const d = await res.json().catch(() => ({}))
      if (res.ok || res.status === 503) {
        const list = Array.isArray(d.donations) ? d.donations : []
        setDonations(list)
        setPagination(d.pagination || { page: p, limit: PER_PAGE, total: 0, totalPages: 1, hasMore: false })
        setPageRevenue(list.filter(x => x.status === 'completed').reduce((s,x) => s + (x.amount||0), 0) / 100)
      } else toast.error(d.error || 'Failed to load gifts')
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { fetchPage(page) /* eslint-disable-next-line */ }, [page, debouncedQuery, statusFilter])
  const refresh = () => { fetchPage(page); onRefresh?.() }

  const exportData = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/donations/export?${params.toString()}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Export failed'); return }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `DLE-Gifts-${new Date().toISOString().slice(0,10)}.xls`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Exported Excel file')
    } catch (e) { toast.error('Export failed: ' + e.message) }
    setExporting(false)
  }

  const giftEmojis = { food: '🍱', clothes: '👗', gift: '🎁', money: '💝' }

  const updateStatus = async (id, newStatus) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/donations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Status changed to ${newStatus}`); setEditingStatus(null); refresh() }
      else { toast.error(d.error || 'Failed'); setEditingStatus(null) }
    } catch (e) { toast.error(e.message); setEditingStatus(null) }
    setSavingId(null)
  }

  const deleteDonation = async (id, info) => {
    if (!confirm(`Delete this gift record?\n\n${info}\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Gift deleted'); if (donations.length === 1 && page > 1) setPage(page - 1); else refresh() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed') }
    } catch (e) { toast.error(e.message) }
  }

  const statusChipClass = s => ({
    completed: 'chip-completed',
    failed:    'chip-failed',
    refunded:  'chip-refunded',
    pending:   'chip-pending',
  }[s] || 'chip-pending')
  const STATUSES = ['pending', 'completed', 'failed', 'refunded']

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1, cur = page
    const pages = new Set([1, total, cur, cur-1, cur+1, cur-2, cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    const out = []
    for (let i=0; i<arr.length; i++) { if (i>0 && arr[i] - arr[i-1] > 1) out.push(null); out.push(arr[i]) }
    return out
  }, [pagination.totalPages, page])

  const goToPage = p => {
    if (p < 1 || p > pagination.totalPages) return
    setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageCompletedCount = donations.filter(d => d.status === 'completed').length
  const pageOtherCount = donations.length - pageCompletedCount
  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showingTo = Math.min(pagination.total, page * PER_PAGE)

  return (
    <div>
      {isSuperAdmin ? (
        <Callout tone="gold" icon={Crown}>
          <strong className="font-semibold">Owner access:</strong> click a status badge to change it, or use the ✕ to remove a record.
          Statuses auto-update to <strong>completed</strong> when PayMongo confirms payment.
        </Callout>
      ) : (
        <Callout tone="info" icon={Eye}>
          You're viewing gifts as an admin. Only the owner can edit or delete gift records.
        </Callout>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-6">
        <StatCard label="Total Gifts" value={pagination.total.toLocaleString()} sub={`${formatPHP(pageRevenue)} completed this page`} accent="gold" icon={BarChart3} />
        <StatCard label="Showing" value={`${showingFrom}–${showingTo}`} sub={`Page ${page} of ${pagination.totalPages}`} />
        <StatCard label="Completed" value={pageCompletedCount} sub="on this page" accent="green" icon={Check} />
        <StatCard label="Other" value={pageOtherCount} sub="pending · failed · refunded" accent="yellow" icon={Clock} />
      </div>

      <div className="flex flex-col gap-2 sm:gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
          <input type="text" placeholder="Search fan, email, artist, ref, payment ID…" value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10 text-sm" />
        </div>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
          {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 rounded-sm"
              style={statusFilter === s
                ? { background: 'var(--gold)', color: '#0A0A0A' }
                : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>
              {s}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={exportData} disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 flex-shrink-0 rounded-sm"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
            <Download size={13} /> <span className="whitespace-nowrap">{exporting ? 'Exporting…' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      <div className="surface-card overflow-x-auto no-scrollbar -mx-3 sm:mx-0 w-[calc(100%+1.5rem)] sm:w-full rounded-sm" style={{WebkitOverflowScrolling:"touch"}}>
        <table className="w-full text-sm" style={{minWidth:"720px"}}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Date</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Fan</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Artist</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Gift</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Amount</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Status</th>
              {isSuperAdmin && <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-right font-semibold" style={{ color: 'var(--text-dim)' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : donations.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>No gifts found{debouncedQuery && ' — try a different search'}</td></tr>
            ) : donations.map(d => {
              const isEditingThis = editingStatus === d._id
              return (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--border)' }} className="row-hover transition-colors">
                  <td className="p-3 sm:p-4 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 sm:p-4 truncate" style={{ maxWidth: 180 }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{d.userName}</span>
                    <br /><span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-dim)' }}>{d.userEmail}</span>
                    {d.message && <div className="italic text-[10px] mt-1 truncate" style={{ color: 'var(--text-dim)', maxWidth: 180 }} title={d.message}>"{d.message}"</div>}
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{d.artistName || 'General'}</td>
                  <td className="p-3 sm:p-4">
                    {giftEmojis[d.giftType] || '🎁'} <span className="hidden sm:inline text-[10px] sm:text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{d.giftType}</span>
                  </td>
                  <td className="p-3 sm:p-4 gold-text font-semibold text-sm">{formatPHP(d.amount / 100)}</td>
                  <td className="p-3 sm:p-4">
                    {isSuperAdmin ? (isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <select defaultValue={d.status} autoFocus disabled={savingId === d._id}
                          onBlur={e => { if (e.target.value !== d.status) updateStatus(d._id, e.target.value); else setEditingStatus(null) }}
                          className="text-[11px] px-2 py-1 outline-none rounded-sm" style={{ background: 'var(--bg-elev)', color: 'var(--text)', border: '1px solid var(--border-strong)' }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => setEditingStatus(null)} className="p-1" style={{ color: 'var(--text-dim)' }} title="Cancel"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingStatus(d._id)}
                        className={`chip ${statusChipClass(d.status)} cursor-pointer hover:brightness-125`}>
                        {d.status} ✎
                      </button>
                    )) : (
                      <span className={`chip ${statusChipClass(d.status)}`}>{d.status}</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="p-3 sm:p-4 text-right">
                      <button onClick={() => deleteDonation(d._id, `${d.userName} → ${d.artistName || 'General'} · ${giftEmojis[d.giftType]} ${formatPHP(d.amount/100)} (${d.status})`)}
                        className="p-2 inline-flex items-center justify-center rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete"><X size={15} /></button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination page={page} pageNumbers={pageNumbers} goToPage={goToPage} totalPages={pagination.totalPages} loading={loading} />
      )}

      <p className="text-xs mt-5 text-center" style={{ color: 'var(--text-dim)' }}>
        💡 All gift funds go to DLE's PayMongo wallet. Distribute to artists manually using this list.
        Paid gifts are auto-marked <span style={{ color: '#34d399' }}>completed</span> by PayMongo webhook.
      </p>
    </div>
  )
}

/* ---------- Pagination ---------- */
function Pagination({ page, pageNumbers, goToPage, totalPages, loading }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-6 flex-wrap px-1">
      <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}
        className="px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>
        ← Prev
      </button>
      {pageNumbers.map((p, i) => p === null ? (
        <span key={'e'+i} className="px-1" style={{ color: 'var(--text-dim)' }}>…</span>
      ) : (
        <button key={p} onClick={() => goToPage(p)} disabled={loading}
          className="min-w-[34px] sm:min-w-[36px] h-9 px-2 text-[11px] sm:text-xs font-semibold rounded-sm transition-colors"
          style={p === page
            ? { background: 'var(--gold)', color: '#0A0A0A' }
            : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>
          {p}
        </button>
      ))}
      <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages || loading}
        className="px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>
        Next →
      </button>
    </div>
  )
}

/* =========================================================================
   MUSIC ACTIVITY VIEW
   ========================================================================= */
const ACTIVITY_PER_PAGE = 10
function MusicActivityView({ isSuperAdmin }) {
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: ACTIVITY_PER_PAGE, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [quickRange, setQuickRange] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [bulkType, setBulkType] = useState('all')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query.trim()), 350); return () => clearTimeout(t) }, [query])
  useEffect(() => { setPage(1) }, [debouncedQuery, typeFilter])

  const fetchPage = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(ACTIVITY_PER_PAGE), type: typeFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/music/activity?${params.toString()}`)
      const d = await res.json().catch(() => ({}))
      if (res.ok || res.status === 503) {
        setActivities(Array.isArray(d.activities) ? d.activities : [])
        setPagination(d.pagination || { page: p, limit: ACTIVITY_PER_PAGE, total: 0, totalPages: 1 })
      } else toast.error(d.error || 'Failed to load activity')
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { fetchPage(page) /* eslint-disable-next-line */ }, [page, debouncedQuery, typeFilter])
  const refresh = () => fetchPage(page)

  const exportData = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ type: typeFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/music/activity/export?${params.toString()}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Export failed'); return }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `DLE-Music-Activity-${new Date().toISOString().slice(0,10)}.xls`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url); toast.success('Exported Excel file')
    } catch (e) { toast.error('Export failed: ' + e.message) }
    setExporting(false)
  }

  const deleteOne = async (id, info) => {
    if (!isSuperAdmin) return
    if (!confirm(`Delete this record?\n\n${info}\n\nCannot be undone.`)) return
    try {
      const res = await fetch('/api/music/activity/bulk-delete', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (res.ok) { toast.success('Record deleted'); if (activities.length === 1 && page > 1) setPage(page-1); else refresh() }
      else { const d=await res.json().catch(()=>({})); toast.error(d.error||'Failed') }
    } catch (e) { toast.error(e.message) }
  }

  const ymd = d => {
    const pad = n => String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  }
  const computeRange = range => {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1)
    switch (range) {
      case 'today': return { after: ymd(today), before: ymd(tomorrow), label: 'Today' }
      case 'week': { const w = new Date(today.getFullYear(),today.getMonth(),today.getDate()-6); return { after: ymd(w), before: ymd(tomorrow), label: 'Last 7 days' } }
      case 'month': { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { after: ymd(s), before: ymd(tomorrow), label: 'This month' } }
      case 'lastmonth': { const t = new Date(now.getFullYear(), now.getMonth(), 1), l = new Date(now.getFullYear(), now.getMonth()-1, 1); return { after: ymd(l), before: ymd(t), label: 'Last month' } }
      case 'year': { const s = new Date(now.getFullYear(),0,1); return { after: ymd(s), before: ymd(tomorrow), label: 'This year' } }
      case 'older': { const s = new Date(now.getFullYear(),0,1); return { before: ymd(s), label: 'Older than this year' } }
      case 'all': return { all: true, label: 'ALL records (entire history)' }
      default: return null
    }
  }

  const executeBulkDelete = async () => {
    if (!isSuperAdmin) return
    let payload = {}, desc = ''
    if (quickRange) {
      const r = computeRange(quickRange); if (!r) { toast.error('Pick a range'); return }
      payload = { before: r.before, after: r.after, all: r.all }; desc = r.label
    } else if (customFrom || customTo) {
      if (customFrom && !/^\d{4}-\d{2}-\d{2}$/.test(customFrom)) { toast.error('Invalid "from" date'); return }
      if (customFrom) payload.after = customFrom
      if (customTo) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(customTo)) { toast.error('Invalid "to" date'); return }
        const [y,m,d] = customTo.split('-').map(Number); payload.before = ymd(new Date(y, m-1, d+1))
      }
      desc = `${customFrom||'beginning'} → ${customTo||'now'}`
    } else { toast.error('Pick a quick range or enter a custom date range'); return }
    if (bulkType !== 'all') { payload.type = bulkType; desc += ` (${bulkType}s only)` }
    const typeLabel = bulkType === 'all' ? 'ALL activity' : bulkType + 's'
    if (!confirm(`⚠️ DELETE PERMANENTLY?\n\nDelete ${typeLabel} matching:\n${desc}\n\nCannot be undone. Type "DELETE" in the next prompt to confirm.`)) return
    const confirmText = prompt('To confirm, type "DELETE" below:')
    if (confirmText !== 'DELETE') { toast('Cancelled'); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/music/activity/bulk-delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Deleted ${d.deletedCount} record${d.deletedCount===1?'':'s'}`); setBulkOpen(false); setQuickRange(''); setCustomFrom(''); setCustomTo(''); setBulkType('all'); setPage(1); refresh() }
      else toast.error(d.error || 'Delete failed')
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  const pagePlayCount = activities.filter(a => a.activityType === 'play').length
  const pageDownloadCount = activities.filter(a => a.activityType === 'download').length
  const pageListeners = new Set(activities.map(a => a.userEmail?.toLowerCase()).filter(Boolean)).size
  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * ACTIVITY_PER_PAGE + 1
  const showingTo = Math.min(pagination.total, page * ACTIVITY_PER_PAGE)

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1, cur = page
    const pages = new Set([1,total,cur,cur-1,cur+1,cur-2,cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    const out = []
    for (let i=0; i<arr.length; i++) { if (i>0 && arr[i]-arr[i-1]>1) out.push(null); out.push(arr[i]) }
    return out
  }, [pagination.totalPages, page])

  const goToPage = p => {
    if (p<1 || p>pagination.totalPages) return
    setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const quickOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 days' },
    { id: 'month', label: 'This month' },
    { id: 'lastmonth', label: 'Last month' },
    { id: 'year', label: 'This year' },
    { id: 'older', label: 'Older' },
  ]

  return (
    <div>
      {isSuperAdmin ? (
        <Callout tone="gold" icon={Crown}>
          <strong className="font-semibold">Owner analytics:</strong> see exactly who played your tracks and who downloaded them. Only signed-in Google users are tracked — guest streams remain private. You can bulk-clear old data below.
        </Callout>
      ) : (
        <Callout tone="info" icon={Eye}>
          You have view/export access to listener analytics. Deleting records is owner-only.
        </Callout>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-6">
        <StatCard label="Total Activity" value={pagination.total.toLocaleString()} sub="all-time records" icon={Activity} />
        <StatCard label="Showing" value={`${showingFrom}–${showingTo}`} sub={`Page ${page} of ${pagination.totalPages}`} />
        <StatCard label="This Page" value={`${pagePlayCount} ▶ ${pageDownloadCount} ⬇`} sub="plays · downloads" accent="green" icon={Play} />
        <StatCard label="Listeners" value={pageListeners} sub="unique on this page" accent="gold" icon={Users} />
      </div>

      <div className="flex flex-col gap-2 sm:gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
          <input type="text" placeholder="Search name, email, track, artist…" value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10 text-sm" />
        </div>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
          {[{id:'all',label:'All',icon:Activity},{id:'play',label:'Plays',icon:Play},{id:'download',label:'Downloads',icon:DownloadCloud}].map(f => {
            const Icon = f.icon
            return (
              <button key={f.id} onClick={() => setTypeFilter(f.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 rounded-sm"
                style={typeFilter === f.id
                  ? { background: 'var(--gold)', color: '#0A0A0A' }
                  : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>
                <Icon size={12} /> {f.label}
              </button>
            )
          })}
          <div className="flex-1" />
          {isSuperAdmin && (
            <button onClick={() => setBulkOpen(!bulkOpen)}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 rounded-sm"
              style={{ background: 'rgba(248,113,113,0.08)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.25)' }}>
              <Trash2 size={13} /> Manage
            </button>
          )}
          <button onClick={exportData} disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 flex-shrink-0 rounded-sm"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {bulkOpen && isSuperAdmin && (
        <div className="surface-card p-4 sm:p-6 mb-4 space-y-4 rounded-sm" style={{ border: '1px solid rgba(248,113,113,0.3)' }}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 font-display text-base sm:text-lg uppercase" style={{ color: '#fca5a5' }}>
              <Trash2 size={17} /> Bulk Delete Activity
            </h4>
            <button onClick={() => setBulkOpen(false)} className="p-1" style={{ color: 'var(--text-dim)' }}><X size={17} /></button>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Clear analytics data by date range. Music files, artists, and user accounts are NOT affected — only play/download history.
          </p>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Quick select</label>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map(o => (
                <button key={o.id} onClick={() => { setQuickRange(quickRange===o.id?'':o.id); setCustomFrom(''); setCustomTo('') }}
                  className="px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors rounded-sm"
                  style={quickRange===o.id
                    ? { background: 'rgba(248,113,113,0.25)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.5)' }
                    : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid transparent' }}>
                  {o.label}
                </button>
              ))}
              <button onClick={() => { setQuickRange(quickRange==='all'?'':'all'); setCustomFrom(''); setCustomTo('') }}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold transition-colors rounded-sm`}
                style={quickRange==='all'
                  ? { background: 'rgba(220,38,38,0.4)', color: '#fecaca', border: '1px solid #ef4444' }
                  : { background: 'rgba(220,38,38,0.12)', color: '#fca5a5', border: '1px solid transparent' }}>
                ⚠ EVERYTHING
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>From (inclusive)</label>
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setQuickRange('') }} className="form-input" />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>To (inclusive)</label>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setQuickRange('') }} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Type</label>
            <div className="flex gap-2 flex-wrap">
              {[{id:'all',label:'All'},{id:'play',label:'Plays'},{id:'download',label:'Downloads'}].map(o=>(
                <button key={o.id} onClick={()=>setBulkType(o.id)}
                  className="px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors rounded-sm"
                  style={bulkType===o.id
                    ? { background: 'rgba(248,113,113,0.25)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.5)' }
                    : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid transparent' }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 pt-1 flex-col sm:flex-row">
            <button onClick={executeBulkDelete} disabled={deleting}
              className="px-5 py-2.5 text-xs sm:text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-60 rounded-sm flex items-center justify-center gap-2 flex-1"
              style={{ background: '#dc2626', color: '#fff' }}>
              <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete Permanently'}
            </button>
            <button onClick={() => setBulkOpen(false)} className="btn-dark px-5">Cancel</button>
          </div>
        </div>
      )}

      <div className="surface-card overflow-x-auto no-scrollbar -mx-3 sm:mx-0 w-[calc(100%+1.5rem)] sm:w-full rounded-sm" style={{WebkitOverflowScrolling:"touch"}}>
        <table className="w-full text-sm" style={{minWidth:"720px"}}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Date & Time</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Action</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>User</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Track</th>
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-left font-semibold" style={{ color: 'var(--text-dim)' }}>Artist</th>
              {isSuperAdmin && <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-right font-semibold" style={{ color: 'var(--text-dim)' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? 6 : 5} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? 6 : 5} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>No activity yet{debouncedQuery && ' — try a different search'}.</td></tr>
            ) : activities.map(a => {
              const dt = new Date(a.createdAt)
              const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
              const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
              const isPlay = a.activityType === 'play'
              return (
                <tr key={a._id} style={{ borderBottom: '1px solid var(--border)' }} className="row-hover transition-colors">
                  <td className="p-3 sm:p-4 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div>{dateStr}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{timeStr}</div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <span className={`chip ${isPlay ? 'chip-play' : 'chip-download'}`}>
                      {isPlay ? <Play size={10} /> : <DownloadCloud size={10} />}
                      {isPlay ? 'Play' : 'Download'}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 truncate" style={{ maxWidth: 200 }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.userName}</span>
                    <br /><span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-dim)' }}>{a.userEmail}</span>
                  </td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm truncate" style={{ maxWidth: 200, color: 'var(--text-muted)' }}>{a.trackTitle}</td>
                  <td className="p-3 sm:p-4 text-xs sm:text-sm truncate gold-text/90 font-medium" style={{ maxWidth: 160 }}>{a.artistName || 'DLE'}</td>
                  {isSuperAdmin && (
                    <td className="p-3 sm:p-4 text-right">
                      <button onClick={() => deleteOne(a._id, `${isPlay?'Play':'Download'} • ${a.trackTitle} by ${a.artistName||'DLE'} • ${a.userName} (${a.userEmail}) • ${dateStr} ${timeStr}`)}
                        className="p-2 inline-flex items-center justify-center rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete">
                        <X size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && <Pagination page={page} pageNumbers={pageNumbers} goToPage={goToPage} totalPages={pagination.totalPages} loading={loading} />}

      <p className="text-xs mt-5 text-center" style={{ color: 'var(--text-dim)' }}>
        💡 Only signed-in Google users are tracked. Guest streams remain private. Duplicate plays within 5 minutes are deduplicated.
      </p>
    </div>
  )
}

/* =========================================================================
   ADMINS MANAGER (super admin only) — click-to-edit, paginated (5 per page)
   ========================================================================= */
const ADMIN_PAGE_SIZE = 5

const ADMIN_PERM_ROWS = [
  { key: 'artists',       label: '🎨 Artists',        desc: 'Add, edit & delete artists/groups' },
  { key: 'music',         label: '🎵 Music',          desc: 'Upload, edit & delete tracks' },
  { key: 'donations',     label: '📊 Gifts',          desc: 'View and export fan gift reports' },
  { key: 'analytics',     label: '📈 Analytics',      desc: 'View Plays & Downloads (listener data)' },
  { key: 'announcements', label: '📢 Announcements',  desc: 'Create & schedule pop-up greetings' },
]

function AdminsManager() {
  // Add form
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [newRole, setNewRole] = useState('admin') // 'admin' | 'super' (co-owner)
  const [newPerms, setNewPerms] = useState({ music: false, artists: true, donations: false, analytics: false, announcements: false })
  const [adding, setAdding] = useState(false)

  // List state
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [admins, setAdmins] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: ADMIN_PAGE_SIZE, total: 0, totalPages: 1, hasMore: false })
  const [listLoading, setListLoading] = useState(true)

  // Edit modal
  const [editing, setEditing] = useState(null) // admin object being edited
  const [editPerms, setEditPerms] = useState({ music: false, artists: true, donations: false, analytics: false })
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('admin')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => { setPage(1) }, [debouncedQuery])

  const loadAdmins = async (p = page) => {
    setListLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(ADMIN_PAGE_SIZE) })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/admins?${params.toString()}`)
      const d = await res.json().catch(() => null)
      if (res.ok && d && Array.isArray(d.admins)) {
        setAdmins(d.admins)
        setPagination(d.pagination || { page: p, limit: ADMIN_PAGE_SIZE, total: 0, totalPages: 1, hasMore: false })
      } else if (res.status === 503) {
        setAdmins([])
        setPagination({ page: p, limit: ADMIN_PAGE_SIZE, total: 0, totalPages: 1, hasMore: false })
        toast.error('Database unavailable')
      } else {
        toast.error((d && d.error) || 'Failed to load admins')
      }
    } catch (e) { toast.error(e.message) }
    setListLoading(false)
  }
  useEffect(() => { loadAdmins(page) /* eslint-disable-next-line */ }, [page, debouncedQuery])

  // Add new admin
  const addAdmin = async e => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role: newRole,
          permissions: newRole === 'super' ? { music: true, artists: true, donations: true, analytics: true } : newPerms,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`${email} added as ${newRole === 'super' ? 'Co-Owner' : 'Admin'}`)
        setEmail(''); setName('')
        setNewRole('admin')
        setNewPerms({ music: false, artists: true, donations: false, analytics: false })
        setPage(1)
        loadAdmins(1)
      } else toast.error(data.error || 'Failed to add admin')
    } catch (e) { toast.error(e.message) }
    setAdding(false)
  }

  // Open edit modal
  const openEdit = a => {
    setEditing(a)
    setEditName(a.name || '')
    setEditRole(a.role === 'super' && !a.isPrimaryOwner ? 'super' : 'admin')
    setEditPerms({
      music:         !!a.permissions?.music,
      artists:       a.permissions?.artists !== false,
      donations:     !!a.permissions?.donations,
      analytics:     !!a.permissions?.analytics,
      announcements: !!a.permissions?.announcements,
    })
  }
  const closeEdit = () => {
    if (savingEdit) return
    setEditing(null); setEditName('')
  }
  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admins/${editing._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole,
          // Permissions are forced on by server for role:'super', but we send
          // the toggled state for admins.
          permissions: editPerms,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(
          editRole === 'super'
            ? `Promoted ${editing.email} to Co-Owner`
            : (editing.role === 'super'
                ? `Demoted ${editing.email} to Admin`
                : `Updated ${editing.email}`)
        )
        setEditing(null); setEditName('')
        // If editing self (shouldn't happen here since primary owner is blocked),
        // the session will refresh on next reload.
        loadAdmins(page)
      } else toast.error(d.error || 'Failed to update')
    } catch (e) { toast.error(e.message) }
    setSavingEdit(false)
  }

  // Delete
  const openDelete = a => { setConfirmDelete(a); setConfirmText('') }
  const cancelDelete = () => { if (!deleting) { setConfirmDelete(null); setConfirmText('') } }
  const confirmDeleteAdmin = async a => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admins/${a._id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`${a.email} removed from admins`)
        setConfirmDelete(null); setConfirmText('')
        // If removing the last item on a page beyond page 1, back up a page
        if (admins.length === 1 && page > 1) setPage(page - 1)
        else loadAdmins(page)
      } else toast.error(d.error || 'Failed to remove admin')
    } catch (e) { toast.error(e.message || 'Failed') }
    setDeleting(false)
  }

  // Pagination page number builder (same as Donations/Activity)
  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1, cur = page
    const pages = new Set([1, total, cur, cur-1, cur+1, cur-2, cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    const out = []
    for (let i=0; i<arr.length; i++) { if (i>0 && arr[i] - arr[i-1] > 1) out.push(null); out.push(arr[i]) }
    return out
  }, [pagination.totalPages, page])
  const goToPage = p => {
    if (p < 1 || p > pagination.totalPages) return
    setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      <Callout tone="gold" icon={Crown}>
        <p className="font-semibold mb-1">Owner Controls</p>
        <p style={{ opacity: 0.85 }}>
          Click any admin card to edit their display name and permissions. Use <strong>Remove Admin</strong> to revoke access.
          The <strong>Analytics</strong> permission controls who can see Plays & Downloads.
          Deleting records and managing admins always stay owner-only.
        </p>
      </Callout>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
        {/* ===== Add Admin Form ===== */}
        <form onSubmit={addAdmin} className="surface-card p-4 sm:p-6 space-y-4 h-fit rounded-sm order-2 lg:order-1 lg:col-span-2 min-w-0">
          <div className="flex items-center gap-2 mb-1 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <UserPlus size={17} className="gold-text" />
            <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>Add New Admin</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Enter the Google email of the person you want to grant access to. They must sign in with that Google account.
          </p>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>Google Email *</label>
            <input type="email" required placeholder="admin-email@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>Name (optional)</label>
            <input type="text" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} className="form-input" />
          </div>

          {/* Role selector */}
          <div className="p-3.5 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--text-dim)' }}>Role</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setNewRole('admin')}
                className="p-2.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors"
                style={newRole === 'admin'
                  ? { background: 'var(--gold)', color: '#0A0A0A' }
                  : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Shield size={13} className="inline mr-1.5" />Admin
              </button>
              <button type="button" onClick={() => setNewRole('super')}
                className="p-2.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5"
                style={newRole === 'super'
                  ? { background: 'var(--gold)', color: '#0A0A0A' }
                  : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Crown size={13} />Co-Owner
              </button>
            </div>
            <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {newRole === 'super'
                ? <>Co-Owners have <strong>full access</strong> to Artists, Music, Gifts & Analytics (including deleting records). They <em>cannot</em> manage other admins.</>
                : <>Admins only see what you grant them below. Start with Artists access enabled by default.</>}
            </p>
          </div>

          <div className="p-3.5 space-y-3 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', opacity: newRole === 'super' ? 0.5 : 1, pointerEvents: newRole === 'super' ? 'none' : 'auto' }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>
              Permissions {newRole === 'super' && <span className="normal-case tracking-normal">— all enabled for Co-Owners</span>}
            </p>
            {ADMIN_PERM_ROWS.map(opt => (
              <label key={opt.key} className="flex items-start justify-between gap-3 cursor-pointer">
                <span className="flex items-start gap-2.5 min-w-0" style={{ color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={newRole === 'super' ? true : !!newPerms[opt.key]}
                    onChange={e => setNewPerms({ ...newPerms, [opt.key]: e.target.checked })}
                    disabled={newRole === 'super'}
                    className="accent-gold w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium" style={{ color: 'var(--text)' }}>{opt.label}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-dim)' }}>{opt.desc}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={adding || (newRole === 'admin' && !newPerms.music && !newPerms.artists && !newPerms.donations && !newPerms.analytics && !newPerms.announcements)}
            className="btn-gold w-full disabled:opacity-60"
          >
            {adding
              ? 'Adding…'
              : newRole === 'super'
                ? 'Grant Co-Owner Access'
                : 'Grant Admin Access'}
          </button>
        </form>

        {/* ===== Admin List ===== */}
        <div className="lg:col-span-3 order-1 lg:order-2 min-w-0">
          <SectionTitle
            icon={Shield}
            title="Admin Users"
            count={pagination.total}
            subtitle="Click a card to edit · 5 admins per page"
          />
          <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search admins by email or name…" />

          {listLoading ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-dim)' }}>
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs uppercase tracking-widest">Loading admins…</p>
            </div>
          ) : admins.length === 0 ? (
            <EmptyState message={debouncedQuery ? 'No admins match your search.' : 'No other admins yet.'} emoji="👑" />
          ) : (
            <div className="space-y-3">
              {admins.map(a => {
                const isPrimary = !!a.isPrimaryOwner
                const isCoOwner = !isPrimary && a.role === 'super'
                const p = a.permissions || {}
                const activePerms = isCoOwner
                  ? ADMIN_PERM_ROWS.map(r => ({ key: r.key, label: r.label }))
                  : [
                      ...(p.artists !== false ? [{ key: 'artists', label: '🎨 Artists' }] : []),
                      ...(p.music ? [{ key: 'music', label: '🎵 Music' }] : []),
                      ...(p.donations ? [{ key: 'donations', label: '📊 Gifts' }] : []),
                      ...(p.analytics ? [{ key: 'analytics', label: '📈 Analytics' }] : []),
                      ...(p.announcements ? [{ key: 'announcements', label: '📢 Announcements' }] : []),
                    ]
                const locked = isPrimary

                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => !locked && openEdit(a)}
                    disabled={locked}
                    className={`surface-card p-3.5 sm:p-4 rounded-sm w-full text-left transition-all ${locked ? 'ring-1 ring-gold/40 cursor-default' : 'hover:border-[var(--gold-dim)] hover:translate-y-[-1px] cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0 rounded-sm ${isPrimary || isCoOwner ? 'gold-text' : ''}`}
                        style={{
                          background: (isPrimary || isCoOwner) ? 'var(--gold-dim)' : 'rgba(128,128,128,0.12)',
                          color: (isPrimary || isCoOwner) ? 'var(--gold)' : 'var(--text-muted)',
                        }}>
                        {(isPrimary || isCoOwner) ? <Crown size={18} /> : <Shield size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm sm:text-base truncate flex items-center gap-2 flex-wrap" style={{ color: 'var(--text)' }}>
                          {a.name || a.email.split('@')[0]}
                          {isPrimary ? (
                            <span className="chip chip-owner"><Crown size={9} /> Owner</span>
                          ) : isCoOwner ? (
                            <span className="chip chip-owner"><Crown size={9} /> Co-Owner</span>
                          ) : (
                            <span className="chip chip-admin">Admin</span>
                          )}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.email}</p>
                      </div>
                      {!locked && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="hidden sm:inline-flex p-2 rounded-sm transition-colors hover:bg-[var(--gold-dim)]" style={{ color: 'var(--text-muted)' }} title="Edit">
                            <Edit size={15} />
                          </span>
                        </div>
                      )}
                    </div>

                    {!locked ? (
                      <div className="mt-3 pt-3 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                        {activePerms.length === 0 ? (
                          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>No permissions granted</span>
                        ) : (
                          activePerms.map(ap => (
                            <span key={ap.key} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded-sm uppercase tracking-wider"
                              style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}>
                              {ap.label}
                            </span>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 pt-3 text-[11px] font-medium" style={{ borderTop: '1px solid var(--border)', color: 'var(--gold)', opacity: 0.7 }}>
                        Full access — primary owner (cannot be modified or removed).
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination page={page} pageNumbers={pageNumbers} goToPage={goToPage} totalPages={pagination.totalPages} loading={listLoading} />
          )}
        </div>
      </div>

      {/* ===== Edit Admin Modal ===== */}
      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div
            className="surface-card rounded-sm w-full max-w-md mx-auto my-auto p-5 sm:p-6 relative"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}
          >
            <button
              onClick={closeEdit}
              disabled={savingEdit}
              className="absolute top-3 right-3 p-2 rounded-sm transition-colors hover:bg-[var(--gold-dim)]"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Edit size={16} className="gold-text" />
              <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>Edit Admin</h3>
            </div>
            <p className="text-xs mb-4 truncate" style={{ color: 'var(--text-muted)' }}>{editing.email}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>Display Name</label>
                <input
                  type="text"
                  placeholder={editing.email.split('@')[0]}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  disabled={savingEdit}
                  className="form-input"
                />
              </div>

              {/* Role toggle */}
              <div className="p-3.5 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--text-dim)' }}>Role</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditRole('admin')} disabled={savingEdit}
                    className="p-2.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors"
                    style={editRole === 'admin'
                      ? { background: 'var(--gold)', color: '#0A0A0A' }
                      : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <Shield size={13} className="inline mr-1.5" />Admin
                  </button>
                  <button type="button" onClick={() => setEditRole('super')} disabled={savingEdit}
                    className="p-2.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5"
                    style={editRole === 'super'
                      ? { background: 'var(--gold)', color: '#0A0A0A' }
                      : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <Crown size={13} />Co-Owner
                  </button>
                </div>
                <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  {editRole === 'super'
                    ? <>Co-Owners have <strong>full access</strong> to Artists, Music, Gifts & Analytics. Only you (the Owner) can add/remove/promote admins.</>
                    : <>Admins only see the sections you enable below.</>}
                </p>
              </div>

              <div className="p-3.5 space-y-3 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', opacity: editRole === 'super' ? 0.5 : 1, pointerEvents: editRole === 'super' ? 'none' : 'auto' }}>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Permissions {editRole === 'super' && <span className="normal-case tracking-normal">— all enabled for Co-Owners</span>}
                </p>
                {ADMIN_PERM_ROWS.map(opt => (
                  <label key={opt.key} className="flex items-start justify-between gap-3 cursor-pointer">
                    <span className="flex items-start gap-2.5 min-w-0" style={{ color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={editRole === 'super' ? true : !!editPerms[opt.key]}
                        onChange={e => setEditPerms({ ...editPerms, [opt.key]: e.target.checked })}
                        disabled={savingEdit || editRole === 'super'}
                        className="accent-gold w-4 h-4 mt-0.5 flex-shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium" style={{ color: 'var(--text)' }}>{opt.label}</span>
                        <span className="block text-[11px]" style={{ color: 'var(--text-dim)' }}>{opt.desc}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2.5 pt-1 flex-col-reverse sm:flex-row">
                <button onClick={closeEdit} disabled={savingEdit} className="btn-dark flex-1">Cancel</button>
                <button onClick={saveEdit} disabled={savingEdit} className="btn-gold flex-1">
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {/* Remove admin inside modal */}
              <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => { openDelete(editing) }}
                  disabled={savingEdit}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] uppercase tracking-widest font-semibold rounded-sm transition-colors"
                  style={{ background: 'rgba(248,113,113,0.10)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.25)' }}
                >
                  <UserMinus size={13} /> Remove Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirm Modal ===== */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={cancelDelete}>
          <div
            className="surface-card rounded-sm w-full max-w-md mx-auto my-auto p-5 sm:p-6 relative"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', border: '1px solid rgba(248,113,113,0.4)' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                <Shield size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: '#fca5a5' }}>Remove Admin?</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  This will permanently revoke <strong style={{ color: 'var(--text)' }}>{confirmDelete.email}</strong>&apos;s admin access.
                  They will be signed out of the dashboard immediately. Their Google account and site activity are not affected.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#fca5a5' }}>
                Type their email to confirm: <span className="font-mono normal-case tracking-normal">{confirmDelete.email}</span>
              </label>
              <input
                type="email"
                autoFocus
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                disabled={deleting}
                placeholder={confirmDelete.email}
                className="form-input text-sm"
                style={{ borderColor: 'rgba(248,113,113,0.4)' }}
              />
            </div>

            <div className="flex gap-2.5 flex-col-reverse sm:flex-row">
              <button onClick={cancelDelete} disabled={deleting} className="btn-dark flex-1">Cancel</button>
              <button
                onClick={() => confirmDeleteAdmin(confirmDelete)}
                disabled={deleting || confirmText.trim().toLowerCase() !== confirmDelete.email.toLowerCase()}
                className="px-5 py-2.5 text-xs sm:text-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50 rounded-sm flex-1 inline-flex items-center justify-center gap-2"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                <Trash2 size={13} /> {deleting ? 'Removing…' : 'Yes, Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   ANNOUNCEMENTS MANAGER
   Full CRUD for pop-up announcements (video / image + fireworks / balloons),
   scheduling, duration, show-once, active toggle.
   ========================================================================= */
function AnnouncementsManager({ announcements, onRefresh }) {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'image',
    effect: 'none',
    mediaUrl: '',
    publicId: '',
    durationSec: 8,
    startsAt: '',
    endsAt: '',
    active: true,
    showOncePerUser: true,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(null)

  const reset = () => {
    setForm({
      title: '', message: '', type: 'image', effect: 'none',
      mediaUrl: '', publicId: '', durationSec: 8,
      startsAt: '', endsAt: '', active: true, showOncePerUser: true,
    })
    setEditing(null)
  }

  const startEdit = (a) => {
    setEditing(a)
    setForm({
      title: a.title || '',
      message: a.message || '',
      type: a.type || 'image',
      effect: a.effect || 'none',
      mediaUrl: a.mediaUrl || '',
      publicId: a.publicId || '',
      durationSec: a.durationSec || 8,
      startsAt: a.startsAt ? toLocalInput(a.startsAt) : '',
      endsAt: a.endsAt ? toLocalInput(a.endsAt) : '',
      active: a.active !== false,
      showOncePerUser: a.showOncePerUser !== false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Convert ISO/Date to datetime-local value "YYYY-MM-DDTHH:MM"
  const toLocalInput = (d) => {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  const uploadMedia = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'announcements')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (d.url) {
        setForm(f => ({
          ...f,
          mediaUrl: d.url,
          publicId: d.public_id || d.publicId || '',
          type: d.mediaType === 'video' ? 'video' : 'image',
        }))
        toast.success('Uploaded!')
      } else {
        toast.error(d.error || 'Upload failed')
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    }
    setUploading(false)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.mediaUrl) { toast.error('Upload an image or video first, or paste a URL'); return }
    const dur = Number(form.durationSec)
    if (isNaN(dur) || dur < 3 || dur > 120) { toast.error('Duration must be 3–120 seconds'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        effect: form.effect,
        mediaUrl: form.mediaUrl,
        publicId: form.publicId,
        durationSec: dur,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        active: !!form.active,
        showOncePerUser: !!form.showOncePerUser,
      }
      const url = editing ? `/api/announcements/${editing.id}` : '/api/announcements'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(editing ? 'Announcement updated!' : 'Announcement published!')
        reset()
        onRefresh()
      } else {
        toast.error(d.error || 'Failed to save')
      }
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const toggleActive = async (a) => {
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !a.active }),
      })
      if (res.ok) { toast.success(a.active ? 'Hidden' : 'Activated'); onRefresh() }
      else toast.error('Failed to update')
    } catch (e) { toast.error(e.message) }
  }

  const del = async (a) => {
    if (!confirm(`Delete announcement "${a.title}"?`)) return
    try {
      const res = await fetch(`/api/announcements/${a.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Deleted'); if (editing && editing.id === a.id) reset(); onRefresh() }
      else toast.error('Failed')
    } catch (e) { toast.error(e.message) }
  }

  const now = new Date()
  const getStatus = (a) => {
    if (!a.active) return { label: 'Inactive', color: 'var(--text-dim)', bg: 'rgba(128,128,128,0.12)' }
    if (a.startsAt && new Date(a.startsAt) > now) return { label: 'Scheduled', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' }
    if (a.endsAt && new Date(a.endsAt) < now) return { label: 'Expired', color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
    return { label: 'Live Now', color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '—'
    return dt.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
      {/* === FORM === */}
      <form onSubmit={save} className="surface-card p-4 sm:p-6 space-y-4 h-fit rounded-sm lg:col-span-2 min-w-0">
        <div className="flex items-center gap-2 pb-3 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <Megaphone size={17} className="gold-text" />
          <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>
            {editing ? 'Edit Pop-up' : 'New Pop-up Announcement'}
          </h3>
        </div>

        <Callout tone="gold" icon={Sparkles}>
          Pop-ups show full-screen to every visitor on their next page load. Video plays
          until ended; images auto-dismiss after the timer (default 8s). Visitors can skip any time.
        </Callout>

        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>Title *</label>
          <input
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Winner of the Month — Pablo!"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="form-input"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>Message (optional)</label>
          <textarea
            rows={2}
            maxLength={400}
            placeholder="Short subtext shown under the title"
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            className="form-input resize-none"
          />
        </div>

        {/* Media type */}
        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Media Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm({ ...form, type: 'image' })}
              className="p-2.5 text-xs uppercase tracking-wider font-semibold rounded-sm flex items-center justify-center gap-1.5 transition-colors"
              style={form.type === 'image'
                ? { background: 'var(--gold)', color: '#0A0A0A' }
                : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <ImageIcon size={14} /> Image
            </button>
            <button type="button" onClick={() => setForm({ ...form, type: 'video' })}
              className="p-2.5 text-xs uppercase tracking-wider font-semibold rounded-sm flex items-center justify-center gap-1.5 transition-colors"
              style={form.type === 'video'
                ? { background: 'var(--gold)', color: '#0A0A0A' }
                : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <Video size={14} /> Video
            </button>
          </div>
        </div>

        {/* Effect (images only) */}
        {form.type === 'image' && (
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Effect</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'None', icon: ImageIcon },
                { id: 'fireworks', label: '🎆 Winner', icon: Sparkles },
                { id: 'balloons', label: '🎈 Birthday', icon: Calendar },
              ].map(opt => {
                const Icon = opt.icon
                return (
                  <button key={opt.id} type="button" onClick={() => setForm({ ...form, effect: opt.id })}
                    className="p-2.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm flex flex-col items-center gap-1 transition-colors"
                    style={form.effect === opt.id
                      ? { background: 'var(--gold)', color: '#0A0A0A' }
                      : { background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <Icon size={15} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Upload */}
        <div>
          <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>
            {form.type === 'video' ? 'Video File' : 'Image'}
          </label>
          <input
            type="file"
            accept={form.type === 'video' ? 'video/*' : 'image/*'}
            onChange={uploadMedia}
            disabled={uploading}
            className="text-[10px] sm:text-xs mb-2 block w-full min-w-0 truncate"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="or paste URL"
            value={form.mediaUrl}
            onChange={e => setForm({ ...form, mediaUrl: e.target.value })}
            className="form-input"
          />
          {form.mediaUrl && (
            <div className="mt-2 rounded-sm overflow-hidden" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
              {form.type === 'video' ? (
                <video src={form.mediaUrl} controls className="w-full max-h-48 object-contain bg-black" />
              ) : (
                <img src={form.mediaUrl} alt="preview" className="w-full max-h-48 object-contain" />
              )}
            </div>
          )}
          {uploading && <p className="text-[11px] gold-text mt-1">Uploading…</p>}
        </div>

        {/* Duration (images only) */}
        {form.type === 'image' && (
          <div>
            <label className="block text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: 'var(--text-dim)' }}>
              <Timer size={11} className="inline mr-1" /> Auto-dismiss after ({form.durationSec} seconds)
            </label>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={form.durationSec}
              onChange={e => setForm({ ...form, durationSec: Number(e.target.value) })}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-dim)' }}>
              <span>3s</span><span>8s (default)</span><span>30s</span>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="p-3.5 rounded-sm space-y-3" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
            <CalendarClock size={12} /> Schedule
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>Starts at</label>
              <input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="form-input text-sm" />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>Leave blank = show immediately</p>
            </div>
            <div>
              <label className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>Ends at</label>
              <input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="form-input text-sm" />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>Leave blank = until disabled</p>
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-gold w-4 h-4" />
            <span>Active (visible to visitors)</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={form.showOncePerUser} onChange={e => setForm({ ...form, showOncePerUser: e.target.checked })} className="accent-gold w-4 h-4" />
            <span>Show only once per visitor</span>
          </label>
        </div>

        <div className="flex gap-2.5 pt-1">
          <button type="submit" disabled={saving || uploading} className="btn-gold flex-1 disabled:opacity-60 text-xs sm:text-sm">
            {saving ? 'Saving…' : (editing ? 'Update Pop-up' : 'Publish Pop-up')}
          </button>
          {editing && <button type="button" onClick={reset} className="btn-dark">Cancel</button>}
        </div>
      </form>

      {/* === LIST === */}
      <div className="lg:col-span-3 min-w-0">
        <SectionTitle
          icon={Megaphone}
          title="Announcements"
          count={announcements.length}
          subtitle="Only one pop-up shows at a time — the most recently updated active one in its window."
        />
        {announcements.length === 0 ? (
          <EmptyState message="No announcements yet. Create your first pop-up!" emoji="📢" />
        ) : (
          <div className="space-y-3">
            {announcements.map(a => {
              const status = getStatus(a)
              return (
                <div key={a.id} className="surface-card p-3.5 sm:p-4 rounded-sm flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-full sm:w-32 h-24 sm:h-24 rounded-sm overflow-hidden flex items-center justify-center"
                    style={{ background: '#000', border: '1px solid var(--border)' }}>
                    {a.type === 'video' ? (
                      <video src={a.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={a.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-display uppercase text-sm sm:text-base truncate flex items-center gap-2 flex-wrap" style={{ color: 'var(--text)' }}>
                          {a.title}
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider"
                            style={{ background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
                          <span className="inline-flex items-center gap-1">
                            {a.type === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                            {a.type === 'video' ? 'Video' : 'Image'}
                          </span>
                          {a.effect !== 'none' && a.type === 'image' && (
                            <span>
                              · {a.effect === 'fireworks' ? '🎆 Fireworks' : '🎈 Balloons'}
                            </span>
                          )}
                          {a.type === 'image' && <span>· {a.durationSec}s auto-dismiss</span>}
                          {a.showOncePerUser && <span>· once per user</span>}
                        </div>
                      </div>
                      {/* Active toggle */}
                      <IoSSwitch on={!!a.active} onChange={() => toggleActive(a)} />
                    </div>
                    {a.message && (
                      <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{a.message}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[10px] sm:text-[11px]" style={{ color: 'var(--text-dim)' }}>
                      <div className="flex items-center gap-1"><CalendarClock size={10} /> Starts: {formatDate(a.startsAt)}</div>
                      <div className="flex items-center gap-1"><Clock size={10} /> Ends: {formatDate(a.endsAt)}</div>
                      <div className="flex items-center gap-1"><Eye size={10} /> {a.views?.toLocaleString?.() || 0} views</div>
                      <div className="flex items-center gap-1"><MousePointerClick size={10} /> {a.skips?.toLocaleString?.() || 0} skips</div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button onClick={() => startEdit(a)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors"
                        style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => del(a)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold rounded-sm transition-colors hover:bg-red-500/10 text-red-400/70 hover:text-red-400">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
