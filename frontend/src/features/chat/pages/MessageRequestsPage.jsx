
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'

import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'
import { chatApi } from '../api/chatApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import { hubUrl } from '../../../shared/config/backendUrl'
function formatTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RequestSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải tin nhắn chờ"
      className="space-y-3"
    >
      <span className="sr-only">Đang tải tin nhắn chờ...</span>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
        >
          <Skeleton className="size-12 shrink-0 rounded-full" />

          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Icon size={34} strokeWidth={1.6} />
      </div>

      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-xs leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function RequestItem({
  request,
  profile,
  selected,
  disabled,
  onSelect,
}) {
  const name = profile?.displayName || 'Người dùng'

  const unread =
    request.lastSequence > request.requestReadSequence

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`
          group flex w-full items-center gap-3
          rounded-2xl border p-3.5 text-left
          transition-all duration-200
          disabled:cursor-not-allowed disabled:opacity-60
          ${
            selected
              ? 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-500/30 dark:bg-indigo-500/10'
              : 'border-slate-100 bg-white hover:border-indigo-100 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/20 dark:hover:bg-slate-800'
          }
        `}
      >
        <Avatar
          name={name}
          src={profile?.avatarUrl}
          size="lg"
          className="size-12"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
              {name}
            </h3>

            {unread && (
              <span className="size-2 shrink-0 rounded-full bg-indigo-500" />
            )}
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <MessageCircle size={13} />

            {unread
              ? 'Có tin nhắn chưa đọc'
              : 'Đã xem trong hộp chờ'}
          </p>
        </div>

        <ChevronRight
          size={18}
          className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
            selected
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400'
          }`}
        />
      </button>
    </li>
  )
}

function RequestMessage({ message }) {
  const recalled = Boolean(message.recalled)
  const content = recalled
    ? 'Tin nhắn đã được thu hồi'
    : message.content || (message.attachments?.length
      ? 'Tin nhắn có tệp đính kèm'
      : 'Tin nhắn không có nội dung văn bản')

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:max-w-[80%]">
        <p
          className={`whitespace-pre-wrap break-words text-[13px] leading-6 ${
            recalled
              ? 'italic text-slate-400'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {content}
        </p>

        {message.createdAt && (
          <time
            dateTime={message.createdAt}
            className="mt-2 block text-right text-[10px] text-slate-400 dark:text-slate-500"
          >
            {formatTime(message.createdAt)}
          </time>
        )}
      </div>
    </div>
  )
}

