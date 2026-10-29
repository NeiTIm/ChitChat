
import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Flag,
  LoaderCircle,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react'

import { moderationApi } from '../api/moderationApi'

export default function ReportButton({
  token,
  targetType,
  targetId,
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  const close = () => {
    if (busy) return
    setOpen(false)
    setReason('')
    setStatus('')
  }

  const send = async event => {
    event.preventDefault()

    if (!reason.trim() || !token || busy) return

    setBusy(true)
    setStatus('')

    try {
      await moderationApi.postReports(
        {
          targetType,
          targetId,
          reason: reason.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setOpen(false)
      setReason('')
      setSuccess(true)
      setStatus('Đã gửi báo cáo thành công.')
    } catch {
      setSuccess(false)
      setStatus('Không thể gửi báo cáo. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-flex min-w-0 items-center">
      {/* REPORT BUTTON */}
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setStatus('')
        }}
        aria-label="Báo cáo vi phạm"
        title="Báo cáo vi phạm"
        className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <Flag size={15} strokeWidth={1.8} />
        <span>Báo cáo</span>
      </button>

      {/* SUCCESS FEEDBACK */}
      {status && !open && (
        <span
          role={success ? 'status' : 'alert'}
          className={`ml-2 inline-flex items-center gap-1 text-[11px] ${
            success
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {success ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {status}
        </span>
      )}

      {/* REPORT MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
          onMouseDown={event => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-black/20 dark:border-slate-700 dark:bg-slate-900"
          >
            {/* HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                  <ShieldAlert size={23} strokeWidth={1.8} />
                </div>

                <div>
                  <h2
                    id="report-dialog-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    Báo cáo vi phạm
                  </h2>

                  <p className="mt-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    Hãy cho chúng tôi biết vấn đề bạn gặp phải.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Đóng báo cáo"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={19} />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={send} className="space-y-5 p-6">
              <div className="space-y-2">
                <label
                  htmlFor="report-reason"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Lý do báo cáo
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <textarea
                  id="report-reason"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  required
                  maxLength={1000}
                  rows={5}
                  autoFocus
                  disabled={busy}
                  placeholder="Mô tả nội dung vi phạm hoặc vấn đề bạn gặp phải..."
                  className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
                />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Vui lòng mô tả cụ thể vấn đề.
                  </p>

                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {reason.length}/1000
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                  Báo cáo sẽ được gửi để xem xét. Vui lòng cung cấp thông tin chính xác.
                </p>
              </div>

              {status && !success && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                >
                  <AlertCircle size={17} className="shrink-0" />
                  {status}
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={!reason.trim() || busy || !token}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}

                  {busy ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
