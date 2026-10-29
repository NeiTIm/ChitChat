
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_DURATION = 4500
const MAX_TOASTS = 4

const toastStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    background: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    title: 'Thành công',
    progress: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-rose-500',
    background: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    title: 'Có lỗi xảy ra',
    progress: 'bg-rose-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-indigo-500',
    background: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    title: 'Thông báo',
    progress: 'bg-indigo-500',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-amber-500',
    background: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    title: 'Lưu ý',
    progress: 'bg-amber-500',
  },
}

// ======================================================
// TOAST ITEM
// ======================================================

function ToastItem({ item, onDismiss }) {
  const type = toastStyles[item.type]
    ? item.type
    : 'info'

  const style = toastStyles[type]
  const Icon = style.icon

  const [remaining, setRemaining] = useState(
    item.duration
  )
  const [paused, setPaused] = useState(false)

  const remainingRef = useRef(item.duration)
  const lastStartedRef = useRef(Date.now())

  useEffect(() => {
    if (paused) return

    lastStartedRef.current = Date.now()

    const timer = window.setTimeout(() => {
      onDismiss(item.id)
    }, remainingRef.current)

    return () => {
      window.clearTimeout(timer)

      const elapsed = Date.now() - lastStartedRef.current

      remainingRef.current = Math.max(
        0,
        remainingRef.current - elapsed
      )

      setRemaining(remainingRef.current)
    }
  }, [paused, item.id, onDismiss])

  const handlePause = () => {
    if (paused) return
    setPaused(true)
  }

  const handleResume = () => {
    if (!paused) return
    setPaused(false)
  }

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocusCapture={handlePause}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          handleResume()
        }
      }}
      className={`
        pointer-events-auto relative
        overflow-hidden rounded-2xl
        border bg-white
        shadow-xl shadow-slate-900/10
        transition-all duration-200
        dark:bg-slate-900
        dark:shadow-black/20
        ${style.border}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* ICON */}
        <div
          className={`
            flex size-10 shrink-0
            items-center justify-center
            rounded-xl
            ${style.background}
          `}
        >
          <Icon
            size={21}
            strokeWidth={1.9}
            className={style.iconClass}
          />
        </div>

        {/* CONTENT */}
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {item.title || style.title}
          </p>

          <p className="mt-1 break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
            {item.message}
          </p>
        </div>

        {/* CLOSE */}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Đóng thông báo"
          title="Đóng"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={17} />
        </button>
      </div>

      {/* PROGRESS */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full ${style.progress} transition-[width] duration-200`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, (remaining / item.duration) * 100)
            )}%`,
          }}
        />
      </div>
    </div>
  )
}

// ======================================================
// TOAST PROVIDER
// ======================================================

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback(id => {
    setItems(previous =>
      previous.filter(item => item.id !== id)
    )
  }, [])

  const toast = useCallback((message, type = 'success') => {
    if (!message) return null

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const normalizedType = toastStyles[type]
      ? type
      : 'info'

    const item = {
      id,
      message: String(message),
      type: normalizedType,
      duration: TOAST_DURATION,
    }

    setItems(previous => [
      ...previous.slice(-(MAX_TOASTS - 1)),
      item,
    ])

    return id
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* TOAST CONTAINER */}
      <div
        aria-label="Thông báo hệ thống"
        className="pointer-events-none fixed inset-x-4 top-4 z-[200] flex flex-col gap-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[min(400px,calc(100vw-40px))]"
      >
        {items.map(item => (
          <ToastItem
            key={item.id}
            item={item}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ======================================================
// TOAST HOOK
// ======================================================

export function useToast() {
  const context = useContext(ToastContext)

  return context || (() => null)
}
