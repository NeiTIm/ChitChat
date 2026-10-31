
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  MessageSquareText,
  Monitor,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { PageSkeleton } from '../../../components/ui/skeleton'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'

import { authApi } from '../api/authApi'
import {
  csrfToken,
  getAccessToken,
  restoreAccessToken,
  setAccessToken,
  getCsrfToken,
} from '../utils/authSession'

// ======================================================
// HELPER COMPONENTS
// ======================================================

function SectionHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={21} strokeWidth={1.8} />
        </div>

        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  )
}

function QuickLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition-colors group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-indigo-400">
        <Icon size={19} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>

        <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ChevronRight
        size={17}
        className="shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-500 dark:text-slate-600"
      />
    </Link>
  )
}

function DeviceIcon({ name }) {
  const deviceName = String(name || '').toLowerCase()

  const isMobile = [
    'iphone',
    'android',
    'phone',
    'mobile',
    'ipad',
  ].some(value => deviceName.includes(value))

  return isMobile ? (
    <Smartphone size={22} strokeWidth={1.8} />
  ) : (
    <Monitor size={22} strokeWidth={1.8} />
  )
}

function SessionItem({ session }) {
  return (
    <li className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-indigo-100 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-500/20 dark:hover:bg-slate-800">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
        <DeviceIcon name={session.deviceName} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {session.deviceName || 'Thiết bị không xác định'}
        </h3>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {session.isCurrent
            ? 'Phiên đăng nhập hiện tại'
            : 'Phiên đăng nhập trên thiết bị khác'}
        </p>
      </div>

      <Badge
        variant={session.isCurrent ? 'success' : 'secondary'}
        size="sm"
        className="shrink-0"
      >
        {session.isCurrent ? (
          <>
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Thiết bị này</span>
            <span className="sm:hidden">Hiện tại</span>
          </>
        ) : (
          'Thiết bị khác'
        )}
      </Badge>
    </li>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-12 pl-11 pr-12"
        />

        <button
          type="button"
          onClick={() => setVisible(previous => !previous)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

// ======================================================
// ACCOUNT PAGE
// ======================================================

export default function AccountPage() {
  const navigate = useNavigate()

  const [state, setState] = useState({
    loading: true,
    sessions: [],
    error: '',
  })

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
  })

  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('success')

  const [loggingOut, setLoggingOut] = useState(false)
  const [loggingOutOthers, setLoggingOutOthers] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // ====================================================
  // LOAD AUTH SESSIONS
  // ====================================================

  useEffect(() => {
    let active = true

    const loadSessions = async () => {
      try {
        const token = await restoreAccessToken()

        if (!token) {
          throw new Error('No session')
        }

        const { data } = await authApi.getAuthSessions({
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!active) return

        setState({
          loading: false,
          sessions: Array.isArray(data) ? data : [],
          error: '',
        })
      } catch {
        if (!active) return

        setState({
          loading: false,
          sessions: [],
          error: 'Phiên đăng nhập không còn hợp lệ.',
        })

        navigate('/login', { replace: true })
      }
    }

    loadSessions()

    return () => {
      active = false
    }
  }, [navigate])

  // ====================================================
  // HELPERS
  // ====================================================

  const authHeader = () => ({
    Authorization: `Bearer ${getAccessToken()}`,
  })

  const showNotice = (message, type = 'success') => {
    setNotice(message)
    setNoticeType(type)
  }

  const otherSessionCount = state.sessions.filter(
    session => !session.isCurrent
  ).length

  // ====================================================
  // LOGOUT CURRENT SESSION
  // ====================================================

  const logout = async () => {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await authApi.postAuthLogout(null, {
        headers: {
          ...authHeader(),
          'X-CSRF-Token': await getCsrfToken(),
        },
      })
    } catch {
      // Phiên hết hạn vẫn cần xóa access token phía client.
    } finally {
      setAccessToken(null)
      navigate('/login', { replace: true })
    }
  }

  // ====================================================
  // LOGOUT OTHER DEVICES
  // ====================================================

  const logoutOthers = async () => {
    if (loggingOutOthers) return

    setLoggingOutOthers(true)
    setNotice('')

    try {
      await authApi.postAuthLogoutOthers(null, {
        headers: authHeader(),
      })

      setState(previous => ({
        ...previous,
        sessions: previous.sessions.filter(
          session => session.isCurrent
        ),
      }))

      showNotice(
        'Đã đăng xuất thành công tất cả thiết bị khác.',
        'success'
      )
    } catch {
      showNotice(
        'Không thể đăng xuất các thiết bị khác. Vui lòng thử lại.',
        'error'
      )
    } finally {
      setLoggingOutOthers(false)
    }
  }

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  const changePassword = async event => {
    event.preventDefault()

    if (changingPassword) return

    setChangingPassword(true)
    setNotice('')

    try {
      await authApi.postAuthChangePassword(
        form,
        {
          headers: authHeader(),
        }
      )

      setForm({
        currentPassword: '',
        newPassword: '',
      })

      setState(previous => ({
        ...previous,
        sessions: previous.sessions.filter(
          session => session.isCurrent
        ),
      }))

      showNotice(
        'Đã đổi mật khẩu thành công và đăng xuất các thiết bị khác.',
        'success'
      )
    } catch {
      showNotice(
        'Không thể đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại.',
        'error'
      )
    } finally {
      setChangingPassword(false)
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-dvh bg-[#f6f8fc] text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/chat"
            className="flex items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <MessageCircle size={24} />
            </div>

            <div>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                ChitChat
              </span>

              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Account Center
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/chat"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              Tin nhắn
            </Link>

            <Link
              to="/friends"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              Bạn bè
            </Link>

            <Link
              to="/groups"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              Nhóm chat
            </Link>
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            loading={loggingOut}
            disabled={loggingOut}
            className="gap-2 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            {!loggingOut && <LogOut size={16} />}
            <span className="hidden sm:inline">
              Đăng xuất
            </span>
          </Button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <Link
          to="/chat"
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft size={16} />
          Quay lại tin nhắn
        </Link>

        {/* PAGE HEADING */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Badge variant="default" size="sm">
              <Sparkles size={13} />
              ChitChat Account
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Quản lý tài khoản
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Quản lý phiên đăng nhập, tăng cường bảo mật và
              tùy chỉnh trải nghiệm ChitChat của bạn.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck size={18} />
            Trung tâm bảo mật
          </div>
        </div>

        {/* NOTIFICATION */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`
              mb-6 flex items-start gap-3
              rounded-2xl border px-5 py-4
              text-sm
              ${
                noticeType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
              }
            `}
          >
            {noticeType === 'success' ? (
              <CheckCircle2 size={20} className="shrink-0" />
            ) : (
              <CircleAlert size={20} className="shrink-0" />
            )}

            <p className="min-w-0 flex-1 leading-6">
              {notice}
            </p>

            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
              className="shrink-0 opacity-60 transition hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* LEFT COLUMN */}
          <div className="min-w-0 space-y-6">
            {/* SESSIONS */}
            <Card className="rounded-3xl p-5 sm:p-7">
              <CardHeader className="mb-6">
                <SectionHeading
                  icon={Laptop}
                  title="Thiết bị đăng nhập"
                  description="Theo dõi các thiết bị đang sử dụng tài khoản ChitChat của bạn."
                />
              </CardHeader>

              <CardContent>
                {state.loading ? (
                  <PageSkeleton />
                ) : state.error ? (
                  <div
                    role="alert"
                    className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                  >
                    <CircleAlert size={20} />
                    {state.error}
                  </div>
                ) : state.sessions.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl bg-slate-50 px-5 py-12 text-center dark:bg-slate-800/40">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white text-slate-400 dark:bg-slate-800">
                      <Laptop size={30} />
                    </div>

                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Chưa có phiên đăng nhập
                    </h3>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Không tìm thấy phiên đăng nhập đang hoạt động.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {state.sessions.map(session => (
                      <SessionItem
                        key={session.id}
                        session={session}
                      />
                    ))}
                  </ul>
                )}

                {/* LOGOUT OTHER DEVICES */}
                <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:flex-row sm:items-center dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      Đăng xuất các thiết bị khác
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {otherSessionCount > 0
                        ? `Có ${otherSessionCount} phiên đăng nhập khác.`
                        : 'Không có phiên đăng nhập khác.'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={loggingOutOthers}
                    disabled={
                      state.loading ||
                      Boolean(state.error) ||
                      loggingOutOthers ||
                      otherSessionCount === 0
                    }
                    onClick={logoutOthers}
                    className="shrink-0"
                  >
                    {!loggingOutOthers && (
                      <ShieldOff size={16} />
                    )}
                    Đăng xuất thiết bị khác
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CHANGE PASSWORD */}
            <Card className="rounded-3xl p-5 sm:p-7">
              <CardHeader className="mb-6">
                <SectionHeading
                  icon={KeyRound}
                  title="Đổi mật khẩu"
                  description="Cập nhật mật khẩu để tăng cường bảo mật tài khoản."
                />
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={changePassword}
                  className="space-y-5"
                >
                  <PasswordField
                    id="current-password"
                    label="Mật khẩu hiện tại"
                    value={form.currentPassword}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        currentPassword: event.target.value,
                      }))
                    }
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />

                  <PasswordField
                    id="new-password"
                    label="Mật khẩu mới"
                    value={form.newPassword}
                    minLength={12}
                    onChange={event =>
                      setForm(previous => ({
                        ...previous,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="Nhập mật khẩu mới (ít nhất 12 ký tự)"
                    autoComplete="new-password"
                  />

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400"
                    />

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Gợi ý bảo mật
                      </h4>

                      <p className="mt-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        Sử dụng mật khẩu ít nhất 12 ký tự,
                        khó đoán và không dùng lại mật khẩu
                        của tài khoản khác.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    loading={changingPassword}
                    disabled={changingPassword}
                    className="w-full sm:w-auto"
                  >
                    {!changingPassword && (
                      <KeyRound size={17} />
                    )}

                    {changingPassword
                      ? 'Đang cập nhật...'
                      : 'Cập nhật mật khẩu'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="min-w-0 space-y-6">
            {/* SECURITY CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#202944] via-[#303b66] to-[#514dc4] p-7 text-white shadow-xl shadow-indigo-500/10">
              <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full border border-white/10 bg-white/5" />
              <div className="pointer-events-none absolute -bottom-16 right-8 size-36 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-white/15">
                  <Shield size={27} />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                  Account Security
                </span>

                <h2 className="mt-3 text-xl font-bold leading-snug">
                  Bảo vệ tài khoản của bạn
                </h2>

                <p className="mt-3 text-xs leading-6 text-indigo-100/90">
                  Kiểm tra phiên đăng nhập và quản lý mật khẩu
                  để bảo vệ tài khoản ChitChat.
                </p>

                <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs">
                  <CheckCircle2
                    size={17}
                    className="text-emerald-300"
                  />
                  Quản lý phiên đăng nhập
                </div>
              </div>
            </div>

            {/* QUICK ACCESS */}
            <Card className="rounded-3xl p-5 sm:p-6">
              <CardHeader className="mb-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2
                    size={19}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                  Truy cập nhanh
                </CardTitle>

                <CardDescription>
                  Đi đến các khu vực khác của ChitChat.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5">
                <QuickLink
                  to="/settings"
                  icon={UserRound}
                  title="Hồ sơ & quyền riêng tư"
                  description="Chỉnh sửa thông tin cá nhân"
                />

                <QuickLink
                  to="/friends"
                  icon={Users}
                  title="Bạn bè"
                  description="Danh sách bạn bè và lời mời"
                />

                <QuickLink
                  to="/chat"
                  icon={MessageSquareText}
                  title="Tin nhắn"
                  description="Quay lại cuộc trò chuyện"
                />

                <QuickLink
                  to="/groups"
                  icon={MessageCircle}
                  title="Nhóm chat"
                  description="Các cuộc trò chuyện nhóm"
                />

                <QuickLink
                  to="/notifications"
                  icon={Bell}
                  title="Thông báo"
                  description="Xem thông báo mới"
                />

                <QuickLink
                  to="/admin"
                  icon={Shield}
                  title="Admin Console"
                  description="Khu vực quản trị"
                />
              </CardContent>
            </Card>

            {/* LOGOUT CARD */}
            <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-6 dark:border-rose-500/20 dark:bg-rose-500/5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
                  <LogOut size={20} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Kết thúc phiên đăng nhập
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    Đăng xuất khỏi thiết bị này khi không
                    còn sử dụng ChitChat.
                  </p>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={loggingOut}
                    disabled={loggingOut}
                    onClick={logout}
                    className="mt-4"
                  >
                    {!loggingOut && (
                      <LogOut size={16} />
                    )}
                    Đăng xuất tài khoản
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* FOOTER */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-[11px] text-slate-400 sm:flex-row dark:border-slate-800 dark:text-slate-500">
          <span>ChitChat · Account Center</span>

          <Link
            to="/chat"
            className="inline-flex items-center gap-2 font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Trở lại ChitChat
            <ArrowRight size={15} />
          </Link>
        </footer>
      </div>
    </main>
  )
}
