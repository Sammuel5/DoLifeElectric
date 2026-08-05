'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Users, Music, BarChart3, Search, Trash2, Edit, X, Shield, UserPlus, UserMinus, Crown, Download, Activity, Play, DownloadCloud, Calendar, Trash } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('artists')
  const [artists, setArtists] = useState([])
  const [tracks, setTracks] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = !!session?.user?.isSuperAdmin
  const perms = session?.user?.permissions || {}
  const canMusic = isSuperAdmin || perms.music === true
  const canArtists = isSuperAdmin || perms.artists !== false
  const canDonations = isSuperAdmin || perms.donations === true
  const isAdmin = !!session?.user?.isAdmin

  // Compute tabs list — always called (hooks-safe, no early returns before this)
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

  // Default to first available tab if current tab isn't allowed (or if tabs list changed)
  useEffect(() => {
    if (!tabs.length) return
    if (!tabs.find(t => t.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  const loadAll = async () => {
    setLoading(true)
    const promises = [
      fetch('/api/artists').then(r => r.json()).catch(() => []),
      canMusic ? fetch('/api/music').then(r => r.json()).catch(() => []) : Promise.resolve([]),
    ]
    if (isSuperAdmin) promises.push(fetch('/api/admins').then(r => r.json()).catch(() => []))
    else promises.push(Promise.resolve([]))
    const [a, m, ad] = await Promise.all(promises)
    setArtists(Array.isArray(a) ? a : [])
    setTracks(Array.isArray(m) ? m : [])
    setAdmins(Array.isArray(ad) ? ad : [])
    setLoading(false)
  }

  if (status === 'loading' || !session) {
    return <div className="min-h-[70vh] flex items-center justify-center text-white/50">Loading...</div>
  }
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center p-4">
        <div>
          <p className="text-red-400 font-display text-2xl uppercase mb-4">Access Denied</p>
          <p className="text-white/50 mb-6">You are not authorized to view the admin dashboard.</p>
          <Link href="/" className="btn-gold">Return Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 px-3 sm:py-10 sm:px-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
        <div>
          <p className="text-gold text-xs uppercase tracking-[0.3em] mb-1">Admin Dashboard</p>
          <h1 className="font-display font-bold text-white text-2xl sm:text-3xl md:text-5xl uppercase flex items-center gap-2 flex-wrap">
            Welcome back
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-xs bg-gold/20 text-gold px-2 py-1 uppercase tracking-wider">
                <Crown size={12} /> Owner
              </span>
            )}
            {!isSuperAdmin && canMusic && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 uppercase tracking-wider">
                <Music size={12} /> Music Editor
              </span>
            )}
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1 break-all">Logged in as {session.user.email}</p>
        </div>
        <Link href="/" className="btn-dark text-xs self-start sm:self-auto">← View Site</Link>
      </div>

      <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs uppercase tracking-widest font-semibold transition-colors whitespace-nowrap ${tab === t.id ? 'text-gold border-b-2 border-gold' : 'text-white/50 hover:text-white'}`}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-white/40">Loading...</div>
      ) : (
        <>
          {tab === 'artists' && (canArtists
            ? <ArtistsManager artists={artists} onRefresh={loadAll} />
            : <NoAccessMessage feature="Artists" description="You don't have artist management permission." />)}
          {tab === 'music' && (canMusic
            ? <MusicManager tracks={tracks} onRefresh={loadAll} />
            : <NoAccessMessage feature="Music Management" description="You don't have music upload permission. Ask the owner to grant it." />)}
          {tab === 'musicactivity' && (isSuperAdmin
            ? <MusicActivityView />
            : <NoAccessMessage feature="Plays & Downloads" description="Only the owner can view listener analytics." />)}
          {tab === 'donations' && (canDonations
            ? <DonationsView isSuperAdmin={isSuperAdmin} onRefresh={loadAll} />
            : <NoAccessMessage feature="Gifts & Reports" description="You don't have access to gift data. Ask the owner to grant it." />)}
          {tab === 'admins' && (isSuperAdmin
            ? <AdminsManager admins={admins} onRefresh={loadAll} />
            : <NoAccessMessage feature="Admin Management" description="Only the owner can manage other admins." />)}
        </>
      )}
    </div>
  )
}

function NoAccessMessage({ feature, description }) {
  return (
    <div className="py-16 sm:py-20 text-center bg-dark-card border border-white/10 p-6">
      <Shield size={40} className="text-gold/60 mx-auto mb-4" />
      <p className="font-display text-xl sm:text-2xl uppercase text-white mb-2">{feature}</p>
      <p className="text-white/50 text-sm max-w-md mx-auto">{description}</p>
    </div>
  )
}

// ---- ARTISTS MANAGER with Group Assignment ----
function ArtistsManager({ artists, onRefresh }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', title: '', bio: '', image: '', videoUrl: '', isGroup: false, groupId: null,
  })
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

  const reset = () => {
    setEditing(null)
    setForm({ name: '', title: '', bio: '', image: '', videoUrl: '', isGroup: false, groupId: null })
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        groupId: (!form.groupId || form.groupId === '' || form.isGroup) ? null : form.groupId,
      }
      const url = editing ? `/api/artists/${editing._id}` : '/api/artists'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.duplicate) {
        if (window.confirm(`⚠️ ${data.error}\n\nClick OK to add anyway, or Cancel to change.`)) {
          const res2 = await fetch('/api/artists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, forceCreate: true }),
          })
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
  }

  const startEdit = a => {
    setEditing(a)
    const groupIdStr = a.groupId ? (typeof a.groupId === 'object' ? a.groupId.toString() : String(a.groupId)) : ''
    setForm({
      name: a.name, title: a.title || '', bio: a.bio || '', image: a.image || '',
      videoUrl: a.videoUrl || '', isGroup: a.isGroup || false, groupId: groupIdStr || null,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadFile = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', field === 'image' ? 'images' : 'videos')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) { setForm({ ...form, [field]: d.url }); toast.success('Uploaded!') }
    else toast.error(d.error || 'Upload failed')
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
      <form onSubmit={save} className="bg-dark-card border border-white/10 p-4 sm:p-6 space-y-4 h-fit order-2 lg:order-1">
        <h3 className="font-display text-xl uppercase text-white mb-2">{editing ? 'Edit Artist' : 'Add New Artist'}</h3>
        <input required placeholder="Artist Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" />
        <input placeholder="Title (e.g. Vocal Powerhouse)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" />
        <textarea rows={3} placeholder="Bio" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="form-input resize-none" />
        <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
          <input type="checkbox" checked={form.isGroup} onChange={e => setForm({...form, isGroup: e.target.checked, groupId: null})} className="accent-gold" />
          <span>This is a group</span>
        </label>
        {!form.isGroup && groups.length > 0 && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Member of Group (optional)</label>
            <select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value || null})} className="form-input">
              <option value="">— Solo Artist (no group) —</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Image (upload or paste URL)</label>
          <input type="file" accept="image/*" onChange={e => uploadFile(e, 'image')} className="text-xs text-white/60 mb-2 block w-full" />
          <input placeholder="https://... or /uploads/images/..." value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="form-input" />
          {form.image && <img src={form.image} alt="" className="mt-2 max-h-32 border border-white/10 max-w-full object-contain" />}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Opening Video (upload or paste URL)</label>
          <input type="file" accept="video/*" onChange={e => uploadFile(e, 'videoUrl')} className="text-xs text-white/60 mb-2 block w-full" />
          <input placeholder="YouTube, TikTok, MP4 URL, or /uploads/videos/..." value={form.videoUrl} onChange={e => setForm({...form, videoUrl: e.target.value})} className="form-input" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-gold flex-1 disabled:opacity-60">{saving ? 'Saving...' : (editing ? 'Update' : 'Add Artist')}</button>
          {editing && <button type="button" onClick={reset} className="btn-dark">Cancel</button>}
        </div>
      </form>

      <div className="order-1 lg:order-2">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="font-display text-xl uppercase text-white">
            Artists ({filtered.length})
            <span className="text-white/40 text-sm font-normal ml-2">· {groups.length} group{groups.length !== 1 ? 's' : ''}</span>
          </h3>
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Search artists..." value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10" />
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="text-white/40 text-sm">{query ? 'No artists match' : 'No artists yet. Add one on the left.'}</p>}
          {filtered.filter(a => a.isGroup).map(a => {
            const memberCount = artists.filter(m => m.groupId && String(m.groupId) === String(a._id)).length
            return (
              <div key={a._id} className="flex items-center gap-3 bg-dark-card border border-white/5 p-3 sm:p-4">
                {a.image ? <img src={a.image} className="w-12 h-12 sm:w-14 sm:h-14 object-cover flex-shrink-0" /> : <div className="w-12 h-12 sm:w-14 sm:h-14 bg-dark-light flex items-center justify-center text-white/30 text-lg font-display">{a.name?.[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-white uppercase truncate text-sm sm:text-base">{a.name} <span className="text-gold text-[10px] ml-1 bg-gold/20 px-1.5 py-0.5">GROUP</span></p>
                  <p className="text-white/40 text-xs truncate">{a.title}</p>
                  <p className="text-gold/60 text-[10px] mt-0.5">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => startEdit(a)} className="text-white/60 hover:text-gold p-2 flex-shrink-0"><Edit size={16} /></button>
                <button onClick={() => del(a._id)} className="text-red-400/60 hover:text-red-400 p-2 flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            )
          })}
          {filtered.filter(a => !a.isGroup).map(a => {
            const parentGroup = a.groupId ? groups.find(g => String(g._id) === String(a.groupId)) : null
            return (
              <div key={a._id} className="flex items-center gap-3 bg-dark-card border border-white/5 p-3 sm:p-4">
                {a.image ? <img src={a.image} className="w-12 h-12 sm:w-14 sm:h-14 object-cover flex-shrink-0" /> : <div className="w-12 h-12 sm:w-14 sm:h-14 bg-dark-light flex items-center justify-center text-white/30 text-lg font-display">{a.name?.[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-white uppercase truncate text-sm sm:text-base">{a.name}</p>
                  <p className="text-white/40 text-xs truncate">{a.title}{parentGroup && <span className="text-gold/60"> · {parentGroup.name}</span>}</p>
                </div>
                <button onClick={() => startEdit(a)} className="text-white/60 hover:text-gold p-2 flex-shrink-0"><Edit size={16} /></button>
                <button onClick={() => del(a._id)} className="text-red-400/60 hover:text-red-400 p-2 flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---- MUSIC MANAGER ----
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
    setForm({
      title: t.title || '',
      artistName: t.artistName || '',
      audioUrl: t.audioUrl || '',
      coverImage: t.coverImage || '',
      album: t.album || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async e => {
    e.preventDefault()
    if (!form.audioUrl && !editing) { toast.error('Please upload an audio file first or paste an audio URL'); return }
    if (!form.title.trim()) { toast.error('Track title is required'); return }
    if (!form.artistName.trim()) { toast.error('Artist name is required — type who performed/wrote this song'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        artistName: form.artistName.trim(),
        audioUrl: form.audioUrl,
        coverImage: form.coverImage,
        album: form.album.trim(),
        artistId: null,
      }
      const url = editing ? `/api/music/${editing._id}` : '/api/music'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(editing ? 'Track updated!' : 'Track added!')
        reset(); onRefresh()
      } else toast.error(data.error || 'Failed to save track.')
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

  return (
    <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
      <form onSubmit={save} className="bg-dark-card border border-white/10 p-4 sm:p-6 space-y-4 h-fit">
        <h3 className="font-display text-xl uppercase text-white mb-2">{editing ? 'Edit Track' : 'Upload New Track'}</h3>
        <input required placeholder="Track Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" />
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Artist Name * <span className="text-white/30 normal-case tracking-normal">(who wrote / performed this song)</span></label>
          <input
            required
            type="text"
            placeholder="e.g. Juan Dela Cruz, BTS, Sarah G."
            value={form.artistName}
            onChange={e => setForm({...form, artistName: e.target.value})}
            className="form-input"
          />
        </div>
        <input placeholder="Album (optional)" value={form.album} onChange={e => setForm({...form, album: e.target.value})} className="form-input" />
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Audio File (MP3/WAV) {editing ? '(leave empty to keep current)' : '*'}</label>
          <input type="file" accept="audio/*" onChange={e => uploadFile(e, 'audioUrl', 'audio')} className="text-xs text-white/60 mb-2 block w-full" />
          <input placeholder="or paste URL to MP3" value={form.audioUrl} onChange={e => setForm({...form, audioUrl: e.target.value})} className="form-input" />
          {form.audioUrl && (
            <div className="mt-2 bg-dark-light p-2">
              <audio src={form.audioUrl} controls className="w-full h-8" />
              <p className="text-green-400 text-xs mt-1">✅ Audio ready</p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Cover Image</label>
          <input type="file" accept="image/*" onChange={e => uploadFile(e, 'coverImage', 'images')} className="text-xs text-white/60 mb-2 block w-full" />
          <input placeholder="or paste URL" value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} className="form-input" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving || (!editing && !form.audioUrl)} className="btn-gold flex-1 disabled:opacity-60">{saving ? 'Saving...' : (editing ? 'Update Track' : 'Add Track')}</button>
          {editing && <button type="button" onClick={reset} className="btn-dark">Cancel</button>}
        </div>
      </form>

      <div>
        <h3 className="font-display text-xl uppercase text-white mb-3">Tracks ({filtered.length})</h3>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Search tracks..." value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10" />
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="text-white/40 text-sm">{query ? 'No tracks match' : 'No tracks yet. Upload one to get started.'}</p>}
          {filtered.map(t => (
            <div key={t._id} className={`flex items-center gap-3 bg-dark-card border p-3 sm:p-4 ${editing && editing._id === t._id ? 'border-gold/40' : 'border-white/5'}`}>
              {t.coverImage ? <img src={t.coverImage} className="w-12 h-12 object-cover flex-shrink-0" /> : <div className="w-12 h-12 bg-dark-light flex items-center justify-center gold-text text-xl">♪</div>}
              <div className="flex-1 min-w-0">
                <p className="font-display text-white uppercase truncate text-sm sm:text-base">{t.title} {editing && editing._id === t._id && <span className="text-gold text-[10px] bg-gold/20 px-1.5 py-0.5 ml-1">EDITING</span>}</p>
                <p className="text-white/40 text-xs truncate">{t.artistName}{t.album ? ` • ${t.album}` : ''}</p>
              </div>
              <button onClick={() => startEdit(t)} className="text-white/60 hover:text-gold p-2 flex-shrink-0" title="Edit track"><Edit size={16} /></button>
              <button onClick={() => del(t._id)} className="text-red-400/60 hover:text-red-400 p-2 flex-shrink-0" title="Delete track"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- DONATIONS VIEW (self-contained, paginated, 10 per page) ----
const PER_PAGE = 10
function DonationsView({ isSuperAdmin }) {
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
  const [stats, setStats] = useState({ totalRevenue: 0, completed: 0, other: 0, grandTotal: 0 })

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  // Reset to page 1 on filter/search change
  useEffect(() => { setPage(1) }, [debouncedQuery, statusFilter])

  // Fetch current page
  const fetchPage = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE), status: statusFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/donations?${params.toString()}`)
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setDonations(Array.isArray(d.donations) ? d.donations : [])
        setPagination(d.pagination || { page: p, limit: PER_PAGE, total: 0, totalPages: 1, hasMore: false })
        // Stats: completed revenue from current page; we also want grand totals
        const pageCompleted = (Array.isArray(d.donations) ? d.donations : []).filter(x => x.status === 'completed').reduce((s,x) => s + (x.amount||0), 0) / 100
        // We'll compute per-page stats; grand totals come from total counts
        setStats(s => ({
          ...s,
          pageRevenue: pageCompleted,
          pageShown: (Array.isArray(d.donations) ? d.donations : []).length,
        }))
      } else {
        toast.error(d.error || 'Failed to load gifts')
      }
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  // Fetch grand totals (all pages) for stats cards
  const fetchStats = async () => {
    try {
      // Use a lightweight request with limit=1 to get total counts per status — do 2 fetches for completed vs others
      // Actually simpler: fetch with limit=1 for all statuses and use totals. We'll do it via a small stats endpoint?
      // Simpler: fetch the first page with large limit once? No — we'll compute from two quick count-style calls.
      // For speed just reuse main fetch's total and show per-page revenue clearly.
      setStats(s => ({ ...s, grandTotal: pagination.total }))
    } catch {}
  }

  useEffect(() => { fetchPage(page) /* eslint-disable-next-line */ }, [page, debouncedQuery, statusFilter])

  // When pagination updates, set totals
  useEffect(() => {
    setStats(s => ({ ...s, grandTotal: pagination.total, totalPages: pagination.totalPages }))
  }, [pagination])

  const refresh = () => { fetchPage(page) }

  const exportData = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const url = `/api/donations/export?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || `Export failed (${res.status})`)
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `DLE-Gifts-${new Date().toISOString().slice(0,10)}.xls`
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(dlUrl)
      toast.success('Exported Excel file')
    } catch (e) {
      toast.error('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const formatPHP = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const giftEmojis = { food: '🍱', clothes: '👗', gift: '🎁', money: '💝' }

  const updateStatus = async (id, newStatus) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/donations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Status changed to ${newStatus}`); setEditingStatus(null); refresh() }
      else { toast.error(d.error || `Failed (${res.status})`); setEditingStatus(null) }
    } catch (e) { toast.error(e.message); setEditingStatus(null) }
    setSavingId(null)
  }

  const deleteDonation = async (id, info) => {
    if (!confirm(`Delete this gift record?\n\n${info}\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Gift deleted')
        // If we just deleted the only item on this page (and page > 1), go back a page
        if (donations.length === 1 && page > 1) setPage(page - 1)
        else refresh()
      }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || `Failed (${res.status})`) }
    } catch (e) { toast.error(e.message) }
  }

  const statusColor = s => s === 'completed' ? 'bg-green-500/20 text-green-400'
    : s === 'failed' ? 'bg-red-500/20 text-red-400'
    : s === 'refunded' ? 'bg-gray-500/20 text-gray-400'
    : 'bg-yellow-500/20 text-yellow-400'
  const STATUSES = ['pending', 'completed', 'failed', 'refunded']

  // Build page numbers with ellipses: always show first, last, current ±1
  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1
    const cur = page
    const pages = new Set([1, total, cur, cur-1, cur+1, cur-2, cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    // Insert ellipses markers as null
    const out = []
    for (let i=0; i<arr.length; i++) {
      if (i > 0 && arr[i] - arr[i-1] > 1) out.push(null)
      out.push(arr[i])
    }
    return out
  }, [pagination.totalPages, page])

  const goToPage = p => {
    if (p < 1 || p > pagination.totalPages) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageCompletedCount = donations.filter(d => d.status === 'completed').length
  const pageOtherCount = donations.length - pageCompletedCount
  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const showingTo = Math.min(pagination.total, page * PER_PAGE)

  return (
    <div>
      {!isSuperAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs sm:text-sm p-3 sm:p-4 mb-6 flex items-start gap-2">
          <Shield size={16} className="flex-shrink-0 mt-0.5" />
          <span>You're viewing gifts as an admin. Only the owner can edit or delete gift records. Gifts automatically flip to <strong>completed</strong> when PayMongo confirms payment.</span>
        </div>
      )}
      {isSuperAdmin && (
        <div className="bg-gold/10 border border-gold/30 text-gold text-xs sm:text-sm p-3 sm:p-4 mb-6 flex items-start gap-2">
          <Crown size={16} className="flex-shrink-0 mt-0.5" />
          <span>Owner access: click a status badge to change it, or use the ✕ button to remove a gift record. Statuses auto-update to <strong>completed</strong> when PayMongo confirms a paid payment.</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Total Gifts</p>
          <p className="font-display text-2xl sm:text-3xl gold-text mt-1 sm:mt-2">{pagination.total.toLocaleString()}</p>
          <p className="text-white/30 text-[10px] mt-1">{formatPHP(stats.pageRevenue || 0)} completed on this page</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Showing</p>
          <p className="font-display text-xl sm:text-2xl text-white mt-1 sm:mt-2">{showingFrom}–{showingTo}</p>
          <p className="text-white/30 text-[10px] mt-1">Page {page} of {pagination.totalPages}</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">On This Page</p>
          <p className="font-display text-2xl sm:text-3xl text-green-400 mt-1 sm:mt-2">{pageCompletedCount}</p>
          <p className="text-white/30 text-[10px] mt-1">completed</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">On This Page</p>
          <p className="font-display text-2xl sm:text-3xl text-yellow-400 mt-1 sm:mt-2">{pageOtherCount}</p>
          <p className="text-white/30 text-[10px] mt-1">pending/failed/refunded</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Search by fan, email, artist, ref, payment ID..." value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
          {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 ${statusFilter === s ? 'bg-gold text-dark' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{s}</button>
          ))}
        </div>
        <button
          onClick={exportData}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 text-gold text-xs uppercase tracking-wider font-semibold hover:bg-gold/20 transition-colors disabled:opacity-50 flex-shrink-0">
          <Download size={14} /> {exporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>
      <div className="bg-dark-card border border-white/10 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Date</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Fan</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Artist</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Gift</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Amount</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Status</th>
              {isSuperAdmin && <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="p-8 text-center text-white/40 text-sm">Loading...</td></tr>
            ) : donations.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="p-8 text-center text-white/40 text-sm">No gifts found{debouncedQuery && ' — try a different search'}</td></tr>
            ) : donations.map(d => {
              const isEditingThis = editingStatus === d._id
              return (
                <tr key={d._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 sm:p-4 text-white/60 whitespace-nowrap text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 sm:p-4 text-white truncate max-w-[140px] sm:max-w-[200px]">
                    <span className="text-sm">{d.userName}</span>
                    <br /><span className="text-white/40 text-[10px] sm:text-xs">{d.userEmail}</span>
                    {d.message && <div className="text-white/40 italic text-[10px] mt-1 truncate max-w-[140px] sm:max-w-[200px]" title={d.message}>"{d.message}"</div>}
                  </td>
                  <td className="p-3 sm:p-4 text-white/70 text-xs sm:text-sm">{d.artistName || 'General'}</td>
                  <td className="p-3 sm:p-4">{giftEmojis[d.giftType] || '🎁'} <span className="text-white/60 capitalize text-[10px] sm:text-xs hidden sm:inline">{d.giftType}</span></td>
                  <td className="p-3 sm:p-4 gold-text font-semibold text-sm">{formatPHP(d.amount / 100)}</td>
                  <td className="p-3 sm:p-4">
                    {isSuperAdmin ? isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <select defaultValue={d.status} autoFocus disabled={savingId === d._id}
                          onBlur={e => { if (e.target.value !== d.status) updateStatus(d._id, e.target.value); else setEditingStatus(null) }}
                          className="bg-dark-light text-white text-[11px] px-2 py-1 border border-white/20 outline-none">
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => setEditingStatus(null)} className="text-white/40 hover:text-white p-1" title="Cancel"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingStatus(d._id)} className={`text-[10px] sm:text-xs px-2 py-1 cursor-pointer hover:brightness-125 transition ${statusColor(d.status)}`} title="Click to change status (owner only)">{d.status} ✎</button>
                    ) : (
                      <span className={`text-[10px] sm:text-xs px-2 py-1 ${statusColor(d.status)}`}>{d.status}</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="p-3 sm:p-4 text-right">
                      <button onClick={() => deleteDonation(d._id, `${d.userName} → ${d.artistName || 'General'} · ${giftEmojis[d.giftType]} ${formatPHP(d.amount/100)} (${d.status})`)} className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 p-2 inline-flex items-center justify-center" title="Delete gift record"><X size={16} /></button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6 flex-wrap">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-2 text-xs uppercase tracking-wider font-semibold bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          {pageNumbers.map((p, i) => p === null ? (
            <span key={'e'+i} className="text-white/30 px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p)}
              disabled={loading}
              className={`min-w-[36px] h-9 px-2 sm:px-3 text-xs font-semibold transition-colors ${p === page ? 'bg-gold text-dark' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= pagination.totalPages || loading}
            className="px-3 py-2 text-xs uppercase tracking-wider font-semibold bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}

      <p className="text-white/40 text-xs mt-4 text-center">💡 All gift funds go to DLE Entertainment's PayMongo wallet. Distribute to artists manually using this list. Paid gifts are auto-marked <span className="text-green-400">completed</span> by PayMongo webhook.</p>
    </div>
  )
}

// ---- MUSIC ACTIVITY (Owner only: plays + downloads, paginated 10 per page) ----
const ACTIVITY_PER_PAGE = 10
function MusicActivityView() {
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: ACTIVITY_PER_PAGE, total: 0, totalPages: 1, hasMore: false })
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  // Bulk delete panel state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [quickRange, setQuickRange] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [bulkType, setBulkType] = useState('all')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => { setPage(1) }, [debouncedQuery, typeFilter])

  const fetchPage = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(ACTIVITY_PER_PAGE), type: typeFilter })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const res = await fetch(`/api/music/activity?${params.toString()}`)
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setActivities(Array.isArray(d.activities) ? d.activities : [])
        setPagination(d.pagination || { page: p, limit: ACTIVITY_PER_PAGE, total: 0, totalPages: 1, hasMore: false })
      } else {
        toast.error(d.error || 'Failed to load activity')
      }
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
      const url = `/api/music/activity/export?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || `Export failed (${res.status})`)
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `DLE-Music-Activity-${new Date().toISOString().slice(0,10)}.xls`
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(dlUrl)
      toast.success('Exported Excel file')
    } catch (e) {
      toast.error('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const deleteOne = async (id, info) => {
    if (!confirm(`Delete this record?\n\n${info}\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch('/api/music/activity/bulk-delete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Record deleted')
        if (activities.length === 1 && page > 1) setPage(page - 1)
        else refresh()
      }
      else toast.error(d.error || `Failed (${res.status})`)
    } catch (e) { toast.error(e.message) }
  }

  const ymd = (d) => {
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  }

  const computeRange = (range) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    switch (range) {
      case 'today': return { after: ymd(today), before: ymd(tomorrow), label: 'Today' }
      case 'week': {
        const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
        return { after: ymd(weekAgo), before: ymd(tomorrow), label: 'Last 7 days' }
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { after: ymd(start), before: ymd(tomorrow), label: 'This month' }
      }
      case 'lastmonth': {
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { after: ymd(lastMonthStart), before: ymd(thisMonthStart), label: 'Last month' }
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1)
        return { after: ymd(start), before: ymd(tomorrow), label: 'This year' }
      }
      case 'older': {
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        return { before: ymd(startOfYear), label: 'Older than this year' }
      }
      case 'all': return { all: true, label: 'ALL records (entire history)' }
      default: return null
    }
  }

  const executeBulkDelete = async () => {
    let payload = {}
    let desc = ''
    if (quickRange) {
      const r = computeRange(quickRange)
      if (!r) { toast.error('Pick a range first'); return }
      payload = { before: r.before, after: r.after, all: r.all }
      desc = r.label
    } else if (customFrom || customTo) {
      if (customFrom) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(customFrom)) { toast.error('Invalid "from" date'); return }
        payload.after = customFrom
      }
      if (customTo) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(customTo)) { toast.error('Invalid "to" date'); return }
        const [y,m,d] = customTo.split('-').map(Number)
        payload.before = ymd(new Date(y, m-1, d + 1))
      }
      desc = `${customFrom || 'beginning'} → ${customTo || 'now'}`
    } else {
      toast.error('Pick a quick range or enter a custom date range'); return
    }
    if (bulkType !== 'all') { payload.type = bulkType; desc += ` (${bulkType}s only)` }

    const typeLabel = bulkType === 'all' ? 'ALL activity' : bulkType + 's'
    const confirmMsg = `⚠️  DELETE PERMANENTLY?\n\nThis will delete ${typeLabel} matching:\n${desc}\n\nThis cannot be undone.\n\nAre you ABSOLUTELY sure? Type the confirmation in the next prompt.`
    if (!confirm(confirmMsg)) return
    const secondConfirm = prompt(`To confirm, type "DELETE" below:`)
    if (secondConfirm !== 'DELETE') { toast('Cancelled'); return }

    setDeleting(true)
    try {
      const res = await fetch('/api/music/activity/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Deleted ${d.deletedCount} record${d.deletedCount === 1 ? '' : 's'}`)
        setBulkOpen(false); setQuickRange(''); setCustomFrom(''); setCustomTo(''); setBulkType('all')
        // Go back to page 1 after bulk delete
        setPage(1)
        refresh()
      } else toast.error(d.error || `Delete failed (${res.status})`)
    } catch (e) { toast.error(e.message) }
    setDeleting(false)
  }

  const pagePlayCount = activities.filter(a => a.activityType === 'play').length
  const pageDownloadCount = activities.filter(a => a.activityType === 'download').length
  const pageListeners = new Set(activities.map(a => a.userEmail?.toLowerCase()).filter(Boolean)).size
  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * ACTIVITY_PER_PAGE + 1
  const showingTo = Math.min(pagination.total, page * ACTIVITY_PER_PAGE)

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages || 1
    const cur = page
    const pages = new Set([1, total, cur, cur-1, cur+1, cur-2, cur+2])
    const arr = [...pages].filter(p => p >= 1 && p <= total).sort((a,b) => a-b)
    const out = []
    for (let i=0; i<arr.length; i++) {
      if (i > 0 && arr[i] - arr[i-1] > 1) out.push(null)
      out.push(arr[i])
    }
    return out
  }, [pagination.totalPages, page])

  const goToPage = p => {
    if (p < 1 || p > pagination.totalPages) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const quickOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 days' },
    { id: 'month', label: 'This month' },
    { id: 'lastmonth', label: 'Last month' },
    { id: 'year', label: 'This year' },
    { id: 'older', label: 'Older (before this year)' },
  ]

  return (
    <div>
      <div className="bg-gold/10 border border-gold/30 text-gold text-xs sm:text-sm p-3 sm:p-4 mb-6 flex items-start gap-2">
        <Crown size={16} className="flex-shrink-0 mt-0.5" />
        <span>Owner-only analytics: see exactly who played your tracks and who downloaded them (signed-in Google users only). Anonymous/guest streams are not tracked — guests can still listen free without being logged.</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Total Activity</p>
          <p className="font-display text-2xl sm:text-3xl text-white mt-1 sm:mt-2">{pagination.total.toLocaleString()}</p>
          <p className="text-white/30 text-[10px] mt-1">all-time records</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Showing</p>
          <p className="font-display text-xl sm:text-2xl text-white mt-1 sm:mt-2">{showingFrom}–{showingTo}</p>
          <p className="text-white/30 text-[10px] mt-1">Page {page} of {pagination.totalPages}</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">On This Page</p>
          <p className="font-display text-xl sm:text-2xl text-green-400 mt-1 sm:mt-2">{pagePlayCount} ▶ {pageDownloadCount} ⬇</p>
          <p className="text-white/30 text-[10px] mt-1">plays · downloads</p>
        </div>
        <div className="bg-dark-card border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">On This Page</p>
          <p className="font-display text-2xl sm:text-3xl gold-text mt-1 sm:mt-2">{pageListeners}</p>
          <p className="text-white/30 text-[10px] mt-1">unique listeners</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Search by name, email, track, artist..." value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
          {[
            { id: 'all', label: 'All', icon: Activity },
            { id: 'play', label: 'Plays', icon: Play },
            { id: 'download', label: 'Downloads', icon: DownloadCloud },
          ].map(f => {
            const Icon = f.icon
            return (
              <button key={f.id} onClick={() => setTypeFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-semibold transition-colors flex-shrink-0 ${typeFilter === f.id ? 'bg-gold text-dark' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Icon size={13} /> {f.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setBulkOpen(!bulkOpen)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs uppercase tracking-wider font-semibold hover:bg-red-500/20 transition-colors flex-shrink-0">
          <Trash2 size={14} /> Manage Data
        </button>
        <button
          onClick={exportData}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 text-gold text-xs uppercase tracking-wider font-semibold hover:bg-gold/20 transition-colors disabled:opacity-50 flex-shrink-0">
          <Download size={14} /> {exporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

      {bulkOpen && (
        <div className="bg-dark-card border border-red-500/30 p-4 sm:p-6 mb-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-red-300 font-display text-lg uppercase">
              <Trash2 size={18} /> Bulk Delete Music Activity
            </h4>
            <button onClick={() => setBulkOpen(false)} className="text-white/40 hover:text-white p-1"><X size={18} /></button>
          </div>
          <p className="text-white/60 text-xs sm:text-sm">
            Clear analytics data by date range to keep the database from flooding. Deleting is permanent and cannot be undone.
            Music files, artist pages, and user accounts are NOT affected — only the play/download history records.
          </p>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Quick select</label>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map(o => (
                <button key={o.id}
                  onClick={() => { setQuickRange(quickRange === o.id ? '' : o.id); setCustomFrom(''); setCustomTo('') }}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${quickRange === o.id ? 'bg-red-500/30 text-red-200 border border-red-500/50' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'}`}>
                  {o.label}
                </button>
              ))}
              <button
                onClick={() => { setQuickRange(quickRange === 'all' ? '' : 'all'); setCustomFrom(''); setCustomTo('') }}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${quickRange === 'all' ? 'bg-red-600/40 text-red-100 border border-red-500 font-bold' : 'bg-red-900/20 text-red-300 hover:bg-red-900/40 border border-transparent'}`}>
                ⚠ Delete EVERYTHING
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Custom: From (inclusive)</label>
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setQuickRange('') }} className="form-input" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Custom: To (inclusive)</label>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setQuickRange('') }} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">What to delete</label>
            <div className="flex gap-2">
              {[{id:'all',label:'All activity'},{id:'play',label:'Plays only'},{id:'download',label:'Downloads only'}].map(o=>(
                <button key={o.id} onClick={()=>setBulkType(o.id)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${bulkType===o.id?'bg-red-500/30 text-red-200 border border-red-500/50':'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={executeBulkDelete} disabled={deleting}
              className="btn-gold bg-red-500 hover:bg-red-600 border-red-500 text-white disabled:opacity-60 flex-1 flex items-center justify-center gap-2">
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
            <button onClick={() => setBulkOpen(false)} className="btn-dark">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-dark-card border border-white/10 overflow-x-auto no-scrollbar" style={{WebkitOverflowScrolling:"touch"}}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Date & Time</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Action</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">User</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Track</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest">Artist</th>
              <th className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase text-white/50 tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-white/40 text-sm">Loading...</td></tr>
            ) : activities.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-white/40 text-sm">No activity yet{debouncedQuery && ' — try a different search'}. Activity starts appearing once signed-in users play or download tracks.</td></tr>
            ) : activities.map(a => {
              const dt = new Date(a.createdAt)
              const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
              const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
              const isPlay = a.activityType === 'play'
              return (
                <tr key={a._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 sm:p-4 text-white/60 whitespace-nowrap text-xs">
                    <div>{dateStr}</div>
                    <div className="text-white/30 text-[10px]">{timeStr}</div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 ${isPlay ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {isPlay ? <Play size={10} /> : <DownloadCloud size={10} />}
                      {isPlay ? 'Play' : 'Download'}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-white truncate max-w-[180px] sm:max-w-[240px]">
                    <span className="text-sm">{a.userName}</span>
                    <br /><span className="text-white/40 text-[10px] sm:text-xs">{a.userEmail}</span>
                  </td>
                  <td className="p-3 sm:p-4 text-white/80 text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[220px]">{a.trackTitle}</td>
                  <td className="p-3 sm:p-4 text-gold/80 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]">{a.artistName || 'DLE Entertainment'}</td>
                  <td className="p-3 sm:p-4 text-right">
                    <button
                      onClick={() => deleteOne(a._id, `${isPlay ? 'Play' : 'Download'} • ${a.trackTitle} by ${a.artistName || 'DLE'} • ${a.userName} (${a.userEmail}) • ${dateStr} ${timeStr}`)}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 p-2 inline-flex items-center justify-center"
                      title="Delete this individual record">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6 flex-wrap">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}
            className="px-3 py-2 text-xs uppercase tracking-wider font-semibold bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          {pageNumbers.map((p, i) => p === null ? (
            <span key={'e'+i} className="text-white/30 px-1">…</span>
          ) : (
            <button key={p} onClick={() => goToPage(p)} disabled={loading}
              className={`min-w-[36px] h-9 px-2 sm:px-3 text-xs font-semibold transition-colors ${p === page ? 'bg-gold text-dark' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => goToPage(page + 1)} disabled={page >= pagination.totalPages || loading}
            className="px-3 py-2 text-xs uppercase tracking-wider font-semibold bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}

      <p className="text-white/40 text-xs mt-4 text-center">💡 Only signed-in Google users are tracked. Guest/anonymous streams remain free and private. Duplicate plays within 5 minutes are deduplicated.</p>
    </div>
  )
}

// ---- ADMINS MANAGER (Owner only) ----
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
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          permissions: { music: grantMusic, artists: grantArtists, donations: grantDonations },
        }),
      })
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
      if (res.ok) { toast.success(`${a.email} removed from admins`); onRefresh() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed to remove') }
    } catch (e) { toast.error(e.message) }
  }

  const togglePerm = async (a, perm, value) => {
    setSavingPermId(a._id)
    try {
      const newPerms = { ...(a.permissions || {}), [perm]: value }
      const res = await fetch(`/api/admins/${a._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPerms }),
      })
      if (res.ok) { toast.success(`Updated ${a.email}`); onRefresh() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Failed to update') }
    } catch (e) { toast.error(e.message) }
    setSavingPermId(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gold/10 border border-gold/30 text-gold text-xs sm:text-sm p-3 sm:p-4 flex items-start gap-2">
        <Crown size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Owner Controls</p>
          <p className="text-gold/80">
            Grant or revoke permissions per admin:
            <strong> 🎨 Artists</strong> (add/edit/delete artists & groups),
            <strong> 🎵 Music</strong> (upload/edit/delete tracks),
            <strong> 📊 Gifts</strong> (view gift records & export data to Excel).
            Editing gift statuses, deleting gifts, and managing admins always stay owner-only.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
        <form onSubmit={addAdmin} className="bg-dark-card border border-white/10 p-4 sm:p-6 space-y-4 h-fit order-2 lg:order-1">
          <h3 className="font-display text-xl uppercase text-white mb-2 flex items-center gap-2">
            <UserPlus size={20} className="text-gold" /> Add New Admin
          </h3>
          <p className="text-white/50 text-xs">Enter the Google email of the person you want to grant admin access to. They must sign in with that Google account.</p>
          <input type="email" required placeholder="admin-email@gmail.com *" value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
          <input type="text" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} className="form-input" />

          <div className="bg-dark-light p-3 space-y-2 border border-white/5">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Permissions</p>
            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input type="checkbox" checked={grantArtists} onChange={e => setGrantArtists(e.target.checked)} className="accent-gold" />
              <span>🎨 Manage Artists & Groups</span>
            </label>
            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input type="checkbox" checked={grantMusic} onChange={e => setGrantMusic(e.target.checked)} className="accent-gold" />
              <span>🎵 Upload & Manage Music</span>
            </label>
            <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
              <input type="checkbox" checked={grantDonations} onChange={e => setGrantDonations(e.target.checked)} className="accent-gold" />
              <span>📊 View Gifts & Export Reports</span>
            </label>
          </div>

          <button type="submit" disabled={adding || (!grantArtists && !grantMusic && !grantDonations)} className="btn-gold w-full disabled:opacity-60">
            {adding ? 'Adding...' : 'Grant Admin Access'}
          </button>
        </form>

        <div className="order-1 lg:order-2">
          <h3 className="font-display text-xl uppercase text-white mb-3 flex items-center gap-2">
            <Shield size={20} className="text-gold" /> Admin Users ({filtered.length})
          </h3>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search admins..." value={query} onChange={e => setQuery(e.target.value)} className="form-input pl-10" />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="text-white/40 text-sm">No admins found.</p>}
            {filtered.map(a => {
              const isOwner = a.role === 'super'
              const perms = a.permissions || {}
              const musicOn = !!perms.music
              const artistsOn = perms.artists !== false
              const donationsOn = !!perms.donations
              return (
                <div key={a._id} className={`bg-dark-card border p-3 sm:p-4 ${isOwner ? 'border-gold/40' : 'border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0 ${isOwner ? 'bg-gold/20 text-gold' : 'bg-white/10 text-white/60'}`}>
                      {isOwner ? <Crown size={18} /> : <Shield size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-white text-sm sm:text-base truncate flex items-center gap-2 flex-wrap">
                        {a.name || a.email.split('@')[0]}
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 uppercase tracking-wider"><Crown size={10} /> Owner</span>
                        ) : (
                          <span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 uppercase tracking-wider">Admin</span>
                        )}
                      </p>
                      <p className="text-white/50 text-xs truncate">{a.email}</p>
                    </div>
                    {!isOwner && (
                      <button onClick={() => removeAdmin(a)} disabled={savingPermId === a._id}
                        className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 p-2 flex-shrink-0" title="Remove admin">
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                  {!isOwner && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-2">
                      <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={artistsOn}
                          disabled={savingPermId === a._id}
                          onChange={e => togglePerm(a, 'artists', e.target.checked)}
                          className="accent-gold"
                        />
                        <span>🎨 Artists</span>
                      </label>
                      <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={musicOn}
                          disabled={savingPermId === a._id}
                          onChange={e => togglePerm(a, 'music', e.target.checked)}
                          className="accent-gold"
                        />
                        <span>🎵 Music</span>
                      </label>
                      <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={donationsOn}
                          disabled={savingPermId === a._id}
                          onChange={e => togglePerm(a, 'donations', e.target.checked)}
                          className="accent-gold"
                        />
                        <span>📊 Gifts/Reports</span>
                      </label>
                    </div>
                  )}
                  {isOwner && (
                    <p className="mt-3 pt-3 border-t border-white/5 text-gold/60 text-[11px]">
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
