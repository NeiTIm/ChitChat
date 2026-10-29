
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCheck,
  CornerUpLeft,
  Forward,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import MessageAttachments from './MessageAttachments'
import ReportButton from '../../moderation/components/ReportButton'

function formatTime(date) {
  if (!date) return ''

  const value = new Date(date)

  if (Number.isNaN(value.getTime())) return ''

  return value.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`
        flex size-8 shrink-0 items-center justify-center
        rounded-lg transition-colors duration-150
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-500
        disabled:pointer-events-none disabled:opacity-40
        ${
          destructive
            ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400'
            : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400'
        }
      `}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  )
}

export default function MessageBubble({
  message,
  mine,
  onAction,
  token,
  canPin = false,
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(message.content ?? '')
  const [busy, setBusy] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    if (!editing) {
      setText(message.content ?? '')
    }
  }, [message.content, editing])

  const recalled = Boolean(message.recalled)
  const hasContent = Boolean(message.content?.trim())
  const hasAttachments = Boolean(message.attachments?.length)

  const act = async (kind, value) => {
    if (busy) return

    setBusy(true)

    try {
      const okay = await onAction(kind, message, value)

      if (okay && kind === 'edit') {
        setEditing(false)
      }

      if (okay) {
        setShowActions(false)
      }
    } finally {
      setBusy(false)
    }
  }

  const startEditing = () => {
    setText(message.content ?? '')
    setEditing(true)
    setShowActions(false)
  }

  const cancelEditing = () => {
    setText(message.content ?? '')
    setEditing(false)
  }

  const recallMessage = () => {
    if (window.confirm('Thu hồi tin nhắn này?')) {
      void act('recall')
    }
  }

  const deleteMessage = () => {
    if (window.confirm('Ẩn tin nhắn này chỉ với bạn?')) {
      void act('delete')
    }
  }

  return (
    <div
      className={`
        group flex w-full min-w-0 flex-col py-1
        ${mine ? 'items-end' : 'items-start'}
      `}
    >
      {/* MESSAGE ROW */}
      <div
        className={`
          flex max-w-full items-end gap-2
          ${mine ? 'flex-row-reverse' : 'flex-row'}
        `}
      >
        {/* MESSAGE CONTAINER */}
        <div
          className={`
            relative min-w-0 max-w-[min(82vw,440px)]
            sm:max-w-[min(72vw,500px)]
            ${editing ? 'w-[min(82vw,440px)]' : ''}
          `}
        >
          {/* MESSAGE BUBBLE */}
          <div
            className={`
              relative min-w-0 overflow-hidden
              px-4 py-3
              text-[13px] leading-[1.65]
              shadow-sm
              ${
                mine
                  ? 'rounded-2xl rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'rounded-2xl rounded-bl-md border border-slate-200/80 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
              }
              ${
                recalled
                  ? 'border border-dashed border-slate-300 bg-slate-50 text-slate-400 shadow-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                  : ''
              }
            `}
          >
            {/* FORWARDED LABEL */}
            {message.isForwarded && !recalled && (
              <div
                className={`
                  mb-2 flex items-center gap-1.5
                  text-[11px] font-medium
                  ${
                    mine
                      ? 'text-indigo-100'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                `}
              >
                <Forward size={13} />
                Đã chuyển tiếp
              </div>
            )}

            {/* REPLY REFERENCE */}
            {message.replyToMessageId && !recalled && (
              <div
                className={`
                  mb-2 flex items-start gap-2
                  rounded-lg border-l-[3px] px-3 py-2
                  ${
                    mine
                      ? 'border-indigo-200 bg-white/15 text-indigo-100'
                      : 'border-indigo-400 bg-slate-50 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300'
                  }
                `}
              >
                <CornerUpLeft
                  size={14}
                  className="mt-0.5 shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold">
                    Trả lời tin nhắn
                  </p>

                  <p className="mt-0.5 truncate text-[10px] opacity-80">
                    {message.replyToMessageId.slice(0, 8)}
                  </p>
                </div>
              </div>
            )}

            {/* EDIT MODE */}
            {editing ? (
              <form
                onSubmit={event => {
                  event.preventDefault()
                  void act('edit', text)
                }}
                className="space-y-3"
              >
                <textarea
                  value={text}
                  maxLength={10000}
                  autoFocus
                  rows={3}
                  onChange={event => setText(event.target.value)}
                  aria-label="Chỉnh sửa tin nhắn"
                  className="
                    min-h-24 w-full resize-y
                    rounded-xl border border-white/20
                    bg-white/95 px-3 py-2.5
                    text-sm text-slate-900
                    outline-none transition
                    placeholder:text-slate-400
                    focus:border-indigo-300
                    focus:ring-2 focus:ring-indigo-300/30
                    dark:border-slate-600
                    dark:bg-slate-900 dark:text-slate-100
                  "
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={busy}
                    className="
                      inline-flex h-8 items-center gap-1.5
                      rounded-lg border border-white/20
                      bg-white/15 px-3 text-xs font-semibold
                      text-white transition hover:bg-white/25
                      disabled:opacity-50
                    "
                  >
                    <X size={14} />
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={busy || !text.trim()}
                    className="
                      inline-flex h-8 items-center gap-1.5
                      rounded-lg bg-white px-3
                      text-xs font-semibold text-indigo-700
                      transition hover:bg-indigo-50
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {busy ? (
                      <LoaderCircle
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Check size={14} />
                    )}

                    Lưu
                  </button>
                </div>
              </form>
            ) : recalled ? (
              <div className="flex items-center gap-2 text-xs italic">
                <RotateCcw size={15} className="shrink-0" />
                <span>Tin nhắn đã được thu hồi</span>
              </div>
            ) : (
              <>
                {/* MESSAGE CONTENT */}
                {hasContent && (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )}

                {/* ATTACHMENTS */}
                {hasAttachments && (
                  <div className={hasContent ? 'mt-2.5' : ''}>
                    <MessageAttachments
                      attachments={message.attachments}
                      token={token}
                    />
                  </div>
                )}
              </>
            )}

            {/* MESSAGE METADATA */}
            {!editing && (
              <div
                className={`
                  mt-2 flex items-center justify-end gap-1.5
                  text-[10px] leading-none
                  ${
                    mine && !recalled
                      ? 'text-indigo-100/90'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                `}
              >
                {message.editedAt && !recalled && (
                  <span>Đã sửa ·</span>
                )}

                <time dateTime={message.createdAt || undefined}>
                  {formatTime(message.createdAt)}
                </time>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTION TRIGGER */}
        {!editing && (
          <button
            type="button"
            onClick={() => setShowActions(previous => !previous)}
            disabled={busy}
            aria-label="Tùy chọn tin nhắn"
            aria-expanded={showActions}
            className={`
              flex size-8 shrink-0 items-center justify-center
              rounded-full text-slate-400
              transition-all duration-150
              hover:bg-slate-100 hover:text-indigo-600
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-indigo-500
              disabled:opacity-50
              dark:hover:bg-slate-800
              dark:hover:text-indigo-400
              ${
                showActions
                  ? 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                  : 'opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
              }
            `}
          >
            {busy ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <MoreHorizontal size={20} />
            )}
          </button>
        )}
      </div>

      {/* MESSAGE ACTIONS */}
      {!editing && showActions && (
        <div
          role="toolbar"
          aria-label="Hành động với tin nhắn"
          className={`
            mt-2 flex max-w-full flex-wrap items-center gap-0.5
            rounded-xl border border-slate-200
            bg-white p-1.5
            shadow-lg shadow-slate-900/5
            dark:border-slate-700 dark:bg-slate-800
            dark:shadow-black/20
          `}
        >
          <ActionButton
            icon={CornerUpLeft}
            label="Trả lời"
            disabled={busy}
            onClick={() => act('reply')}
          />

          {!recalled && (
            <>
              <ActionButton
                icon={Forward}
                label="Chuyển tiếp"
                disabled={busy}
                onClick={() => act('forward')}
              />

              <button
                type="button"
                onClick={() => act('reaction', '👍')}
                disabled={busy}
                title="Thả cảm xúc thích"
                aria-label="Thả cảm xúc thích"
                className="flex size-8 items-center justify-center rounded-lg text-base transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                👍
              </button>
            </>
          )}

          {canPin && !recalled && (
            <ActionButton
              icon={Pin}
              label="Ghim tin nhắn"
              disabled={busy}
              onClick={() => act('pin')}
            />
          )}

          {mine && !recalled && (
            <>
              <ActionButton
                icon={Pencil}
                label="Chỉnh sửa tin nhắn"
                disabled={busy}
                onClick={startEditing}
              />

              <ActionButton
                icon={RotateCcw}
                label="Thu hồi tin nhắn"
                disabled={busy}
                destructive
                onClick={recallMessage}
              />
            </>
          )}

          {!recalled && (
            <ReportButton
              token={token}
              targetType="Message"
              targetId={message.id}
            />
          )}

          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <ActionButton
            icon={Trash2}
            label="Ẩn tin nhắn với tôi"
            disabled={busy}
            destructive
            onClick={deleteMessage}
          />
        </div>
      )}
    </div>
  )
}
