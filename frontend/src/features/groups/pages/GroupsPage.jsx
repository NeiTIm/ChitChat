
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  CornerUpLeft,
  Inbox,
  Info,
  LoaderCircle,
  Menu,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import ThemeToggle from '../../../shared/components/ThemeToggle'
import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  ChatListSkeleton,
  MessageSkeleton,
  Skeleton,
} from '../../../components/ui/skeleton'

import { groupsApi } from '../api/groupsApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import MessageBubble from '../../chat/components/MessageBubble'
import ForwardPicker from '../../chat/components/ForwardPicker'
import MessageSearch from '../../chat/components/MessageSearch'
import FileComposer from '../../chat/components/FileComposer'
import GroupControls, { LinkJoinForm } from '../components/GroupControls'
import ConversationMuteButton from '../../notifications/components/ConversationMuteButton'

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
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

function GroupItem({ group, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
        selected
          ? 'bg-indigo-50 dark:bg-indigo-500/15'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Avatar
        name={group.name}
        size="lg"
        rounded="square"
        className="size-12"
      />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-bold ${
          selected
            ? 'text-indigo-700 dark:text-indigo-300'
            : 'text-slate-800 dark:text-slate-100'
        }`}>
          {group.name}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {group.status === 'Active' ? 'Nhóm đang hoạt động' : 'Nhóm đã giải tán'}
        </p>
      </div>

      {selected && <span className="size-2 rounded-full bg-indigo-500" />}
    </button>
  )
}

function SidebarLink({ to, icon: Icon, children, active }) {
  return (
    <Link
      to={to}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon size={18} />
      {children}
    </Link>
  )
}

export default function GroupsPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [me, setMe] = useState(null)
  const [groups, setGroups] = useState([])
  const [invitations, setInvitations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])

  const [name, setName] = useState('')
  const [invitee, setInvitee] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState([])
  const [replyTo, setReplyTo] = useState(null)
  const [forwardSource, setForwardSource] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [typingUserId, setTypingUserId] = useState(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteSearchOpen, setInviteSearchOpen] = useState(false)
  const [composerFocused, setComposerFocused] = useState(false)
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [state, setState] = useState({
    loading: true,
    loadingMessages: false,
    busy: false,
    error: '',
    connection: 'Đang kết nối…',
  })

  const hubRef = useRef(null)
  const pendingSend = useRef(null)
  const typingTimer = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const attachmentInputRef = useRef(null)
  const selectedRef = useRef(selected)

  selectedRef.current = selected

  const config = useCallback(
    access => ({
      headers: { Authorization: `Bearer ${access}` },
    }),
    []
  )

  const refresh = useCallback(async access => {
    const [list, invites] = await Promise.all([
      groupsApi.getGroups(config(access)),
      groupsApi.getGroupInvitations(config(access)),
    ])

    setGroups(list.data)
    setInvitations(invites.data)
    setState(value => ({
      ...value,
      loading: false,
      error: '',
    }))
  }, [config])

  const loadGroup = useCallback(async (access, groupId) => {
    if (!groupId) return

    setState(value => ({ ...value, loadingMessages: true }))

    try {
      const [history, people] = await Promise.all([
        groupsApi.getGroupsByIdMessages(groupId, config(access)),
        groupsApi.getGroupsByIdMembers(groupId, config(access))
          .catch(() => ({ data: [] })),
      ])

      setMessages([...history.data.items].reverse())
      setMembers(people.data)

      if (me?.id) {
        const received = history.data.items
          .filter(item => item.senderUserId !== me.id)
          .map(item => item.id)

        if (received.length) {
          await groupsApi.postConversationsByIdDeliveryAcks(
            groupId,
            { messageIds: received },
            config(access)
          ).catch(() => {})
        }

        if (
          document.visibilityState === 'visible' &&
          history.data.items.length
        ) {
          await new Promise(resolve => requestAnimationFrame(resolve))

          if (document.visibilityState === 'visible') {
            await groupsApi.putConversationsByIdReadCursor(
              groupId,
              {
                lastReadSequence: history.data.items[0].sequence,
              },
              config(access)
            ).catch(() => {})
          }
        }
      }

      setState(value => ({
        ...value,
        loadingMessages: false,
        error: '',
      }))
    } catch {
      setMessages([])
      setMembers([])
      setState(value => ({
        ...value,
        loadingMessages: false,
        error: 'Không thể tải nhóm hoặc bạn đã mất quyền truy cập.',
      }))
    }
  }, [config, me?.id])

  // AUTH
  useEffect(() => {
    let active = true

    restoreAccessToken()
      .then(async access => {
        if (!access) {
          navigate('/login')
          return
        }
        if (!active) return

        setToken(access)
        const self = await groupsApi.getUsersMe(config(access))

        if (active) setMe(self.data)
        await refresh(access)
      })
      .catch(() => {
        if (active) {
          setState(value => ({
            ...value,
            loading: false,
            error: 'Không thể tải danh sách nhóm.',
          }))
        }
      })

    return () => {
      active = false
    }
  }, [navigate, config, refresh])

  useEffect(() => {
    if (token && selected) loadGroup(token, selected)
  }, [token, selected, loadGroup])

  // SIGNALR
  useEffect(() => {
    if (!token) return

    const hub = new HubConnectionBuilder()
      .withUrl('/hubs/chat', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    hubRef.current = hub

    hub.on('MessageCreated', event => {
      if (event.conversationId === selected) {
        loadGroup(token, selected)
      }
      refresh(token).catch(() => {})
    })

    for (const eventName of [
      'MessageEdited',
      'MessageRecalled',
      'MessageReactionChanged',
      'MessageDeletedForMe',
    ]) {
      hub.on(eventName, event => {
        if (!event.conversationId || event.conversationId === selected) {
          loadGroup(token, selected)
        }
      })
    }

    hub.on('TypingChanged', event => {
      if (event.conversationId !== selected || event.actorId === me?.id) return

      setTypingUserId(event.isTyping ? event.actorId : null)
      clearTimeout(typingTimer.current)

      if (event.isTyping) {
        typingTimer.current = setTimeout(() => setTypingUserId(null), 5000)
      }
    })

    hub.onreconnecting(() => {
      setState(value => ({
        ...value,
        connection: 'Đang kết nối lại…',
      }))
    })

    hub.onreconnected(() => {
      refresh(token).catch(() => {})
      if (selected) loadGroup(token, selected)
      setState(value => ({ ...value, connection: 'Đã kết nối' }))
    })

    hub.start()
      .then(() => {
        setState(value => ({ ...value, connection: 'Đã kết nối' }))
      })
      .catch(() => {
        setState(value => ({
          ...value,
          connection: 'Realtime không khả dụng',
        }))
      })

    return () => {
      hubRef.current = null
      clearTimeout(typingTimer.current)
      hub.stop().catch(() => {})
    }
  }, [token, selected, loadGroup, refresh, me?.id])

  // SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, selected])

  // RESET UI ON GROUP CHANGE
  useEffect(() => {
    setDraft('')
    setFiles([])
    setReplyTo(null)
    setForwardSource(null)
    setSearchOpen(false)
    setTypingUserId(null)
    pendingSend.current = null
  }, [selected])

  const action = async (method, path, body, after) => {
    if (state.busy) return

    setState(value => ({ ...value, busy: true, error: '' }))

    try {
      const { data } = await groupsApi.request({
        method,
        url: path,
        data: body,
        ...config(token),
      })

      await refresh(token)
      if (after) await after(data)
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể thực hiện thao tác. Kiểm tra quyền và thử lại.',
      }))
    } finally {
      setState(value => ({ ...value, busy: false }))
    }
  }

  const create = event => {
    event.preventDefault()
    if (!name.trim()) return

    action(
      'post',
      '/groups',
      { name: name.trim(), inviteeUserIds: [] },
      group => {
        setName('')
        setCreateOpen(false)
        setSelected(group.id)
        setSidebarOpen(false)
      }
    )
  }

  const invite = event => {
    event.preventDefault()
    if (!selected || !invitee.trim()) return

    action(
      'post',
      `/groups/${selected}/invitations`,
      { inviteeUserId: invitee.trim() },
      () => {
        setInvitee('')
        setQuery('')
        setResults([])
      }
    )
  }

  const search = async event => {
    event.preventDefault()
    if (query.trim().length < 2) return

    setSearchingUsers(true)
    try {
      const { data } = await groupsApi.getUsersSearch({
        params: { query: query.trim() },
        ...config(token),
      })
      setResults(data.items.filter(user => user.id !== me?.id))
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể tìm người dùng.',
      }))
    } finally {
      setSearchingUsers(false)
    }
  }

  const messageAction = async (kind, message, value) => {
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
        await groupsApi.patchMessagesById(
          message.id, { content: value }, config(token)
        )
      } else if (kind === 'recall') {
        await groupsApi.postMessagesByIdRecall(
          message.id, null, config(token)
        )
      } else if (kind === 'reaction') {
        await groupsApi.putMessagesByIdReaction(
          message.id, { emoji: value }, config(token)
        )
      } else if (kind === 'pin') {
        await groupsApi.postGroupsByIdPins(
          selected, { messageId: message.id }, config(token)
        )
      } else if (kind === 'delete') {
        await groupsApi.deleteMessagesByIdForMe(
          message.id, config(token)
        )
      }

      await loadGroup(token, selected)
      return true
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể thay đổi tin nhắn hoặc bạn đã mất quyền truy cập.',
      }))
      return false
    }
  }

  const send = async event => {
    event.preventDefault()

    if (
      !selected ||
      group?.status !== 'Active' ||
      state.busy ||
      (!draft.trim() && files.length === 0)
    ) return

    const attempt = pendingSend.current ?? {
      clientMessageId: crypto.randomUUID(),
      conversationId: selected,
      content: draft.trim(),
      replyToMessageId: replyTo?.id ?? null,
      files: [...files],
      attachmentIds: [],
    }

    if (attempt.conversationId !== selected) return

    pendingSend.current = attempt
    setState(value => ({ ...value, busy: true, error: '' }))

    try {
      for (const file of attempt.files.slice(attempt.attachmentIds.length)) {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'Message')

        const upload = await groupsApi.postFiles(form, config(token))
        attempt.attachmentIds.push(upload.data.id)
      }

      await groupsApi.postGroupsByIdMessages(
        selected,
        {
          clientMessageId: attempt.clientMessageId,
          content: attempt.content || null,
          replyToMessageId: attempt.replyToMessageId,
          attachmentIds: attempt.attachmentIds,
        },
        config(token)
      )

      hubRef.current?.invoke('StopTyping', selected).catch(() => {})
      pendingSend.current = null
      setDraft('')
      setFiles([])
      setReplyTo(null)
      await loadGroup(token, selected)
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể tải tệp lên hoặc gửi tin nhắn.',
      }))
    } finally {
      setState(value => ({ ...value, busy: false }))
    }
  }

  useEffect(() => {
    const retry = () => {
      if (pendingSend.current && !state.busy) {
        send({ preventDefault() {} })
      }
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  })

  const handleDraftChange = event => {
    const value = event.target.value
    pendingSend.current = null
    setDraft(value)

    hubRef.current
      ?.invoke(value ? 'StartTyping' : 'StopTyping', selected)
      .catch(() => {})
  }

  const handleKeyDown = event => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (!state.busy && (draft.trim() || files.length > 0)) {
        send(event)
      }
    }
  }

  const group = groups.find(item => item.id === selected)
  const groupActive = group?.status === 'Active'
  const filteredGroups = groups.filter(item =>
    item.name.toLocaleLowerCase('vi').includes(
      groupSearch.trim().toLocaleLowerCase('vi')
    )
  )

  return (
    <main className="flex h-dvh min-h-0 min-w-0 overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng danh sách nhóm"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(340px,88vw)] shrink-0 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:static md:w-[320px] md:translate-x-0 md:shadow-none xl:w-[340px] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-slate-100 px-5 pb-5 pt-5 dark:border-slate-800">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link to="/account" className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                <MessageCircle size={23} />
              </span>
              <span className="text-xl font-extrabold tracking-tight">
                ChitChat
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng menu"
                className="flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Nhóm chat</h1>
              <p className="mt-1 text-xs text-slate-400">
                Không gian trò chuyện chung
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(value => !value)}
              title="Tạo nhóm mới"
              aria-label="Tạo nhóm mới"
              className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              value={groupSearch}
              onChange={event => setGroupSearch(event.target.value)}
              placeholder="Tìm nhóm..."
              aria-label="Tìm nhóm"
              className="h-11 bg-slate-100 pl-10 dark:bg-slate-800"
            />
          </div>
        </div>

        <nav className="shrink-0 space-y-1 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <SidebarLink to="/chat" icon={MessageSquare}>
            Chat riêng
          </SidebarLink>
          <SidebarLink to="/groups" icon={Users} active>
            Nhóm chat
          </SidebarLink>
          <SidebarLink to="/message-requests" icon={Inbox}>
            Tin nhắn chờ
          </SidebarLink>
          <SidebarLink to="/notifications" icon={Bell}>
            Thông báo
          </SidebarLink>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {/* CREATE GROUP */}
          {createOpen && (
            <form
              onSubmit={create}
              className="mb-4 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10"
            >
              <label
                htmlFor="new-group-name"
                className="text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Tạo nhóm mới
              </label>
              <Input
                id="new-group-name"
                value={name}
                maxLength={100}
                onChange={event => setName(event.target.value)}
                placeholder="Tên nhóm..."
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={state.busy || !name.trim()}
                  loading={state.busy}
                >
                  Tạo nhóm
                </Button>
              </div>
            </form>
          )}

          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Nhóm của tôi
            </h2>
            <Badge variant="secondary" size="sm">
              {groups.length}
            </Badge>
          </div>

          {state.loading ? (
            <ChatListSkeleton count={5} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Chưa có nhóm"
              description="Tạo nhóm mới hoặc tham gia nhóm bằng lời mời."
            />
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Không tìm thấy nhóm"
              description="Thử tìm kiếm bằng tên nhóm khác."
            />
          ) : (
            <div className="space-y-1">
              {filteredGroups.map(item => (
                <GroupItem
                  key={item.id}
                  group={item}
                  selected={item.id === selected}
                  onSelect={() => {
                    setSelected(item.id)
                    setSidebarOpen(false)
                    setDetailsOpen(false)
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <LinkJoinForm
              token={token}
              onJoined={async groupId => {
                await refresh(token)
                setSelected(groupId)
                setSidebarOpen(false)
              }}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-bold">Lời mời vào nhóm</h3>
                <Badge variant="secondary" size="sm">
                  {invitations.length}
                </Badge>
              </div>

              {invitations.length === 0 ? (
                <p className="text-xs leading-6 text-slate-400">
                  Chưa có lời mời mới.
                </p>
              ) : (
                <div className="space-y-3">
                  {invitations.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                    >
                      <p className="truncate text-xs font-semibold">
                        {item.groupName}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          disabled={state.busy}
                          onClick={() =>
                            action(
                              'post',
                              `/group-invitations/${item.id}/accept`,
                              null,
                              () => setSelected(item.conversationId)
                            )
                          }
                        >
                          <Check size={14} />
                          Tham gia
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={state.busy}
                          onClick={() =>
                            action(
                              'post',
                              `/group-invitations/${item.id}/reject`
                            )
                          }
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <Link
            to="/account"
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar
              name={me?.displayName || me?.username || 'Tôi'}
              src={me?.avatarUrl}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">
                {me?.displayName || me?.username || 'Tài khoản của tôi'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Quản lý tài khoản
              </p>
            </div>
            <Settings2 size={18} className="text-slate-400" />
          </Link>
        </div>
      </aside>

      {/* MAIN PANEL */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7f9fc] dark:bg-slate-950">
        {state.error && (
          <div
            role="alert"
            className="absolute inset-x-3 top-3 z-40 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 shadow-lg dark:border-rose-500/20 dark:bg-rose-950 dark:text-rose-300"
          >
            <CircleAlert size={17} className="shrink-0" />
            <span className="flex-1">{state.error}</span>
            <button
              type="button"
              onClick={() => setState(value => ({ ...value, error: '' }))}
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {!group ? (
          <>
            <div className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Mở danh sách nhóm"
                className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu size={22} />
              </button>
              <span className="ml-3 font-bold">Nhóm chat</span>
            </div>

            <EmptyState
              icon={Users}
              title="Chọn một nhóm để bắt đầu"
              description="Chọn nhóm trong danh sách, tạo nhóm mới hoặc chấp nhận lời mời tham gia."
            />
          </>
        ) : (
          <>
            {/* HEADER */}
            <header className="z-20 flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Mở danh sách nhóm"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft size={21} />
                </button>

                <Avatar
                  name={group.name}
                  rounded="square"
                  size="lg"
                  className="size-11 sm:size-12"
                />

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">
                    {group.name}
                  </h2>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {members.length} thành viên ·{' '}
                    {typingUserId ? 'Một thành viên đang nhập...' : state.connection}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {groupActive && (
                  <ConversationMuteButton
                    token={token}
                    conversationId={selected}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setSearchOpen(value => !value)}
                  aria-label="Tìm kiếm tin nhắn"
                  aria-pressed={searchOpen}
                  className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                    searchOpen
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Search size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(value => !value)}
                  aria-label="Thông tin nhóm"
                  aria-pressed={detailsOpen}
                  className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                    detailsOpen
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Info size={20} />
                </button>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {/* SEARCH POPOVER */}
                {searchOpen && (
                  <div className="absolute inset-x-3 top-3 z-30 max-h-[75%] overflow-y-auto rounded-2xl shadow-xl sm:inset-x-auto sm:right-5 sm:w-[380px]">
                    <MessageSearch
                      token={token}
                      conversationId={selected}
                    />
                  </div>
                )}

                {/* FORWARD OVERLAY */}
                {forwardSource && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]">
                    <div className="w-full max-w-md">
                      <ForwardPicker
                        token={token}
                        source={forwardSource}
                        onClose={() => setForwardSource(null)}
                      />
                    </div>
                  </div>
                )}

                {/* MESSAGES */}
                <div
                  aria-live="polite"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6"
                >
                  {state.loadingMessages ? (
                    <MessageSkeleton count={6} />
                  ) : (
                    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
                      <div className="mb-7 flex flex-col items-center pt-6 text-center">
                        <Avatar
                          name={group.name}
                          rounded="square"
                          size="2xl"
                          className="mb-4 size-20"
                        />
                        <h3 className="text-base font-bold">{group.name}</h3>
                        <p className="mt-2 text-xs text-slate-400">
                          {members.length} thành viên · Nhóm chat ChitChat
                        </p>
                        {!groupActive && (
                          <Badge variant="warning" className="mt-3">
                            Nhóm đã giải tán
                          </Badge>
                        )}
                      </div>

                      {messages.length === 0 ? (
                        <EmptyState
                          icon={MessageSquare}
                          title="Chưa có tin nhắn"
                          description="Hãy gửi một lời chào để bắt đầu cuộc trò chuyện nhóm."
                        />
                      ) : (
                        <div className="flex flex-col gap-2 pb-4">
                          {messages.map(message => (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              mine={message.senderUserId === me?.id}
                              onAction={messageAction}
                              token={token}
                              canPin={groupActive}
                            />
                          ))}
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* TYPING */}
                {typingUserId && (
                  <div className="shrink-0 px-5 pb-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400" />
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                      </span>
                      Một thành viên đang nhập...
                    </div>
                  </div>
                )}

                {/* COMPOSER */}
                {groupActive ? (
                  <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-4">
                    <div className="mx-auto max-w-4xl">
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
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      )}

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

                      <form
                        onSubmit={send}
                        className={`flex items-end gap-2 rounded-2xl border bg-slate-50 p-2 transition-all dark:bg-slate-800/60 ${
                          composerFocused
                            ? 'border-indigo-400 ring-4 ring-indigo-500/10 dark:border-indigo-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          aria-label="Đính kèm tệp"
                          title="Đính kèm tệp"
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <Paperclip size={20} />
                        </button>

                        <input
                          ref={attachmentInputRef}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx,.txt,.zip"
                          className="sr-only"
                          onChange={event => {
                            const nextFiles = Array.from(event.target.files || [])
                            pendingSend.current = null
                            setFiles(previous => [...previous, ...nextFiles].slice(0, 5))
                            event.target.value = ''
                          }}
                        />

                        <textarea
                          ref={textareaRef}
                          value={draft}
                          rows={1}
                          maxLength={10000}
                          onChange={handleDraftChange}
                          onKeyDown={handleKeyDown}
                          onFocus={() => setComposerFocused(true)}
                          onBlur={() => setComposerFocused(false)}
                          placeholder="Nhắn tin vào nhóm..."
                          aria-label="Nội dung tin nhóm"
                          className="max-h-36 min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[13px] leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />

                        <button
                          type="submit"
                          disabled={state.busy || (!draft.trim() && files.length === 0)}
                          aria-label="Gửi tin nhóm"
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700"
                        >
                          {state.busy ? (
                            <LoaderCircle size={19} className="animate-spin" />
                          ) : (
                            <Send size={19} />
                          )}
                        </button>
                      </form>

                      <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">
                        Enter để gửi · Shift + Enter để xuống dòng
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    Nhóm đã giải tán. Bạn chỉ có thể xem lịch sử trò chuyện.
                  </div>
                )}
              </div>

              {/* DETAILS PANEL */}
              {detailsOpen && (
                <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(360px,92vw)] flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 xl:static xl:shadow-none">
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
                    <h3 className="text-sm font-bold">Thông tin nhóm</h3>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(false)}
                      aria-label="Đóng thông tin nhóm"
                      className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
                    <div className="flex flex-col items-center border-b border-slate-100 pb-6 pt-3 text-center dark:border-slate-800">
                      <Avatar
                        name={group.name}
                        rounded="square"
                        size="2xl"
                        className="size-20"
                      />
                      <h3 className="mt-4 text-base font-bold">{group.name}</h3>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {group.description || `${members.length} thành viên`}
                      </p>
                    </div>

                    <GroupControls
                      token={token}
                      group={group}
                      members={members}
                      me={me}
                      onRefresh={async () => {
                        await refresh(token)
                        await loadGroup(token, selected)
                      }}
                    />

                    {groupActive && (
                      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="mb-4 flex items-center gap-2">
                          <UserPlus size={19} className="text-indigo-600 dark:text-indigo-400" />
                          <h3 className="text-sm font-bold">Mời thành viên</h3>
                        </div>

                        <form onSubmit={search} className="flex gap-2">
                          <Input
                            value={query}
                            onChange={event => {
                              setQuery(event.target.value)
                              setInvitee('')
                              setResults([])
                            }}
                            placeholder="Tìm người dùng..."
                            aria-label="Tìm người dùng để mời"
                            minLength={2}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={state.busy || searchingUsers || query.trim().length < 2}
                            loading={searchingUsers}
                            aria-label="Tìm người dùng"
                          >
                            {!searchingUsers && <Search size={17} />}
                          </Button>
                        </form>

                        {results.length > 0 && (
                          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                            {results.map(user => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setInvitee(user.id)
                                  setQuery(user.displayName)
                                  setResults([])
                                }}
                                className="flex w-full items-center gap-2 rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Avatar name={user.displayName} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold">{user.displayName}</p>
                                  <p className="truncate text-[11px] text-slate-400">@{user.username}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {invitee && (
                          <form onSubmit={invite} className="mt-3 space-y-3">
                            <Badge variant="success">
                              <Check size={12} />
                              Đã chọn người dùng
                            </Badge>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={state.busy}
                              loading={state.busy}
                            >
                              <UserPlus size={16} />
                              Gửi lời mời
                            </Button>
                          </form>
                        )}
                      </section>
                    )}
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
