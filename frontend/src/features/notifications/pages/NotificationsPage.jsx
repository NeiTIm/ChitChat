
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import {
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Users,
  X,
} from 'lucide-react'

import { notificationsApi } from '../api/notificationsApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'
import { hubUrl } from '../../../shared/config/backendUrl'
// ======================================================
// HELPERS
// ======================================================

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNotificationInfo(type) {
  switch (type) {
    case 'MessageRequest':
      return {
        title: 'Tin nhắn chờ',
        description: 'Bạn có một yêu cầu tin nhắn mới.',
        icon: Inbox,
        color:
          'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      }

    case 'GroupMessage':
      return {
        title: 'Tin nhắn nhóm',
        description: 'Có tin nhắn mới trong nhóm của bạn.',
        icon: Users,
        color:
          'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
      }

    default:
      return {
        title: 'Tin nhắn mới',
        description: 'Bạn có một thông báo mới.',
        icon: MessageCircle,
        color:
          'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
      }
  }
}

function NotificationSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải thông báo"
      className="divide-y divide-slate-100 dark:divide-slate-800"
    >
      <span className="sr-only">Đang tải thông báo...</span>

      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start gap-4 p-5 sm:p-6">
          <Skeleton className="size-12 shrink-0 rounded-2xl" />

          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="size-8 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Bell size={34} strokeWidth={1.6} />
      </div>

      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
        Chưa có thông báo
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">
        Khi có tin nhắn, lời mời hoặc hoạt động mới, thông báo
        sẽ xuất hiện tại đây.
      </p>

      <Link
        to="/chat"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
      >
        <MessageCircle size={16} />
        Trở về trò chuyện
      </Link>
    </div>
  )
}

