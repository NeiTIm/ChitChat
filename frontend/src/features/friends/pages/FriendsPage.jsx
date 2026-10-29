
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageCircle,
  Search,
  Send,
  ShieldOff,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { PageSkeleton, Skeleton } from '../../../components/ui/skeleton'
import { friendsApi } from '../api/friendsApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import ReportButton from '../../moderation/components/ReportButton'

const tabs = [
  { id: 'friends', label: 'Bạn bè', icon: Users },
  { id: 'incoming', label: 'Lời mời đến', icon: Inbox },
  { id: 'outgoing', label: 'Đã gửi', icon: Clock3 },
  { id: 'blocked', label: 'Đã chặn', icon: Ban },
]

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
        <Icon size={28} strokeWidth={1.6} />
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

function PersonCard({
  name,
  username,
  avatarUrl,
  subtitle,
  badge,
  actions,
}) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar
          name={name}
          src={avatarUrl}
          size="lg"
          className="size-12"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {name || 'Người dùng'}
            </h3>

            {badge}
          </div>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {username ? `@${username}` : subtitle || 'Người dùng ChitChat'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {actions}
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách" className="space-y-3">
      <span className="sr-only">Đang tải dữ liệu...</span>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [me, setMe] = useState(null)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState({
    incoming: [],
    outgoing: [],
  })
  const [blocks, setBlocks] = useState([])
  const [profiles, setProfiles] = useState({})
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState('friends')
  const [busyKey, setBusyKey] = useState('')

  const [state, setState] = useState({
    loading: true,
    searching: false,
    error: '',
    message: '',
  })

  const headers = access => ({
    Authorization: `Bearer ${access}`,
  })

  const load = async access => {
    const [self, friendList, requestList, blockList] = await Promise.all([
      friendsApi.getUsersMe({ headers: headers(access) }),
      friendsApi.getFriends({ headers: headers(access) }),
      friendsApi.getFriendsRequests({ headers: headers(access) }),
      friendsApi.getBlocks({ headers: headers(access) }),
    ])

    const nextRequests = {
      incoming: requestList.data?.incoming || [],
      outgoing: requestList.data?.outgoing || [],
    }

    setMe(self.data)
    setFriends(friendList.data || [])
    setRequests(nextRequests)
    setBlocks(blockList.data || [])

    const ids = [
      ...new Set([
        ...nextRequests.incoming.map(r => r.senderUserId),
        ...nextRequests.outgoing.map(r => r.receiverUserId),
      ]),
    ]

    const fetched = await Promise.all(
      ids.map(id =>
        friendsApi
          .getUsersById(id, {
            headers: headers(access),
          })
          .then(({ data }) => [id, data])
          .catch(() => [id, null])
      )
    )

    setProfiles(Object.fromEntries(fetched))
    setState(value => ({ ...value, loading: false }))
  }

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
          error: 'Không thể tải danh sách bạn bè.',
        }))
      })

    return () => {
      active = false
    }
  }, [navigate])

  const act = async (method, path, body, message) => {
    if (busyKey) return

    setBusyKey(path)
    setState(value => ({ ...value, error: '', message: '' }))

    try {
      await friendsApi.request({
        method,
        url: path,
        data: body,
        headers: headers(token),
      })

      await load(token)

      setState(value => ({ ...value, message }))
    } catch (error) {
      setState(value => ({
        ...value,
        error:
          error.response?.data?.code ||
          'Không thể thực hiện thao tác.',
      }))
    } finally {
      setBusyKey('')
    }
  }

  const openChat = async userId => {
    if (busyKey) return

    setBusyKey(`chat-${userId}`)

    try {
      const { data } = await friendsApi.postConversationsPrivate(
        { targetUserId: userId },
        { headers: headers(token) }
      )

      navigate(`/chat/${data.id}`)
    } catch {
      setState(value => ({
        ...value,
        error: 'Không thể mở cuộc trò chuyện.',
      }))
    } finally {
      setBusyKey('')
    }
  }

  const search = async event => {
    event.preventDefault()

    if (query.trim().length < 2 || state.searching) return

    setState(value => ({
      ...value,
      searching: true,
      error: '',
    }))
    setHasSearched(true)

    try {
      const { data } = await friendsApi.getUsersSearch({
        params: { query: query.trim() },
        headers: headers(token),
      })

      setResults(data.items || [])

      setState(value => ({
        ...value,
        searching: false,
      }))
    } catch {
      setResults([])
      setState(value => ({
        ...value,
        searching: false,
        error: 'Không thể tìm người dùng.',
      }))
    }
  }

  const name = id =>
    profiles[id]?.displayName || 'Người dùng không khả dụng'

  const tabCounts = {
    friends: friends.length,
    incoming: requests.incoming.length,
    outgoing: requests.outgoing.length,
    blocked: blocks.length,
  }

  const confirmAction = (message, callback) => {
    if (window.confirm(message)) callback()
  }

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/chat" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <MessageCircle size={22} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              ChitChat
            </span>
          </Link>

          <Link
            to="/account"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Tài khoản
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        {/* PAGE TITLE */}
        <div>
          <Badge variant="default" size="sm">
            <Users size={13} />
            Friends & Connections
          </Badge>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Bạn bè & Kết nối
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            Tìm kiếm người dùng, quản lý lời mời kết bạn và giữ
            liên lạc với những người quan trọng.
          </p>
        </div>

        {/* NOTIFICATIONS */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
          >
            <CircleAlert size={19} className="shrink-0" />
            <span className="flex-1">{state.error}</span>
            <button
              type="button"
              onClick={() => setState(value => ({ ...value, error: '' }))}
              aria-label="Đóng thông báo"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {state.message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <CheckCircle2 size={19} className="shrink-0" />
            <span className="flex-1">{state.message}</span>
            <button
              type="button"
              onClick={() => setState(value => ({ ...value, message: '' }))}
              aria-label="Đóng thông báo"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SEARCH PANEL */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Search size={21} />
            </div>

            <div>
              <h2 className="text-base font-bold">
                Khám phá bạn bè
              </h2>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                Tìm người dùng theo tên hiển thị hoặc username.
              </p>
            </div>
          </div>

          <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Input
                required
                minLength={2}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Nhập tên hoặc username..."
                aria-label="Tên hiển thị hoặc username"
                className="h-12 pl-11 pr-10"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setResults([])
                    setHasSearched(false)
                  }}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <Button
              type="submit"
              loading={state.searching}
              disabled={state.searching || query.trim().length < 2 || !token}
              className="h-12 sm:px-6"
            >
              {!state.searching && <Search size={17} />}
              Tìm kiếm
            </Button>
          </form>

          {hasSearched && (
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="mb-4 text-sm font-bold">
                Kết quả tìm kiếm
              </h3>

              {state.searching ? (
                <ListSkeleton />
              ) : results.filter(user => user.id !== me?.id).length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Không tìm thấy người dùng"
                  description="Thử tìm kiếm bằng tên hoặc username khác."
                />
              ) : (
                <ul className="space-y-3">
                  {results
                    .filter(user => user.id !== me?.id)
                    .map(user => (
                      <PersonCard
                        key={user.id}
                        name={user.displayName}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        actions={
                          <>
                            <Button
                              size="sm"
                              disabled={Boolean(busyKey)}
                              loading={busyKey === '/friends/requests'}
                              onClick={() =>
                                act(
                                  'post',
                                  '/friends/requests',
                                  { targetUserId: user.id },
                                  'Đã gửi lời mời kết bạn.'
                                )
                              }
                            >
                              <UserPlus size={15} />
                              Kết bạn
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(busyKey)}
                              loading={busyKey === `chat-${user.id}`}
                              onClick={() => openChat(user.id)}
                            >
                              <MessageCircle size={15} />
                              Nhắn tin
                            </Button>

                            <ReportButton
                              token={token}
                              targetType="User"
                              targetId={user.id}
                            />
                          </>
                        }
                      />
                    ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* SIDE TABS */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <nav aria-label="Quản lý bạn bè" className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">{tab.label}</span>
                    <span className={`rounded-lg px-2 py-0.5 text-[11px] ${
                      active
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {tabCounts[tab.id]}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* LIST CONTENT */}
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tabCounts[activeTab]} mục
                </p>
              </div>

              <Badge variant="secondary">
                {tabCounts[activeTab]}
              </Badge>
            </div>

            {state.loading ? (
              <ListSkeleton />
            ) : (
              <>
                {/* FRIENDS */}
                {activeTab === 'friends' && (
                  friends.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Chưa có bạn bè"
                      description="Tìm kiếm và gửi lời mời để bắt đầu kết nối."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {friends.map(friend => (
                        <PersonCard
                          key={friend.userId}
                          name={friend.displayName}
                          username={friend.username}
                          avatarUrl={friend.avatarUrl}
                          actions={
                            <>
                              <Button
                                size="sm"
                                disabled={Boolean(busyKey)}
                                loading={busyKey === `chat-${friend.userId}`}
                                onClick={() => openChat(friend.userId)}
                              >
                                <MessageCircle size={15} />
                                Nhắn tin
                              </Button>

                              <ReportButton
                                token={token}
                                targetType="User"
                                targetId={friend.userId}
                              />

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={Boolean(busyKey)}
                                onClick={() =>
                                  confirmAction(
                                    'Bạn có chắc muốn hủy kết bạn?',
                                    () =>
                                      act(
                                        'delete',
                                        `/friends/${friend.userId}`,
                                        null,
                                        'Đã hủy kết bạn.'
                                      )
                                  )
                                }
                              >
                                <UserMinus size={15} />
                                Hủy kết bạn
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={Boolean(busyKey)}
                                onClick={() =>
                                  confirmAction(
                                    'Bạn có chắc muốn chặn người dùng này?',
                                    () =>
                                      act(
                                        'post',
                                        '/blocks',
                                        { targetUserId: friend.userId },
                                        'Đã chặn người dùng.'
                                      )
                                  )
                                }
                              >
                                <Ban size={15} />
                                Chặn
                              </Button>
                            </>
                          }
                        />
                      ))}
                    </ul>
                  )
                )}

                {/* INCOMING REQUESTS */}
                {activeTab === 'incoming' && (
                  requests.incoming.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="Không có lời mời mới"
                      description="Các lời mời kết bạn mới sẽ hiển thị tại đây."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {requests.incoming.map(request => (
                        <PersonCard
                          key={request.id}
                          name={name(request.senderUserId)}
                          avatarUrl={profiles[request.senderUserId]?.avatarUrl}
                          subtitle="Đã gửi lời mời kết bạn"
                          badge={
                            <Badge variant="default" size="sm">
                              Mới
                            </Badge>
                          }
                          actions={
                            <>
                              <Button
                                size="sm"
                                disabled={Boolean(busyKey)}
                                onClick={() =>
                                  act(
                                    'post',
                                    `/friends/requests/${request.id}/accept`,
                                    null,
                                    'Đã chấp nhận lời mời kết bạn.'
                                  )
                                }
                              >
                                <Check size={15} />
                                Chấp nhận
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={Boolean(busyKey)}
                                onClick={() =>
                                  act(
                                    'post',
                                    `/friends/requests/${request.id}/reject`,
                                    null,
                                    'Đã từ chối lời mời.'
                                  )
                                }
                              >
                                <X size={15} />
                                Từ chối
                              </Button>
                            </>
                          }
                        />
                      ))}
                    </ul>
                  )
                )}

                {/* OUTGOING REQUESTS */}
                {activeTab === 'outgoing' && (
                  requests.outgoing.length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="Chưa gửi lời mời nào"
                      description="Các lời mời đang chờ phản hồi sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {requests.outgoing.map(request => (
                        <PersonCard
                          key={request.id}
                          name={name(request.receiverUserId)}
                          avatarUrl={profiles[request.receiverUserId]?.avatarUrl}
                          subtitle="Đang chờ phản hồi"
                          badge={
                            <Badge variant="warning" size="sm">
                              <Clock3 size={12} />
                              Đang chờ
                            </Badge>
                          }
                          actions={
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(busyKey)}
                              onClick={() =>
                                act(
                                  'post',
                                  `/friends/requests/${request.id}/cancel`,
                                  null,
                                  'Đã hủy lời mời kết bạn.'
                                )
                              }
                            >
                              <X size={15} />
                              Hủy lời mời
                            </Button>
                          }
                        />
                      ))}
                    </ul>
                  )
                )}

                {/* BLOCKED USERS */}
                {activeTab === 'blocked' && (
                  blocks.length === 0 ? (
                    <EmptyState
                      icon={ShieldOff}
                      title="Chưa chặn ai"
                      description="Danh sách người dùng đã chặn sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {blocks.map(block => (
                        <PersonCard
                          key={block.userId}
                          name={block.displayName}
                          username={block.username}
                          avatarUrl={block.avatarUrl}
                          actions={
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(busyKey)}
                              onClick={() =>
                                act(
                                  'delete',
                                  `/blocks/${block.userId}`,
                                  null,
                                  'Đã bỏ chặn. Quyền chat và quan hệ bạn bè cũ không tự phục hồi.'
                                )
                              }
                            >
                              <ShieldOff size={15} />
                              Bỏ chặn
                            </Button>
                          }
                        />
                      ))}
                    </ul>
                  )
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
