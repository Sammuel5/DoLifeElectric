'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Users, Music, BarChart3, Search, Trash2, Edit, X, Shield, UserPlus, UserMinus, Crown, Download, Activity, Play, DownloadCloud, Calendar, Trash, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

/* =========================================================================
   DLE Admin Dashboard — Professional, theme-aware (dark + light modes)
   - Uses CSS variables (--bg-card, --text, --border, etc.) so it adapts to theme.
   - Refined card designs with gold accent strip (via admin-stat-card class).
   - Crisper typography, cleaner spacing, refined tabs.
   ========================================================================= */

// Small fetch helper: treats a 503 with an empty payload (empty array / empty
// pagination) as a successful empty result rather than a throw, so admin UI
// renders empty states cleanly when the DB is down (e.g. antivirus TLS block).
async function safeFetch(url, fallback) {
  try {
    const res = await fetch(url)
    if (res.status === 503) {
      // Treat 503 (DB down) as an empty-but-valid response.
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

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('artists')
  const [artists, setArtists] = useState([])
  const [tracks, setTracks] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbDown, setDbDown] = useState(false)

  const isSuperAdmin = !!session?.user?.isSuperAdmin
  const perms = session?.user?.permissions || {}
  const canMusic = isSuperAdmin || perms.music === true
  const canArtists = isSuperAdmin || perms.artists !== false
  const canDonations = isSuperAdmin || perms.donations === true
  const isAdmin = !!session?.user?.isAdmin

  const tabs = useMemo(() => {
    const t = []
    if (canArtists) t.push({ id: 'artists', label: 'Artists', icon: Users })
    if (canMusic) t.push({ id: 'music', label: 'Music', icon: Music })
    if (isSuperAdmin) t.push({ id: 'musicactivity', label: 'Plays & Downloads', icon: Activity })
    if (canDonations) t.push({ id: 'donations', label: 'Gifts', icon: BarChart3 })
    if (isSuperAdmin) t.push({ id: 'admins', label: 'Admins', icon: Shield })
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canArtists, canMusic, canDonations, isSuperAdmin])

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/admin')
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
    const [a, m, ad] = await Promise.all([
      safeFetch('/api/artists', []),
      canMusic ? safeFetch('/api/music', []) : Promise.resolve([]),
      isSuperAdmin ? safeFetch('/api/admins', []) : Promise.resolve([]),
    ])
    const any503 =
      (a && typeof a === 'object' && 'dbDown' in a && a.dbDown) ||
      (m && typeof m === 'object' && 'dbDown' in m && m.dbDown) ||
      (ad && typeof ad === 'object' && 'dbDown' in ad && ad.dbDown)
    setDbDown(any503 === true)
    setArtists(Array.isArray(a) ? a : [])
    setTracks(Array.isArray(m) ? m : [])
    setAdmins(Array.isArray(ad) ? ad : [])
    setLoading(false)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="font-display tracking-widest uppercase text-sm">Loading…</span>
        </div>
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center p-4">
        <div className="surface-card p-8 sm:p-12 max-w-md">
          <Shield size={48} className="mx-auto mb-4 text-red-400" />
          <p className="font-display text-2xl uppercase mb-3" style={{ color: 'var(--text)' }}>Access Denied</p>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>You are not authorized to view the admin dashboard.</p>
          <Link href="/" className="btn-gold">Return Home</Link>
        </div>
      </div>
    )
  }

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

        {/* ===== Header ===== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-gold" />
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] font-semibold gold-text">Admin Control Panel</p>
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase leading-none flex items-center gap-2 flex-wrap" style={{ color: 'var(--text)' }}>
              Welcome back
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-[var(--gold-dim)] gold-text px-2 py-1 uppercase tracking-widest font-semibold">
                  <Crown size={11} /> Owner
                </span>
              ) : canMusic ? (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 uppercase tracking-widest font-semibold"
                  style={{ background: 'rgba(168,85,247,0.12)', color: '#c4b5fd' }}>
                  <Music size={11} /> Music Editor
                </span>
              ) : null}
            </h1>
            <p className="text-xs sm:text-sm mt-2 break-all" style={{ color: 'var(--text-muted)' }}>
              Logged in as <span className="font-medium">{session.user.email}</span>
            </p>
          </div>
          <Link href="/" className="btn-dark text-xs self-start sm:self-auto inline-flex items-center gap-2">
            <ArrowLeft size={13} /> View Site
          </Link>
        </div>

        {dbDown && (
          <Callout tone="red" icon={Shield}>
            <strong className="font-semibold">Database is currently unreachable.</strong>{' '}
            Sign-in still works, but artists / tracks / gifts data cannot be loaded or edited right now.
            Wait a moment and refresh — if this persists, run <code className="px-1 py-0.5 rounded-sm text-[11px]" style={{background:'rgba(0,0,0,0.35)'}}>node test-db.js</code>
            {' '}in PowerShell. The most common Windows cause is antivirus HTTPS/TLS scanning blocking MongoDB Atlas.
          </Callout>
        )}

        {/* ===== Tabs ===== */}
        <div className="flex gap-0 sm:gap-0.5 border-b mb-5 sm:mb-8 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 w-[calc(100%+1.5rem)] sm:w-full"
          style={{ borderColor: 'var(--border)', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 text-[11px] sm:text-xs uppercase tracking-[0.15em] font-semibold transition-colors whitespace-nowrap ${active ? '' : 'hover:opacity-100'}`}
                style={{
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Icon size={15} className="sm:w-4 sm:h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-dim)' }}>
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest">Loading dashboard…</p>
          </div>
        ) : (
          <>
            {tab === 'artists' && (canArtists
              ? <ArtistsManager artists={artists} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Artists" description="You don't have artist management permission." />)}
            {tab === 'music' && (canMusic
              ? <MusicManager tracks={tracks} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Music Management" description="You don't have music upload permission. Ask the owner to grant it." />)}
            {tab === 'musicactivity' && (isSuperAdmin
              ? <MusicActivityView dbDown={dbDown} />
              : <NoAccessMessage feature="Plays & Downloads" description="Only the owner can view listener analytics." />)}
            {tab === 'donations' && (canDonations
              ? <DonationsView isSuperAdmin={isSuperAdmin} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Gifts & Reports" description="You don't have access to gift data. Ask the owner to grant it." />)}
            {tab === 'admins' && (isSuperAdmin
              ? <AdminsManager admins={admins} onRefresh={loadAll} dbDown={dbDown} />
              : <NoAccessMessage feature="Admin Management" description="Only the owner can manage other admins." />)}
          </>
        )}
      </div>
    </>
  )
}

/* ---------- Helper components ---------- */

function NoAccessMessage({ feature, description }) {
  return (
    <div className="py-12 sm:py-20 text-center surface-card p-6 sm:p-10">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-dim)' }}>
        <Shield size={28} className="gold-text" />
      </div>
      <p className="font-display text-xl sm:text-2xl uppercase mb-2" style={{ color: 'var(--text)' }}>{feature}</p>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle, count }) {
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
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-3 sm:mb-4">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
      <input type="text" placeholder={placeholder} value={value} onChange={onChange}
        className="form-input pl-10 text-sm" />
    </div>
  )
}

function EmptyState({ message, emoji = '📭' }) {
  return (
    <div className="text-center py-10 surface-card">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}

function ListItemAvatar({ letter, src }) {
  return src
    ? <img src={src} className="w-11 h-11 sm:w-12 sm:h-12 object-cover flex-shrink-0 rounded-sm" style={{ border: '1px solid var(--border)' }} />
    : <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 font-display text-xl rounded-sm"
        style={{ background: 'var(--bg-elev)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>{letter}</div>
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const colorMap = {
    default: { color: 'var(--text)' },
    gold: {},
    green: { color: '#34d399' },
    yellow: { color: '#fbbf24' },
    blue: { color: '#60a5fa' },
    red: { color: '#f87171' },
  }
  return (
    <div className="admin-stat-card rounded-sm">
      <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--text-dim)' }}>{label}</p>
      <p className={`font-display text-2xl sm:text-3xl mt-1.5 sm:mt-2 ${accent === 'gold' ? 'gold-text' : ''}`} style={colorMap[accent] === colorMap.gold ? {} : colorMap[accent]}>
        {value}
      </p>
      {sub && <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{sub}</p>}
    </div>
  )
}

function Callout({ tone = 'info', icon: Icon, children }) {
  const tones = {
    info:   { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)', text: '#93c5fd' },
    gold:   { bg: 'var(--gold-dim)',         border: 'var(--gold)',          text: 'var(--gold)' },
    red:    { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)', text: '#fca5a5' },
  }
  const t = tones[tone]
  return (
    <div className="text-xs sm:text-sm p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-2.5 rounded-sm"
      style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.text }}>
      {Icon && <Icon size={15} className="flex-shrink-0 mt-0.5" />}
      <div>{children}</div>
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
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file); fd.append('folder', field === 'image' ? 'images' : 'videos')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) { setForm({ ...form, [field]: d.url }); toast.success('Uploaded!') }
    else toast.error(d.error || 'Upload failed')
  }

  const groupList = filtered.filter(a => a.isGroup)
  const soloList = filtered.filter(a => !a.isGroup)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
      {/* Form */}
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

      {/* List */}
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
function MusicManager({ tracks, onRefresh }) {
  const [form, setForm] = useState({ title: '', artistName: '', audioUrl: '', coverImage: '', album: '' })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.artistName?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q)
    )
  }, [tracks, query])

  const reset = () => { setForm({ title: '', artistName: '', audioUrl: '', coverImage: '', album: '' }); setEditing(null) }
  const startEdit = t => {
    setEditing(t)
    setForm({ title: t.title || '', artistName: t.artistName || '', audioUrl: t.audioUrl || '', coverImage: t.coverImage || '', album: t.album || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async e => {
    e.preventDefault()
    if (!form.audioUrl && !editing) { toast.error('Please upload an audio file first or paste an audio URL'); return }
    if (!form.title.trim()) { toast.error('Track title is required'); return }
    if (!form.artistName.trim()) { toast.error('Artist name is required'); return }
    setSaving(true)
    try {
      const payload = { title: form.title.trim(), artistName: form.artistName.trim(), audioUrl: form.audioUrl, coverImage: form.coverImage, album: form.album.trim(), artistId: null }
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

  const isEditing = id => editing && editing._id === id

  return (
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
        <input placeholder="Album (optional)" value={form.album} onChange={e => setForm({...form, album: e.target.value})} className="form-input" />
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

      <div className="lg:col-span-3 order-1 lg:order-2">
        <SectionTitle icon={Music} title="Tracks" count={filtered.length} />
        <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tracks by title, artist, album…" />
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {filtered.length === 0 && <EmptyState message={query ? 'No tracks match.' : 'No tracks yet. Upload one to get started.'} emoji="🎵" />}
          {filtered.map(t => (
            <div key={t._id} className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 min-w-0 rounded-sm transition-colors surface-card ${isEditing(t._id) ? 'ring-1 ring-gold/40' : ''}`}>
              {t.coverImage
                ? <img src={t.coverImage} className="w-11 h-11 sm:w-12 sm:h-12 object-cover flex-shrink-0 rounded-sm" style={{ border: '1px solid var(--border)' }} />
                : <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 rounded-sm gold-text text-xl"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>♪</div>}
              <div className="flex-1 min-w-0">
                <p className="font-display uppercase truncate text-sm sm:text-base flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text)' }}>
                  {t.title}
                  {isEditing(t._id) && <span className="text-[9px] sm:text-[10px] gold-text px-1.5 py-0.5 font-semibold tracking-wider" style={{ background: 'var(--gold-dim)' }}>EDITING</span>}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.artistName}{t.album ? ` • ${t.album}` : ''}</p>
              </div>
              <button onClick={() => startEdit(t)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-[var(--gold-dim)]" style={{ color: 'var(--text-muted)' }} title="Edit"><Edit size={15} /></button>
              <button onClick={() => del(t._id)} className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   DONATIONS VIEW (paginated)
   ========================================================================= */
const PER_PAGE = 10
function DonationsView({ isSuperAdmin, dbDown: dbDownProp }) {
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
  const refresh = () => fetchPage(page)

  const exportData = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/donations/export?${params.toString()}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || `Export failed`); return }
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

  const formatPHP = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  const statusChipClass = s => {
    const map = {
      completed: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
      failed:    { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
      refunded:  { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
      pending:   { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    }
    return map[s] || map.pending
  }
  const STATUSES = ['pending', 'completed', 'failed', 'refunded']

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1, cur = page
    const pages = new Set([1, total, cur, cur-1, cur+1, cur-2, cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    const out = []
    for (let i=0; i<arr.length; i++) { if (i > 0 && arr[i] - arr[i-1] > 1) out.push(null); out.push(arr[i]) }
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
        <Callout tone="info" icon={Shield}>
          You're viewing gifts as an admin. Only the owner can edit or delete gift records.
        </Callout>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-6">
        <StatCard label="Total Gifts" value={pagination.total.toLocaleString()} sub={`${formatPHP(pageRevenue)} completed this page`} accent="gold" />
        <StatCard label="Showing" value={`${showingFrom}–${showingTo}`} sub={`Page ${page} of ${pagination.totalPages}`} />
        <StatCard label="Completed" value={pageCompletedCount} sub="on this page" accent="green" />
        <StatCard label="Other" value={pageOtherCount} sub="pending · failed · refunded" accent="yellow" />
      </div>

      {/* Toolbar */}
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

      {/* Table */}
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
              const chip = statusChipClass(d.status)
              return (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-[var(--gold-dim)] transition-colors">
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
                        className="text-[10px] sm:text-xs px-2 py-1 cursor-pointer rounded-sm transition hover:brightness-125"
                        style={{ background: chip.bg, color: chip.color }}>{d.status} ✎</button>
                    )) : (
                      <span className="text-[10px] sm:text-xs px-2 py-1 rounded-sm" style={{ background: chip.bg, color: chip.color }}>{d.status}</span>
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

/* ---------- Reusable Pagination ---------- */
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
function MusicActivityView() {
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
      <Callout tone="gold" icon={Crown}>
        <strong className="font-semibold">Owner-only analytics:</strong> see exactly who played your tracks and who downloaded them (signed-in Google users only). Guest streams stay private and untracked.
      </Callout>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-5 sm:mb-6">
        <StatCard label="Total Activity" value={pagination.total.toLocaleString()} sub="all-time records" />
        <StatCard label="Showing" value={`${showingFrom}–${showingTo}`} sub={`Page ${page} of ${pagination.totalPages}`} />
        <StatCard label="This Page" value={`${pagePlayCount} ▶ ${pageDownloadCount} ⬇`} sub="plays · downloads" accent="green" />
        <StatCard label="Listeners" value={pageListeners} sub="unique on this page" accent="gold" />
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
          <button onClick={() => setBulkOpen(!bulkOpen)}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 rounded-sm"
            style={{ background: 'rgba(248,113,113,0.08)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.25)' }}>
            <Trash2 size={13} /> Manage
          </button>
          <button onClick={exportData} disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 rounded-sm disabled:opacity-50"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-dim)' }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {bulkOpen && (
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
              <th className="p-3 sm:p-4 text-[10px] uppercase tracking-widest text-right font-semibold" style={{ color: 'var(--text-dim)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>No activity yet{debouncedQuery && ' — try a different search'}.</td></tr>
            ) : activities.map(a => {
              const dt = new Date(a.createdAt)
              const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
              const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
              const isPlay = a.activityType === 'play'
              const chipColor = isPlay
                ? { bg: 'rgba(52,211,153,0.15)', color: '#34d399' }
                : { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              return (
                <tr key={a._id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-[var(--gold-dim)] transition-colors">
                  <td className="p-3 sm:p-4 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div>{dateStr}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{timeStr}</div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-sm font-semibold" style={chipColor}>
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
                  <td className="p-3 sm:p-4 text-right">
                    <button onClick={() => deleteOne(a._id, `${isPlay?'Play':'Download'} • ${a.trackTitle} by ${a.artistName||'DLE'} • ${a.userName} (${a.userEmail}) • ${dateStr} ${timeStr}`)}
                      className="p-2 inline-flex items-center justify-center rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Delete">
                      <X size={13} />
                    </button>
                  </td>
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
   ADMINS MANAGER
   ========================================================================= */
function AdminsManager({ admins, onRefresh }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [grantMusic, setGrantMusic] = useState(false)
  const [grantArtists, setGrantArtists] = useState(true)
  const [grantDonations, setGrantDonations] = useState(false)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [savingPermId, setSavingPermId] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(a => a.email?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
  }, [admins, query])

  const addAdmin = async e => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), name: name.trim(), permissions: { music: grantMusic, artists: grantArtists, donations: grantDonations } }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`${email} added as admin`); setEmail(''); setName(''); setGrantMusic(false); setGrantArtists(true); setGrantDonations(false); onRefresh() }
      else toast.error(data.error || 'Failed to add admin')
    } catch (e) { toast.error(e.message) }
    setAdding(false)
  }

  const removeAdmin = async a => {
    if (!confirm(`Remove admin access from ${a.email}?\n\nThey will no longer be able to access the admin dashboard.`)) return
    try {
      const res = await fetch(`/api/admins/${a._id}`, { method: 'DELETE' })
      if (res.ok) { toast.success(`${a.email} removed`); onRefresh() }
      else { const d=await res.json().catch(()=>({})); toast.error(d.error||'Failed') }
    } catch (e) { toast.error(e.message) }
  }

  const togglePerm = async (a, perm, value) => {
    setSavingPermId(a._id)
    try {
      const newPerms = { ...(a.permissions||{}), [perm]: value }
      const res = await fetch(`/api/admins/${a._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: newPerms }) })
      if (res.ok) { toast.success(`Updated ${a.email}`); onRefresh() }
      else { const d=await res.json().catch(()=>({})); toast.error(d.error||'Failed') }
    } catch (e) { toast.error(e.message) }
    setSavingPermId(null)
  }

  return (
    <div className="space-y-5">
      <Callout tone="gold" icon={Crown}>
        <p className="font-semibold mb-1">Owner Controls</p>
        <p style={{ opacity: 0.85 }}>
          Grant or revoke per-admin permissions:
          <strong className="mx-1">🎨 Artists</strong> (edit artists/groups),
          <strong className="mx-1">🎵 Music</strong> (upload/edit tracks),
          <strong className="mx-1">📊 Gifts</strong> (view/export).
          Editing gifts, deleting records, and managing admins stay owner-only.
        </p>
      </Callout>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
        <form onSubmit={addAdmin} className="surface-card p-4 sm:p-6 space-y-3.5 sm:space-y-4 h-fit rounded-sm order-2 lg:order-1 lg:col-span-2 min-w-0">
          <div className="flex items-center gap-2 mb-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <UserPlus size={17} className="gold-text" />
            <h3 className="font-display text-lg sm:text-xl uppercase" style={{ color: 'var(--text)' }}>Add New Admin</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enter the Google email of the person you want to grant access to. They must sign in with that Google account.</p>
          <input type="email" required placeholder="admin-email@gmail.com *" value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
          <input type="text" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} className="form-input" />

          <div className="p-3.5 space-y-2.5 rounded-sm" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-dim)' }}>Permissions</p>
            {[
              { key: 'artists', val: grantArtists, set: setGrantArtists, label: '🎨 Manage Artists & Groups' },
              { key: 'music', val: grantMusic, set: setGrantMusic, label: '🎵 Upload & Manage Music' },
              { key: 'donations', val: grantDonations, set: setGrantDonations, label: '📊 View Gifts & Export' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={opt.val} onChange={e => opt.set(e.target.checked)} className="accent-gold w-4 h-4" />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <button type="submit" disabled={adding || (!grantArtists && !grantMusic && !grantDonations)} className="btn-gold w-full disabled:opacity-60">
            {adding ? 'Adding…' : 'Grant Admin Access'}
          </button>
        </form>

        <div className="lg:col-span-3 order-1 lg:order-2">
          <SectionTitle icon={Shield} title="Admin Users" count={filtered.length} />
          <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search admins by email or name…" />
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filtered.length === 0 && <EmptyState message="No admins found." emoji="👑" />}
            {filtered.map(a => {
              const isOwner = a.role === 'super'
              const p = a.permissions || {}
              const musicOn = !!p.music, artistsOn = p.artists !== false, donationsOn = !!p.donations
              return (
                <div key={a._id} className={`surface-card p-3.5 sm:p-4 rounded-sm ${isOwner ? 'ring-1 ring-gold/30' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0 rounded-sm ${isOwner ? 'gold-text' : ''}`}
                      style={{ background: isOwner ? 'var(--gold-dim)' : 'rgba(128,128,128,0.12)', color: isOwner ? 'var(--gold)' : 'var(--text-muted)' }}>
                      {isOwner ? <Crown size={18} /> : <Shield size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm sm:text-base truncate flex items-center gap-2 flex-wrap" style={{ color: 'var(--text)' }}>
                        {a.name || a.email.split('@')[0]}
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 text-[10px] gold-text px-1.5 py-0.5 uppercase tracking-wider font-semibold" style={{ background: 'var(--gold-dim)' }}><Crown size={9} /> Owner</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-semibold" style={{ background: 'rgba(128,128,128,0.12)', color: 'var(--text-muted)' }}>Admin</span>
                        )}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.email}</p>
                    </div>
                    {!isOwner && (
                      <button onClick={() => removeAdmin(a)} disabled={savingPermId === a._id}
                        className="p-1.5 sm:p-2 flex-shrink-0 rounded-sm transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400" title="Remove">
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                  {!isOwner ? (
                    <div className="mt-3 pt-3 flex flex-wrap gap-x-4 gap-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                      {[
                        { key: 'artists', val: artistsOn, label: '🎨 Artists' },
                        { key: 'music', val: musicOn, label: '🎵 Music' },
                        { key: 'donations', val: donationsOn, label: '📊 Gifts' },
                      ].map(opt => (
                        <label key={opt.key} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                          <input type="checkbox" checked={opt.val} disabled={savingPermId===a._id}
                            onChange={e => togglePerm(a, opt.key, e.target.checked)} className="accent-gold w-3.5 h-3.5" />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 pt-3 text-[11px] font-medium" style={{ borderTop: '1px solid var(--border)', color: 'var(--gold)', opacity: 0.7 }}>
                      Full access — all permissions (cannot be modified or removed).
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
