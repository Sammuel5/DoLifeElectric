'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, X, ChevronRight } from 'lucide-react'

const CHECKS = [
  { key: 'mongodb',        label: 'MongoDB Database' },
  { key: 'google',         label: 'Google OAuth' },
  { key: 'paymongo',       label: 'PayMongo Secret Key' },
  { key: 'paymongoWebhook',label: 'PayMongo Webhook Secret' },
  { key: 'nextauthSecret', label: 'NextAuth Secret' },
  { key: 'ownerEmail',     label: 'Owner Email' },
]

export default function SetupBanner() {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname
    const local = host === 'localhost' || host === '127.0.0.1'
    setIsLocal(local)
    if (!local) return

    fetch('/api/setup-status', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data && !data.localOnly) setStatus(data) })
      .catch(() => {})
  }, [])

  if (!isLocal || !status || status.ok || dismissed) return null

  const missing = CHECKS.filter(c => !status[c.key])
  if (missing.length === 0) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-yellow-500/10 border-b border-yellow-500/30 backdrop-blur-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
        <div className="flex-1 text-sm">
          <p className="text-yellow-200 font-semibold">Setup incomplete</p>
          <p className="text-yellow-200/70 text-xs mt-1">
            Configure the following in <code className="bg-black/30 px-1 rounded">.env.local</code>:
          </p>
          <ul className="mt-2 space-y-1">
            {missing.map(c => (
              <li key={c.key} className="text-yellow-100/80 text-xs flex items-center gap-2">
                <ChevronRight size={12} className="text-yellow-400" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => setDismissed(true)} className="text-yellow-200/60 hover:text-yellow-200 p-1 flex-shrink-0" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
