
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  CircleAlert,
  CornerUpLeft,
  Inbox,
  Info,
  LoaderCircle,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings2,
  Smile,
  Users,
  X,
} from 'lucide-react'

import ThemeToggle from '../../../shared/components/ThemeToggle'
import { Avatar } from '../../../components/ui/avatar'
import { Button } from '../../../components/ui/button'
import {
  ChatListSkeleton,
  MessageSkeleton,
} from '../../../components/ui/skeleton'

import { chatApi } from '../api/chatApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import MessageBubble from '../components/MessageBubble'
import ForwardPicker from '../components/ForwardPicker'
import MessageSearch from '../components/MessageSearch'
import FileComposer from '../components/FileComposer'
import ConversationMuteButton from '../../notifications/components/ConversationMuteButton'

// ======================================================
// SHARED UI
// ======================================================

function EmptyState({
  icon: Icon = MessageCircle,
  title,
  description,
  action,
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Icon size={36} strokeWidth={1.5} />
      </div>

      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function SidebarLink({ to, icon: Icon, children, active = false }) {
  return (
    <Link
      to={to}
      className={`
        flex h-11 items-center gap-3 rounded-xl px-3
        text-[13px] font-semibold transition-colors
        ${
          active
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }
      `}
    >
      <Icon size={19} strokeWidth={1.8} />
      <span>{children}</span>
    </Link>
  )
}

function ConversationItem({
  item,
  profile,
  active,
  onSelect,
}) {
  const name = profile?.displayName || 'Người dùng'

  return (
    <Link
      to={`/chat/${item.id}`}
      onClick={onSelect}
      className={`
        group flex min-w-0 items-center gap-3
        rounded-2xl px-3 py-3
        transition-all duration-200
        ${
          active
            ? 'bg-indigo-50 dark:bg-indigo-500/15'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`
              truncate text-[13px] font-bold
              ${
                active
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-800 dark:text-slate-100'
              }
            `}
          >
            {name}
          </h3>
        </div>

        <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
          Cuộc trò chuyện riêng
        </p>
      </div>

      {active && (
        <span className="size-2 shrink-0 rounded-full bg-indigo-500" />
      )}
    </Link>
  )
}

// ======================================================
// CHAT PAGE
// ======================================================

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [access, setAccess] = useState(null)
  const [me, setMe] = useState(null)

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [people, setPeople] = useState({})

  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState([])

  const [replyTo, setReplyTo] = useState(null)
  const [forwardSource, setForwardSource] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const [typing, setTyping] = useState(false)
  const [presence, setPresence] = useState(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [composerFocused, setComposerFocused] = useState(false)

  const [status, setStatus] = useState({
    loading: true,
    sending: false,
    error: '',
    connection: 'Đang kết nối…',
  })

  const connection = useRef(null)
  const pendingSend = useRef(null)
  const typingTimer = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileComposerRef = useRef(null)

  const currentId = id || conversations[0]?.id

  const selected = conversations.find(
    item => item.id === currentId
  )

  const otherId = selected?.otherUserId
  const selectedProfile = people[otherId]
  const selectedName = selectedProfile?.displayName || 'Người dùng'

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${access}`,
    }),
    [access]
  )

  // ====================================================
  // LOAD MESSAGES
  // ====================================================

  const loadMessages = useCallback(
    async conversationId => {
      if (!access || !conversationId) return

      try {
        const { data } =
          await chatApi.getConversationsByIdMessages(
            conversationId,
            {
              headers: headers(),
            }
          )

        setMessages([...data.items].reverse())

        if (me?.id) {
          const received = data.items
            .filter(item => item.senderUserId !== me.id)
            .map(item => item.id)

          if (received.length) {
            await chatApi
              .postConversationsByIdDeliveryAcks(
                conversationId,
                {
                  messageIds: received,
                },
                {
                  headers: headers(),
                }
              )
              .catch(() => {})
          }

          if (
            document.visibilityState === 'visible' &&
            data.items.length
          ) {
            await new Promise(resolve =>
              requestAnimationFrame(resolve)
            )

            if (document.visibilityState === 'visible') {
              await chatApi
                .putConversationsByIdReadCursor(
                  conversationId,
                  {
                    lastReadSequence: data.items[0].sequence,
                  },
                  {
                    headers: headers(),
                  }
                )
                .catch(() => {})
            }
          }
        }

        setStatus(value => ({
          ...value,
          loading: false,
          error: '',
        }))
      } catch {
        setMessages([])

        setStatus(value => ({
          ...value,
          loading: false,
          error:
            'Không thể tải cuộc trò chuyện hoặc bạn đã mất quyền truy cập.',
        }))
      }
    },
    [access, headers, me?.id]
  )

  // ====================================================
  // INITIALIZE AUTH AND CONVERSATIONS
  // ====================================================

  useEffect(() => {
    let active = true

    restoreAccessToken()
      .then(async token => {
        if (!token) {
          navigate('/login')
          return
        }

        if (!active) return

        setAccess(token)

        const [self, list] = await Promise.all([
          chatApi.getUsersMe({
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          chatApi.getConversations({
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        if (!active) return

        const direct =
          id && !list.data.some(item => item.id === id)
            ? await chatApi
                .getConversationsById(id, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                .then(response => response.data)
                .catch(() => null)
            : null

        const visible = direct
          ? [direct, ...list.data]
          : list.data

        setMe(self.data)
        setConversations(visible)

        const ids = [
          ...new Set(
            visible.map(item => item.otherUserId)
          ),
        ]

        const profiles = await Promise.all(
          ids.map(userId =>
            chatApi
              .getUsersById(userId, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              .then(({ data }) => [userId, data])
              .catch(() => [userId, null])
          )
        )

        if (active) {
          setPeople(Object.fromEntries(profiles))
        }

        if (!id && list.data.length) {
          navigate(`/chat/${list.data[0].id}`, {
            replace: true,
          })
        }

        if (!id && list.data.length === 0) {
          setStatus(value => ({
            ...value,
            loading: false,
          }))
        }
      })
      .catch(() => {
        if (!active) return

        setStatus(value => ({
          ...value,
          loading: false,
          error: 'Không thể tải danh sách chat.',
        }))
      })

    return () => {
      active = false
    }
  }, [navigate, id])

  // ====================================================
  // LOAD SELECTED CONVERSATION
  // ====================================================

  useEffect(() => {
    if (currentId) {
      setStatus(value => ({
        ...value,
        loading: true,
      }))

      loadMessages(currentId)
    }
  }, [currentId, loadMessages])

  // ====================================================
  // PRESENCE
  // ====================================================

  useEffect(() => {
    if (!access || !otherId) return

    chatApi
      .getUsersByIdPresence(otherId, {
        headers: headers(),
      })
      .then(({ data }) => setPresence(data))
      .catch(() => setPresence(null))
  }, [access, otherId, headers])

  // ====================================================
  // SIGNALR REALTIME
  // ====================================================

  useEffect(() => {
    if (!access || !currentId) return

    let disposed = false

    const hub = new HubConnectionBuilder()
      .withUrl('/hubs/chat', {
        accessTokenFactory: () => access,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.current = hub

    hub.on('MessageCreated', event => {
      if (event.conversationId === currentId) {
        loadMessages(currentId)
      }
    })

    for (const eventName of [
      'MessageEdited',
      'MessageRecalled',
      'MessageReactionChanged',
      'MessageDeletedForMe',
    ]) {
      hub.on(eventName, event => {
        if (
          !event.conversationId ||
          event.conversationId === currentId
        ) {
          loadMessages(currentId)
        }
      })
    }

    hub.on('TypingChanged', event => {
      if (
        event.conversationId !== currentId ||
        event.actorId === me?.id
      ) {
        return
      }

      setTyping(event.isTyping)

      clearTimeout(typingTimer.current)

      if (event.isTyping) {
        typingTimer.current = setTimeout(
          () => setTyping(false),
          5000
        )
      }
    })

    hub.on('PresenceChanged', event => {
      if (event.userId === otherId) {
        setPresence(event)
      }
    })

    hub.onreconnecting(() => {
      setStatus(value => ({
        ...value,
        connection: 'Đang kết nối lại…',
      }))
    })

    hub.onreconnected(async () => {
      if (disposed) return

      await hub
        .invoke('JoinConversation', currentId)
        .catch(() => {})

      await loadMessages(currentId)

      setStatus(value => ({
        ...value,
        connection: 'Đã kết nối',
      }))
    })

    hub
      .start()
      .then(() => hub.invoke('JoinConversation', currentId))
      .then(() => {
        if (!disposed) {
          setStatus(value => ({
            ...value,
            connection: 'Đã kết nối',
          }))
        }
      })
      .catch(() => {
        if (!disposed) {
          setStatus(value => ({
            ...value,
            connection: 'Realtime không khả dụng',
          }))
        }
      })

    return () => {
      disposed = true
      connection.current = null

      clearTimeout(typingTimer.current)

      hub.stop().catch(() => {})
    }
  }, [access, currentId, loadMessages, me?.id, otherId])

  // ====================================================
  // SCROLL TO LATEST MESSAGE
  // ====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, currentId])

  // ====================================================
  // SEND MESSAGE
  // ====================================================

  const send = async event => {
    event.preventDefault()

    if (
      (!draft.trim() && files.length === 0) ||
      !currentId ||
      status.sending
    ) {
      return
    }

    const attempt = pendingSend.current ?? {
      clientMessageId: crypto.randomUUID(),
      conversationId: currentId,
      content: draft.trim(),
      replyToMessageId: replyTo?.id ?? null,
      files: [...files],
      attachmentIds: [],
    }

    if (attempt.conversationId !== currentId) return

    pendingSend.current = attempt

    setStatus(value => ({
      ...value,
      sending: true,
      error: '',
    }))

    try {
      for (const file of attempt.files.slice(
        attempt.attachmentIds.length
      )) {
        const form = new FormData()

        form.append('file', file)
        form.append('purpose', 'Message')

        const upload = await chatApi.postFiles(form, {
          headers: headers(),
        })

        attempt.attachmentIds.push(upload.data.id)
      }

      await chatApi.postConversationsByIdMessages(
        currentId,
        {
          clientMessageId: attempt.clientMessageId,
          content: attempt.content || null,
          replyToMessageId: attempt.replyToMessageId,
          attachmentIds: attempt.attachmentIds,
        },
        {
          headers: headers(),
        }
      )

      connection.current
        ?.invoke('StopTyping', currentId)
        .catch(() => {})

      pendingSend.current = null

      setDraft('')
      setFiles([])
      setReplyTo(null)

      await loadMessages(currentId)
    } catch {
      setStatus(value => ({
        ...value,
        error: 'Không gửi được tin nhắn. Hãy thử lại.',
      }))
    } finally {
      setStatus(value => ({
        ...value,
        sending: false,
      }))
    }
  }

  // ====================================================
  // RETRY FAILED SEND WHEN BACK ONLINE
  // ====================================================

  useEffect(() => {
    const retry = () => {
      if (
        pendingSend.current &&
        !status.sending
      ) {
        send({
          preventDefault() {},
        })
      }
    }

    window.addEventListener('online', retry)

    return () => {
      window.removeEventListener('online', retry)
    }
  })

  // ====================================================
  // MESSAGE ACTIONS
  // ====================================================

  const messageAction = async (
    kind,
    message,
    value
  ) => {
    if (kind === 'reply') {
      setReplyTo(message)
      textareaRef.current?.focus()
      return true
    }

    if (kind === 'forward') {
      setForwardSource(message)
      return true
    }

    try {
      if (kind === 'edit') {
        await chatApi.patchMessagesById(
          message.id,
          {
            content: value,
          },
          {
            headers: headers(),
          }
        )
      } else if (kind === 'recall') {
        await chatApi.postMessagesByIdRecall(
          message.id,
          null,
          {
            headers: headers(),
          }
        )
      } else if (kind === 'reaction') {
        await chatApi.putMessagesByIdReaction(
          message.id,
          {
            emoji: value,
          },
          {
            headers: headers(),
          }
        )
      } else if (kind === 'delete') {
        await chatApi.deleteMessagesByIdForMe(
          message.id,
          {
            headers: headers(),
          }
        )
      }

      await loadMessages(currentId)

      return true
    } catch {
      setStatus(value => ({
        ...value,
        error:
          'Không thể thay đổi tin nhắn hoặc bạn đã mất quyền truy cập.',
      }))

      return false
    }
  }

  // ====================================================
  // TYPING
  // ====================================================

  const handleDraftChange = event => {
    const value = event.target.value

    pendingSend.current = null
    setDraft(value)

    connection.current
      ?.invoke(
        value ? 'StartTyping' : 'StopTyping',
        currentId
      )
      .catch(() => {})
  }

  const handleComposerKeyDown = event => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()

      if (
        !status.sending &&
        (draft.trim() || files.length > 0)
      ) {
        send(event)
      }
    }
  }

  // ====================================================
  // FILTER CONVERSATIONS
  // ====================================================

  const filteredConversations = conversations.filter(
    item => {
      const name =
        people[item.otherUserId]?.displayName ||
        'Người dùng'

      return name
        .toLocaleLowerCase('vi')
        .includes(
          sidebarSearch.trim().toLocaleLowerCase('vi')
        )
    }
  )

  const isOnline = presence?.online === true

  const hasSelectedChat = Boolean(selected)

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="flex h-dvh min-h-0 min-w-0 overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* MOBILE SIDEBAR BACKDROP */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng danh sách trò chuyện"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* ==================================================
          SIDEBAR
      ================================================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[min(340px,88vw)] shrink-0 flex-col
          border-r border-slate-200
          bg-white shadow-2xl
          transition-transform duration-300
          dark:border-slate-800 dark:bg-slate-900
          md:static md:w-[320px] md:translate-x-0 md:shadow-none
          xl:w-[340px]
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* SIDEBAR HEADER */}
        <div className="shrink-0 border-b border-slate-100 px-5 pb-5 pt-5 dark:border-slate-800">
          <div className="mb-7 flex items-center justify-between gap-3">
            <Link
              to="/account"
              className="flex items-center gap-3"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <MessageCircle size={23} />
              </div>

              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                ChitChat
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle compact />

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng menu"
                className="flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* SIDEBAR TITLE */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Tin nhắn
              </h1>

              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Trò chuyện cùng bạn bè
              </p>
            </div>

            <Link
              to="/friends"
              title="Bạn bè"
              className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
            >
              <Users size={19} />
            </Link>
          </div>

          {/* SEARCH CONVERSATIONS */}
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={sidebarSearch}
              onChange={event =>
                setSidebarSearch(event.target.value)
              }
              placeholder="Tìm cuộc trò chuyện..."
              aria-label="Tìm cuộc trò chuyện"
              className="h-11 w-full rounded-xl border border-transparent bg-slate-100 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
            />
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="shrink-0 space-y-1 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <SidebarLink to="/chat" icon={MessageSquare} active>
            Đoạn chat
          </SidebarLink>

          <SidebarLink to="/friends" icon={Users}>
            Bạn bè
          </SidebarLink>

          <SidebarLink to="/groups" icon={MessageCircle}>
            Nhóm chat
          </SidebarLink>

          <SidebarLink to="/message-requests" icon={Inbox}>
            Tin nhắn chờ
          </SidebarLink>

          <SidebarLink to="/notifications" icon={Bell}>
            Thông báo
          </SidebarLink>
        </nav>

        {/* CONVERSATION LIST */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              Gần đây
            </h2>

            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {conversations.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-5">
            {status.loading &&
            conversations.length === 0 ? (
              <ChatListSkeleton count={6} />
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Chưa có cuộc trò chuyện"
                description="Hãy kết bạn để bắt đầu những cuộc trò chuyện đầu tiên."
                action={
                  <Link
                    to="/friends"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Tìm bạn bè
                  </Link>
                }
              />
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Không tìm thấy"
                description="Thử tìm kiếm bằng tên người dùng khác."
              />
            ) : (
              filteredConversations.map(item => (
                <ConversationItem
                  key={item.id}
                  item={item}
                  profile={people[item.otherUserId]}
                  active={item.id === currentId}
                  onSelect={() =>
                    setSidebarOpen(false)
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <Link
            to="/account"
            className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar
              name={me?.displayName || me?.username || 'Tôi'}
              src={me?.avatarUrl}
              size="md"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {me?.displayName || me?.username || 'Tài khoản của tôi'}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Quản lý tài khoản
              </p>
            </div>

            <Settings2
              size={18}
              className="text-slate-400"
            />
          </Link>
        </div>
      </aside>

      {/* ==================================================
          MAIN CHAT PANEL
      ================================================== */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7f9fc] dark:bg-slate-950">
        {!hasSelectedChat ? (
          <>
            {/* MOBILE TOPBAR */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Mở danh sách trò chuyện"
                className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Menu size={22} />
              </button>

              <span className="font-bold">
                ChitChat
              </span>

              <ThemeToggle compact />
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="Chào mừng đến với ChitChat"
                description="Chọn một cuộc trò chuyện trong danh sách để bắt đầu nhắn tin và kết nối với bạn bè."
                action={
                  <Button
                    type="button"
                    onClick={() =>
                      setSidebarOpen(true)
                    }
                    className="md:hidden"
                  >
                    <MessageSquare size={17} />
                    Xem đoạn chat
                  </Button>
                }
              />
            </div>
          </>
        ) : (
          <>
            {/* CHAT HEADER */}
            <header className="z-20 flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSidebarOpen(true)
                  }
                  aria-label="Mở danh sách trò chuyện"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft size={21} />
                </button>

                <Avatar
                  name={selectedName}
                  src={selectedProfile?.avatarUrl}
                  online={isOnline}
                  size="lg"
                  className="size-11 sm:size-12"
                />

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {selectedName}
                  </h2>

                  <div className="mt-1 flex items-center gap-1.5">
                    {typing ? (
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Đang nhập...
                      </span>
                    ) : isOnline ? (
                      <>
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          Đang hoạt động
                        </span>
                      </>
                    ) : (
                      <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {status.connection}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* HEADER ACTIONS */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <ConversationMuteButton
                  token={access}
                  conversationId={currentId}
                />

                <button
                  type="button"
                  onClick={() =>
                    setSearchOpen(previous => !previous)
                  }
                  title="Tìm kiếm tin nhắn"
                  aria-label="Tìm kiếm tin nhắn"
                  aria-pressed={searchOpen}
                  className={`
                    flex size-10 items-center justify-center
                    rounded-xl transition-colors
                    ${
                      searchOpen
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400'
                    }
                  `}
                >
                  <Search size={20} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDetailsOpen(previous => !previous)
                  }
                  aria-label="Thông tin cuộc trò chuyện"
                  aria-pressed={detailsOpen}
                  title="Thông tin cuộc trò chuyện"
                  className={`
                    flex size-10 items-center justify-center
                    rounded-xl transition-colors
                    ${
                      detailsOpen
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400'
                    }
                  `}
                >
                  <Info size={20} />
                </button>
              </div>
            </header>

            {/* CHAT BODY */}
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {/* SEARCH */}
                {searchOpen && (
                  <div className="absolute inset-x-3 top-3 z-30 max-h-[70%] overflow-y-auto rounded-2xl shadow-xl sm:inset-x-auto sm:right-5 sm:w-[380px]">
                    <MessageSearch
                      token={access}
                      conversationId={currentId}
                    />
                  </div>
                )}

                {/* FORWARD */}
                {forwardSource && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]">
                    <div className="w-full max-w-md">
                      <ForwardPicker
                        token={access}
                        source={forwardSource}
                        onClose={() =>
                          setForwardSource(null)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* MESSAGES */}
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6 sm:py-6"
                  aria-live="polite"
                >
                  {status.loading ? (
                    <MessageSkeleton count={6} />
                  ) : (
                    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
                      {/* CONVERSATION INTRO */}
                      <div className="mb-8 flex flex-col items-center pt-6 text-center">
                        <Avatar
                          name={selectedName}
                          src={selectedProfile?.avatarUrl}
                          size="2xl"
                          className="mb-4 size-20"
                        />

                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {selectedName}
                        </h3>

                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          Cuộc trò chuyện riêng trên ChitChat
                        </p>
                      </div>

                      {/* ERROR BANNER */}
                      {status.error && (
                        <div
                          role="alert"
                          className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                        >
                          <CircleAlert
                            size={18}
                            className="mt-1 shrink-0"
                          />

                          <span>{status.error}</span>
                        </div>
                      )}

                      {/* MESSAGE LIST */}
                      {messages.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                          <EmptyState
                            icon={MessageSquare}
                            title="Bắt đầu trò chuyện"
                            description="Hãy gửi một lời chào để bắt đầu cuộc trò chuyện."
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 pb-4">
                          {messages.map(message => (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              mine={
                                message.senderUserId === me?.id
                              }
                              onAction={messageAction}
                              token={access}
                            />
                          ))}
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* TYPING INDICATOR */}
                {typing && (
                  <div className="shrink-0 px-5 pb-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400" />
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                      </span>

                      {selectedName} đang nhập...
                    </div>
                  </div>
                )}

                {/* ==================================================
                    COMPOSER
                ================================================== */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-4">
                  <div className="mx-auto max-w-4xl">
                    {/* REPLY BANNER */}
                    {replyTo && (
                      <div className="mb-3 flex items-start gap-3 rounded-xl border-l-[3px] border-indigo-500 bg-indigo-50 px-4 py-3 dark:bg-indigo-500/10">
                        <CornerUpLeft
                          size={17}
                          className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                            Đang trả lời tin nhắn
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {replyTo.content || 'Tin nhắn đã thu hồi'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          aria-label="Hủy trả lời"
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/20"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    )}

                    {/* FILE ATTACHMENTS */}
                    {files.length > 0 && (
                      <div className="mb-3">
                        <FileComposer
                          files={files}
                          onFiles={next => {
                            pendingSend.current = null
                            setFiles(next)
                          }}
                        />
                      </div>
                    )}

                    {/* MESSAGE FORM */}
                    <form
                      onSubmit={send}
                      className={`
                        flex items-end gap-2 rounded-2xl
                        border bg-slate-50 p-2
                        transition-all duration-200
                        dark:bg-slate-800/60
                        ${
                          composerFocused
                            ? 'border-indigo-400 ring-4 ring-indigo-500/10 dark:border-indigo-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }
                      `}
                    >
                      {/* ATTACHMENT BUTTON */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            fileComposerRef.current?.click()
                          }
                          aria-label="Đính kèm tệp"
                          title="Đính kèm tệp"
                          className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                        >
                          <Paperclip size={20} />
                        </button>

                        <input
                          ref={fileComposerRef}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx,.txt,.zip"
                          className="sr-only"
                          onChange={event => {
                            const selectedFiles = Array.from(
                              event.target.files || []
                            )

                            pendingSend.current = null

                            setFiles(previous => [
                              ...previous,
                              ...selectedFiles,
                            ].slice(0, 5))

                            event.target.value = ''
                          }}
                        />
                      </div>

                      {/* TEXTAREA */}
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        maxLength={10000}
                        rows={1}
                        onChange={handleDraftChange}
                        onKeyDown={handleComposerKeyDown}
                        onFocus={() =>
                          setComposerFocused(true)
                        }
                        onBlur={() =>
                          setComposerFocused(false)
                        }
                        placeholder="Nhập tin nhắn..."
                        aria-label="Nội dung tin nhắn"
                        className="max-h-36 min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[13px] leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />

                      {/* SEND BUTTON */}
                      <button
                        type="submit"
                        disabled={
                          (!draft.trim() && files.length === 0) ||
                          status.sending
                        }
                        aria-label="Gửi tin nhắn"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                      >
                        {status.sending ? (
                          <LoaderCircle
                            size={19}
                            className="animate-spin"
                          />
                        ) : (
                          <Send size={19} />
                        )}
                      </button>
                    </form>

                    <p className="mt-2 hidden text-center text-[10px] text-slate-400 dark:text-slate-500 sm:block">
                      Nhấn Enter để gửi · Shift + Enter để xuống dòng
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  DETAILS PANEL
              ================================================== */}
              {detailsOpen && (
                <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(320px,88vw)] flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 xl:static xl:shadow-none">
                  <div className="flex h-[65px] shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
                    <h3 className="text-sm font-bold">
                      Thông tin cuộc trò chuyện
                    </h3>

                    <button
                      type="button"
                      onClick={() => setDetailsOpen(false)}
                      aria-label="Đóng thông tin cuộc trò chuyện"
                      className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="flex flex-col items-center border-b border-slate-100 pb-6 text-center dark:border-slate-800">
                      <Avatar
                        name={selectedName}
                        src={selectedProfile?.avatarUrl}
                        size="2xl"
                        online={isOnline}
                        className="size-24"
                      />

                      <h3 className="mt-4 text-base font-bold">
                        {selectedName}
                      </h3>

                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {isOnline
                          ? 'Đang hoạt động'
                          : 'Cuộc trò chuyện riêng'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Tùy chọn
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(true)
                          setDetailsOpen(false)
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Search size={18} />
                        Tìm kiếm tin nhắn
                      </button>

                      <Link
                        to="/settings"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Settings2 size={18} />
                        Cài đặt tài khoản
                      </Link>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