export default function MessageRequestsPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])

  const [state, setState] = useState({
    loading: true,
    busy: false,
    error: '',
  })

  const [viewLoading, setViewLoading] = useState(false)
  const [activeAction, setActiveAction] = useState('')
  const [confirmAction, setConfirmAction] = useState('')

  const selectedRequestRef = useRef(null)
  const viewRequestId = useRef(0)

  const config = access => ({
    headers: {
      Authorization: `Bearer ${access}`,
    },
  })

  // ====================================================
  // LOAD REQUESTS
  // ====================================================

  const load = async access => {
    const { data } = await chatApi.getMessageRequests(
      config(access)
    )

    const list = Array.isArray(data) ? data : []

    setRequests(list)

    const ids = [
      ...new Set(
        list.map(item => item.senderUserId)
      ),
    ]

    const people = await Promise.all(
      ids.map(userId =>
        chatApi
          .getUsersById(userId, config(access))
          .then(response => [
            userId,
            response.data,
          ])
          .catch(() => [
            userId,
            null,
          ])
      )
    )

    setProfiles(Object.fromEntries(people))

    setState(value => ({
      ...value,
      loading: false,
    }))
  }

  // ====================================================
  // INITIAL AUTH
  // ====================================================

  useEffect(() => {
    let active = true

    restoreAccessToken()
      .then(access => {
        if (!active) return

        if (!access) {
          navigate('/login', { replace: true })
          return
        }

        setToken(access)
        return load(access)
      })
      .catch(() => {
        if (!active) return

        setState(value => ({
          ...value,
          loading: false,
          error: 'Không thể tải tin nhắn chờ.',
        }))
      })

    return () => {
      active = false
      viewRequestId.current += 1
    }
  }, [navigate])

  // ====================================================
  // SIGNALR
  // ====================================================

  useEffect(() => {
    if (!token) return

    const hub = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    const refreshRequests = errorMessage => {
      load(token).catch(() => {
        setState(value => ({
          ...value,
          error: errorMessage,
        }))
      })
    }

    hub.on('MessageCreated', () => {
      refreshRequests('Không thể đồng bộ tin nhắn chờ.')
    })

    hub.onreconnected(() => {
      refreshRequests('Không thể đồng bộ sau khi kết nối lại.')
    })

    hub.start().catch(() => {
      setState(value => ({
        ...value,
        error:
          'Realtime không khả dụng; hãy tải lại trang để cập nhật.',
      }))
    })

    return () => {
      hub.stop().catch(() => {})
    }
  }, [token])

  // ====================================================
  // VIEW REQUEST
  // ====================================================

  const view = async request => {
    const requestNumber = ++viewRequestId.current

    selectedRequestRef.current = request.id

    setSelected(request)
    setMessages([])
    setViewLoading(true)
    setConfirmAction('')

    setState(value => ({
      ...value,
      error: '',
    }))

    try {
      const { data } =
        await chatApi.getConversationsByIdMessages(
          request.conversationId,
          config(token)
        )

      if (requestNumber !== viewRequestId.current) return

      setMessages([...(data.items || [])].reverse())

      await chatApi.putMessageRequestsByIdReadCursor(
        request.id,
        {
          lastReadSequence: request.lastSequence,
        },
        config(token)
      )

      if (requestNumber !== viewRequestId.current) return

      await load(token)
    } catch {
      if (requestNumber !== viewRequestId.current) return

      selectedRequestRef.current = null
      setSelected(null)
      setMessages([])

      setState(value => ({
        ...value,
        error: 'Yêu cầu này không còn khả dụng.',
      }))
    } finally {
      if (requestNumber === viewRequestId.current) {
        setViewLoading(false)
      }
    }
  }

  // ====================================================
  // REQUEST ACTIONS
  // ====================================================

  const act = async action => {
    if (!selected || state.busy) return

    setState(value => ({
      ...value,
      busy: true,
      error: '',
    }))

    setActiveAction(action)
    setConfirmAction('')

    try {
      await chatApi.postMessageRequestsByIdById(
        selected.id,
        action,
        null,
        config(token)
      )

      const conversationId = selected.conversationId

      viewRequestId.current += 1
      selectedRequestRef.current = null

      setSelected(null)
      setMessages([])

      await load(token)

      if (action === 'accept') {
        navigate(`/chat/${conversationId}`)
      }
    } catch {
      setState(value => ({
        ...value,
        error:
          'Không thể xử lý yêu cầu. Hãy tải lại và thử lần nữa.',
      }))
    } finally {
      setActiveAction('')
      setState(value => ({
        ...value,
        busy: false,
      }))
    }
  }

  const closePreview = () => {
    viewRequestId.current += 1
    selectedRequestRef.current = null
    setSelected(null)
    setMessages([])
    setViewLoading(false)
    setConfirmAction('')
  }

  const refresh = async () => {
    if (!token || state.busy) return

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
        error: 'Không thể làm mới danh sách tin nhắn chờ.',
      }))
    }
  }

  const selectedProfile = selected
    ? profiles[selected.senderUserId]
    : null

  const selectedName =
    selectedProfile?.displayName || 'Người dùng'

  const unreadCount = requests.filter(
    item => item.lastSequence > item.requestReadSequence
  ).length

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Trở lại chat
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {/* PAGE HEADING */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="default" size="sm">
              <Inbox size={13} />
              Message Requests
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tin nhắn chờ
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Xem và quản lý tin nhắn từ những người chưa kết bạn.
              Chấp nhận tin nhắn không tự động kết bạn.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={state.loading || state.busy || !token}
          >
            <RefreshCw
              size={16}
              className={state.loading ? 'animate-spin' : ''}
            />
            Làm mới
          </Button>
        </div>

        {/* ERROR */}
        {state.error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
          >
            <CircleAlert size={19} className="mt-0.5 shrink-0" />

            <p className="min-w-0 flex-1">{state.error}</p>

            <button
              type="button"
              onClick={() =>
                setState(value => ({ ...value, error: '' }))
              }
              aria-label="Đóng thông báo lỗi"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid min-h-[520px] grid-cols-1 items-stretch gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* REQUEST LIST */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Danh sách yêu cầu
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Những cuộc trò chuyện đang chờ xử lý
                </p>
              </div>

              <Badge variant="secondary" size="sm">
                {requests.length}
              </Badge>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tất cả yêu cầu
              </span>

              {unreadCount > 0 && (
                <Badge variant="default" size="sm">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </div>

            <div className="max-h-[600px] min-h-[260px] flex-1 overflow-y-auto p-3">
              {state.loading && requests.length === 0 ? (
                <RequestSkeleton />
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Hộp chờ đang trống"
                  description="Khi có người chưa kết bạn gửi tin nhắn, yêu cầu sẽ xuất hiện tại đây."
                />
              ) : (
                <ul className="space-y-2">
                  {requests.map(request => (
                    <RequestItem
                      key={request.id}
                      request={request}
                      profile={profiles[request.senderUserId]}
                      selected={selected?.id === request.id}
                      disabled={state.busy}
                      onSelect={() => view(request)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* PREVIEW */}
          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  icon={MessageSquare}
                  title="Chọn một yêu cầu"
                  description="Chọn cuộc trò chuyện bên trái để xem nội dung trước khi quyết định chấp nhận hoặc từ chối."
                />
              </div>
            ) : (
              <>
                {/* PREVIEW HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={selectedName}
                      src={selectedProfile?.avatarUrl}
                      size="lg"
                      className="size-12"
                    />

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-slate-800 dark:text-white">
                        {selectedName}
                      </h2>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 size={13} />
                        Tin nhắn đang chờ
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closePreview}
                    aria-label="Đóng xem trước"
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X size={19} />
                  </button>
                </div>

                {/* PRIVACY NOTE */}
                <div className="border-b border-slate-100 bg-indigo-50/50 px-5 py-3 dark:border-slate-800 dark:bg-indigo-500/5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      size={17}
                      className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                    />

                    <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">
                      Bạn có thể xem nội dung trước khi chấp nhận.
                      Chấp nhận yêu cầu không tự động thêm người này vào danh sách bạn bè.
                    </p>
                  </div>
                </div>

                {/* MESSAGES */}
                <div className="max-h-[520px] min-h-[260px] flex-1 space-y-3 overflow-y-auto bg-[#f8faff] p-5 dark:bg-slate-950/40">
                  {viewLoading ? (
                    <div
                      role="status"
                      aria-label="Đang tải nội dung tin nhắn"
                      className="space-y-4"
                    >
                      <span className="sr-only">
                        Đang tải nội dung tin nhắn...
                      </span>

                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className={`h-14 rounded-2xl ${
                            index % 2 === 0
                              ? 'w-3/4'
                              : 'w-1/2'
                          }`}
                        />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState
                      icon={MessageCircle}
                      title="Chưa có tin nhắn"
                      description="Không có nội dung tin nhắn trong yêu cầu này."
                    />
                  ) : (
                    messages.map(message => (
                      <RequestMessage
                        key={message.id}
                        message={message}
                      />
                    ))
                  )}
                </div>

                {/* ACTION FOOTER */}
                <div className="shrink-0 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                  {confirmAction ? (
                    <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                      <div className="flex items-start gap-2.5">
                        <CircleAlert
                          size={19}
                          className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
                        />

                        <p className="text-xs leading-6 text-rose-700 dark:text-rose-300">
                          {confirmAction === 'block'
                            ? 'Bạn có chắc muốn chặn người dùng này?'
                            : 'Bạn có chắc muốn từ chối yêu cầu này?'}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={state.busy}
                          onClick={() => setConfirmAction('')}
                        >
                          Hủy
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          loading={state.busy}
                          disabled={state.busy}
                          onClick={() => act(confirmAction)}
                        >
                          Xác nhận
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={state.busy || viewLoading}
                        onClick={() => setConfirmAction('block')}
                        className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Ban size={16} />
                        Chặn
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={state.busy || viewLoading}
                        onClick={() => setConfirmAction('reject')}
                      >
                        <X size={16} />
                        Từ chối
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={state.busy || viewLoading}
                        loading={state.busy && activeAction === 'accept'}
                        onClick={() => act('accept')}
                      >
                        {!state.busy && <Check size={16} />}
                        Chấp nhận
                        {!state.busy && <ArrowRight size={15} />}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
