import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Admin check helper
export function isAdminEmail(email) {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return admins.includes(email?.toLowerCase())
}