function NotificationItem({ item, busy, onRead }) {
  const info = getNotificationInfo(item.type)
  const Icon = info.icon
  const unread = !item.readAt

  return (
    <article
      className={`group relative flex items-start gap-3 p-4 transition-colors sm:gap-4 sm:p-5 ${
        unread
          ? 'bg-indigo-50/50 dark:bg-indigo-500/5'
          : 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/50'
      }`}
    >
      {unread && (
        <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-indigo-500" />
      )}

      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl sm:size-12 ${info.color}`}
      >
        <Icon size={21} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {info.title}
          </h3>

          {unread && (
            <span className="size-2 shrink-0 rounded-full bg-indigo-500" />
          )}
        </div>

        <p className="mt-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {info.description}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <Clock3 size={13} />
            <time dateTime={item.createdAt || undefined}>
              {formatDate(item.createdAt)}
            </time>
          </span>

          {!unread && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check size={13} />
              Đã đọc
            </span>
          )}
        </div>
      </div>

      {unread && (
        <button
          type="button"
          onClick={() => onRead(item.id)}
          disabled={busy}
          aria-label="Đánh dấu thông báo đã đọc"
          title="Đánh dấu đã đọc"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
        >
          {busy ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <CheckCheck size={18} />
          )}
        </button>
      )}
    </article>
  )
}

// ======================================================
// NOTIFICATIONS PAGE
// ======================================================

export default function NotificationsPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [count, setCount] = useState(0)

  const [filter, setFilter] = useState('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeAction, setActiveAction] = useState('')

  const [state, setState] = useState({
    loading: true,
    busy: false,
    error: '',
  })

  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const paginationBusyRef = useRef(false)

  const config = useCallback(
    access => ({
      headers: {
        Authorization: `Bearer ${access}`,
      },
    }),
    []
  )

  // ====================================================
  // LOAD NOTIFICATIONS
  // ====================================================

  const load = useCallback(
    async (access, before = null) => {
      const requestId = before
        ? requestIdRef.current
        : ++requestIdRef.current

      const [page, unread] = await Promise.all([
        notificationsApi.getNotifications({
          ...config(access),
          params: before ? { before } : {},
        }),
        notificationsApi.getNotificationsUnreadCount(
          config(access)
        ),
      ])

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return
      }

      const newItems = Array.isArray(page.data?.items)
        ? page.data.items
        : []

      setItems(previous => {
        if (!before) return newItems

        const existingIds = new Set(previous.map(item => item.id))

        return [
          ...previous,
          ...newItems.filter(item => !existingIds.has(item.id)),
        ]
      })

      setCursor(page.data?.nextCursor ?? null)
      setHasMore(Boolean(page.data?.hasMore))
      setCount(unread.data?.count ?? 0)

      setState(value => ({
        ...value,
        loading: false,
        error: '',
      }))
    },
    [config]
  )

  // ====================================================
  // INITIAL AUTH
  // ====================================================

  useEffect(() => {
    mountedRef.current = true
    let active = true

    restoreAccessToken()
      .then(access => {
        if (!active) return

        if (!access) {
          navigate('/login', { replace: true })
          return
        }

        setToken(access)

        return load(access).catch(() => {
          if (!active) return

          setState(value => ({
            ...value,
            loading: false,
            error: 'Không thể tải danh sách thông báo.',
          }))
        })
      })
      .catch(() => {
        if (!active) return

        setState(value => ({
          ...value,
          loading: false,
          error: 'Không thể xác thực phiên đăng nhập.',
        }))
      })

    return () => {
      active = false
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [navigate, load])

  // ====================================================
  // SIGNALR REALTIME
  // ====================================================

  useEffect(() => {
    if (!token) return

    let disposed = false

    const hub = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    const refreshRealtime = () => {
      if (disposed) return
      load(token).catch(() => {})
    }

    hub.on('NotificationCreated', refreshRealtime)
    hub.onreconnected(refreshRealtime)

    hub.start().catch(() => {})

    return () => {
      disposed = true
      hub.stop().catch(() => {})
    }
  }, [token, load])

  // ====================================================
  // ACTIONS
  // ====================================================

  const action = async (operation, actionId = '') => {
    if (state.busy || !token) return

    setActiveAction(actionId)

    setState(value => ({
      ...value,
      busy: true,
      error: '',
    }))

    try {
      await operation()
      await load(token)
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể cập nhật thông báo. Vui lòng thử lại.',
      }))
    } finally {
      if (mountedRef.current) {
        setActiveAction('')
        setState(value => ({
          ...value,
          busy: false,
        }))
      }
    }
  }

  const markRead = notificationId => {
    action(
      () =>
        notificationsApi.patchNotificationsByIdRead(
          notificationId,
          null,
          config(token)
        ),
      notificationId
    )
  }

  const markAllRead = () => {
    if (count === 0) return

    action(
      () =>
        notificationsApi.postNotificationsReadAll(
          null,
          config(token)
        ),
      'all'
    )
  }

  const loadMore = async () => {
    if (
      !token ||
      !cursor ||
      !hasMore ||
      loadingMore ||
      paginationBusyRef.current
    ) {
      return
    }

    paginationBusyRef.current = true
    setLoadingMore(true)

    try {
      await load(token, cursor)
    } catch {
      if (mountedRef.current) {
        setState(value => ({
          ...value,
          error: 'Không thể tải thêm thông báo.',
        }))
      }
    } finally {
      paginationBusyRef.current = false

      if (mountedRef.current) {
        setLoadingMore(false)
      }
    }
  }

  const refresh = async () => {
    if (!token || state.busy || state.loading) return

    setState(value => ({
      ...value,
      loading: true,
      error: '',
    }))

    try {
      await load(token)
    } catch {
      setState(value => ({
        ...value,
        loading: false,
        error: 'Không thể làm mới danh sách thông báo.',
      }))
    }
  }

  // ====================================================
  // FILTER
  // ====================================================

  const filteredItems = items.filter(item => {
    if (filter === 'unread') return !item.readAt
    if (filter === 'read') return Boolean(item.readAt)
    return true
  })

  const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'unread', label: 'Chưa đọc' },
    { id: 'read', label: 'Đã đọc' },
  ]

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/chat"
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <MessageCircle size={22} />
            </span>

            <span className="text-lg font-extrabold tracking-tight">
              ChitChat
            </span>
          </Link>

          <Link
            to="/chat"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Trở lại chat
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-7 px-4 pb-14 pt-8 sm:px-6">
        {/* PAGE HEADING */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="default" size="sm">
              <BellRing size={13} />
              Notifications
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Thông báo
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Cập nhật tin nhắn, lời mời và những hoạt động
              mới trên ChitChat.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={!token || state.loading || state.busy}
          >
            <RefreshCw
              size={16}
              className={state.loading ? 'animate-spin' : ''}
            />
            Làm mới
          </Button>
        </div>

        {/* NAVIGATION */}
        <nav
          aria-label="Liên kết nhanh"
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            to="/chat"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            <MessageSquare size={16} />
            Tin nhắn
          </Link>

          <Link
            to="/groups"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            <Users size={16} />
            Nhóm chat
          </Link>

          <Link
            to="/message-requests"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            <Inbox size={16} />
            Tin nhắn chờ
          </Link>
        </nav>

        {/* ERROR */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
          >
            <CircleAlert
              size={19}
              className="mt-0.5 shrink-0"
            />

            <p className="min-w-0 flex-1">{state.error}</p>

            <button
              type="button"
              onClick={() =>
                setState(value => ({
                  ...value,
                  error: '',
                }))
              }
              aria-label="Đóng thông báo lỗi"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* MAIN PANEL */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* PANEL HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Bell size={21} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hộp thông báo
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Theo dõi các cập nhật mới nhất
                </p>
              </div>
            </div>

            <Badge variant={count > 0 ? 'default' : 'secondary'} size="sm">
              {count} chưa đọc
            </Badge>
          </div>

          {/* FILTERS AND ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
            <div
              role="group"
              aria-label="Lọc thông báo"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
            >
              {filters.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    filter === item.id
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={markAllRead}
              disabled={state.busy || state.loading || count === 0}
              className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              {state.busy && activeAction === 'all' ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCheck size={17} />
              )}
              Đánh dấu đã đọc tất cả
            </button>
          </div>

          {/* LIST */}
          {state.loading ? (
            <NotificationSkeleton />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <CheckCheck size={29} strokeWidth={1.6} />
              </div>

              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Không có thông báo phù hợp
              </h3>

              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                Thử chọn bộ lọc khác để xem thông báo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  busy={state.busy && activeAction === item.id}
                  onRead={markRead}
                />
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {!state.loading && hasMore && (
            <div className="flex items-center justify-center border-t border-slate-100 p-5 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={state.busy || loadingMore}
                loading={loadingMore}
              >
                {!loadingMore && <ChevronDown size={17} />}
                {loadingMore ? 'Đang tải thêm...' : 'Xem thêm thông báo'}
              </Button>
            </div>
          )}

          {/* FOOTER */}
          {!state.loading && items.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-center dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Đang hiển thị {filteredItems.length} thông báo
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
