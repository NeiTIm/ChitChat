
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Bell,
  BellOff,
  LoaderCircle,
} from 'lucide-react'

import { notificationsApi } from '../api/notificationsApi'

export default function ConversationMuteButton({
  token,
  conversationId,
}) {
  const [mutedUntil, setMutedUntil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // ====================================================
  // LOAD CONVERSATION SETTINGS
  // ====================================================

  useEffect(() => {
    let active = true

    setMutedUntil(null)
    setError('')
    setLoading(true)

    if (!token || !conversationId) {
      setLoading(false)
      return () => {
        active = false
      }
    }

    notificationsApi
      .getConversationsByIdSettings(
        conversationId,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(({ data }) => {
        if (!active) return

        setMutedUntil(data?.mutedUntil ?? null)
        setNow(Date.now())
      })
      .catch(() => {
        if (!active) return

        setError('Không thể tải cài đặt thông báo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, conversationId])

  // ====================================================
  // UPDATE MUTE STATUS WHEN TIME EXPIRES
  // ====================================================

  useEffect(() => {
    if (!mutedUntil) return

    const expiration = new Date(mutedUntil).getTime()

    if (!Number.isFinite(expiration)) return

    const remaining = expiration - Date.now()

    if (remaining <= 0) {
      setNow(Date.now())
      return
    }

    const timeout = window.setTimeout(() => {
      setNow(Date.now())
    }, Math.min(remaining, 2147483647))

    return () => {
      window.clearTimeout(timeout)
    }
  }, [mutedUntil, now])

  const expirationTime = mutedUntil
    ? new Date(mutedUntil).getTime()
    : 0

  const muted =
    Number.isFinite(expirationTime) &&
    expirationTime > now

  // ====================================================
  // TOGGLE MUTE
  // ====================================================

  const toggle = async () => {
    if (!token || !conversationId || busy || loading) return

    setBusy(true)
    setError('')

    const next = muted
      ? null
      : new Date(Date.now() + 60 * 60 * 1000).toISOString()

    try {
      await notificationsApi.patchConversationsByIdSettings(
        conversationId,
        {
          mutedUntil: next,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setMutedUntil(next)
      setNow(Date.now())
    } catch {
      setError(
        'Không thể thay đổi cài đặt thông báo. Vui lòng thử lại.'
      )
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || loading || !token || !conversationId

  const buttonLabel = muted
    ? 'Bật lại thông báo'
    : 'Tắt thông báo trong 1 giờ'

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="relative inline-flex shrink-0 items-center">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={buttonLabel}
        aria-pressed={Boolean(muted)}
        title={buttonLabel}
        className={`
          relative flex size-10 shrink-0 items-center
          justify-center rounded-xl
          transition-all duration-200
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-indigo-500
          focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          disabled:opacity-50
          dark:focus-visible:ring-offset-slate-900
          ${
            muted
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20'
              : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400'
          }
        `}
      >
        {busy || loading ? (
          <LoaderCircle
            size={19}
            strokeWidth={1.8}
            className="animate-spin"
          />
        ) : muted ? (
          <BellOff
            size={19}
            strokeWidth={1.8}
          />
        ) : (
          <Bell
            size={19}
            strokeWidth={1.8}
          />
        )}

        {muted && !busy && !loading && (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-500 ring-2 ring-amber-50 dark:ring-slate-900" />
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 flex w-64 items-start gap-2 rounded-xl border border-rose-200 bg-white p-3 text-xs leading-5 text-rose-600 shadow-lg dark:border-rose-500/20 dark:bg-slate-800 dark:text-rose-400"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
