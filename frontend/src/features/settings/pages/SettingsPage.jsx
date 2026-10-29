
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AtSign,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  LockKeyhole,
  Mail,
  MessageCircle,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { PageSkeleton } from '../../../components/ui/skeleton'
import { usersApi } from '../../profile/api/usersApi'
import { restoreAccessToken } from '../../auth/utils/authSession'

// ======================================================
// SHARED COMPONENTS
// ======================================================

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={21} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      {children}

      {hint && (
        <p className="text-[11px] leading-5 text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

function Feedback({ message, type = 'error', onClose }) {
  if (!message) return null

  const success = type === 'success'
  const Icon = success ? CheckCircle2 : CircleAlert

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
      }`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />

      <span className="min-w-0 flex-1 break-words">
        {message}
      </span>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="shrink-0 opacity-60 transition hover:opacity-100"
        >
          <X size={17} />
        </button>
      )}
    </div>
  )
}

function PrivacyToggle({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  disabled,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon size={19} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/20 peer-disabled:opacity-50 dark:bg-slate-700 dark:peer-checked:bg-indigo-500"
      >
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

// ======================================================
// SETTINGS PAGE
// ======================================================

export default function SettingsPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState(null)
  const [profile, setProfile] = useState(null)
  const [privacy, setPrivacy] = useState(null)

  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailToken, setEmailToken] = useState('')

  const [activeSection, setActiveSection] = useState('profile')

  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: '',
    message: '',
  })

  // ====================================================
  // INITIALIZE
  // ====================================================

  useEffect(() => {
    let active = true

    restoreAccessToken()
      .then(async access => {
        if (!active) return

        if (!access) {
          navigate('/login', { replace: true })
          return
        }

        setToken(access)

        const [me, settings] = await Promise.all([
          usersApi.getUsersMe({
            headers: {
              Authorization: `Bearer ${access}`,
            },
          }),
          usersApi.getUsersMePrivacy({
            headers: {
              Authorization: `Bearer ${access}`,
            },
          }),
        ])

        if (!active) return

        setProfile(me.data)
        setPrivacy(settings.data)

        setState(value => ({
          ...value,
          loading: false,
        }))
      })
      .catch(() => {
        if (!active) return

        setState(value => ({
          ...value,
          loading: false,
          error: 'Không thể tải cài đặt tài khoản.',
        }))
      })

    return () => {
      active = false
    }
  }, [navigate])

  // ====================================================
  // API REQUEST
  // ====================================================

  const request = async (method, path, body, success) => {
    if (!token || state.saving) return null

    setState(value => ({
      ...value,
      saving: true,
      error: '',
      message: '',
    }))

    try {
      const { data } = await usersApi.request({
        method,
        url: path,
        data: body,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setState(value => ({
        ...value,
        saving: false,
        error: '',
        message: success,
      }))

      return data ?? true
    } catch (error) {
      setState(value => ({
        ...value,
        saving: false,
        error:
          error.response?.data?.code ||
          'Không thể lưu thay đổi. Vui lòng thử lại.',
        message: '',
      }))

      return null
    }
  }

  const reloadProfile = async () => {
    const { data } = await usersApi.getUsersMe({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    setProfile(data)
  }

  // ====================================================
  // PROFILE
  // ====================================================

  const saveProfile = async event => {
    event.preventDefault()

    if (!profile?.displayName?.trim()) return

    const data = await request(
      'patch',
      '/users/me',
      {
        displayName: profile.displayName.trim(),
        bio: profile.bio ?? '',
      },
      'Đã cập nhật hồ sơ thành công.'
    )

    if (data && typeof data === 'object') {
      setProfile(data)
    }
  }

  // ====================================================
  // USERNAME
  // ====================================================

  const changeUsername = async event => {
    event.preventDefault()

    if (newUsername.trim().length < 3) return

    const result = await request(
      'patch',
      '/users/me/username',
      {
        newUsername: newUsername.trim(),
      },
      'Đã thay đổi username thành công.'
    )

    if (result !== null) {
      try {
        await reloadProfile()
        setNewUsername('')
      } catch {
        setState(value => ({
          ...value,
          error:
            'Đã gửi thay đổi nhưng không thể tải lại thông tin tài khoản.',
        }))
      }
    }
  }

  // ====================================================
  // EMAIL
  // ====================================================

  const requestEmailChange = async event => {
    event.preventDefault()

    if (!newEmail.trim()) return

    await request(
      'post',
      '/users/me/email-change',
      {
        newEmail: newEmail.trim(),
      },
      'Đã gửi yêu cầu xác minh email mới. Hãy kiểm tra email hoặc hộp thư phát triển.',
    )
  }

  const confirmEmailChange = async event => {
    event.preventDefault()

    if (!emailToken.trim()) return

    const result = await request(
      'post',
      '/users/me/confirm-email-change',
      {
        token: emailToken.trim(),
      },
      'Đã xác minh và cập nhật email thành công.'
    )

    if (result !== null) {
      try {
        await reloadProfile()
        setEmailToken('')
        setNewEmail('')
      } catch {
        setState(value => ({
          ...value,
          error:
            'Đã xác minh email nhưng không thể tải lại thông tin tài khoản.',
        }))
      }
    }
  }

  // ====================================================
  // PRIVACY
  // ====================================================

  const updatePrivacy = (key, value) => {
    setPrivacy(previous => ({
      ...previous,
      [key]: value,
    }))
  }

  const savePrivacy = async event => {
    event.preventDefault()

    if (!privacy) return

    const result = await request(
      'patch',
      '/users/me/privacy',
      privacy,
      'Đã cập nhật quyền riêng tư thành công.'
    )

    if (result && typeof result === 'object') {
      setPrivacy(result)
    }
  }

  // ====================================================
  // NAVIGATION
  // ====================================================

  const sections = [
    {
      id: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: UserRound,
    },
    {
      id: 'username',
      label: 'Tên đăng nhập',
      icon: AtSign,
    },
    {
      id: 'email',
      label: 'Địa chỉ email',
      icon: Mail,
    },
    {
      id: 'privacy',
      label: 'Quyền riêng tư',
      icon: ShieldCheck,
    },
  ]

  const goToSection = id => {
    setActiveSection(id)

    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/account"
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
            to="/account"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Tài khoản
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* PAGE TITLE */}
        <div className="mb-8">
          <Badge variant="default" size="sm">
            <Settings2 size={13} />
            Account Settings
          </Badge>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Cài đặt tài khoản
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            Cá nhân hóa hồ sơ, quản lý thông tin tài khoản và
            kiểm soát quyền riêng tư trên ChitChat.
          </p>
        </div>

        {state.loading ? (
          <PageSkeleton />
        ) : !profile || !privacy ? (
          <Feedback
            message={
              state.error ||
              'Không thể tải thông tin tài khoản. Vui lòng tải lại trang.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* SIDEBAR */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              {/* USER SUMMARY */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={profile.displayName || profile.username}
                    src={profile.avatarUrl}
                    size="lg"
                    className="size-14"
                  />

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {profile.displayName || profile.username}
                    </h2>

                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      @{profile.username}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Mail size={15} />
                    <span className="min-w-0 truncate">
                      {profile.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION NAVIGATION */}
              <nav
                aria-label="Điều hướng cài đặt"
                className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Tùy chọn tài khoản
                </p>

                <div className="space-y-1">
                  {sections.map(section => {
                    const Icon = section.icon
                    const active = activeSection === section.id

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => goToSection(section.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.8} />

                        <span className="min-w-0 flex-1">
                          {section.label}
                        </span>

                        {active && (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </nav>
            </aside>

            {/* CONTENT */}
            <div className="min-w-0 space-y-6">
              {/* FEEDBACK */}
              {state.error && (
                <Feedback
                  message={state.error}
                  onClose={() =>
                    setState(value => ({
                      ...value,
                      error: '',
                    }))
                  }
                />
              )}

              {state.message && (
                <Feedback
                  message={state.message}
                  type="success"
                  onClose={() =>
                    setState(value => ({
                      ...value,
                      message: '',
                    }))
                  }
                />
              )}

              {/* ==========================================
                  PROFILE
              ========================================== */}
              <SettingsSection
                id="profile"
                icon={UserRound}
                title="Hồ sơ cá nhân"
                description="Cập nhật thông tin hiển thị với những người dùng khác."
              >
                <form onSubmit={saveProfile} className="space-y-5">
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <Avatar
                      name={profile.displayName || profile.username}
                      src={profile.avatarUrl}
                      size="2xl"
                      className="size-16"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {profile.displayName || 'Người dùng'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        @{profile.username}
                      </p>
                    </div>
                  </div>

                  <Field
                    id="profile-email"
                    label="Email hiện tại"
                    hint="Để đổi email, sử dụng mục Địa chỉ email bên dưới."
                  >
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email || ''}
                      disabled
                      className="h-11 bg-slate-50 dark:bg-slate-800/50"
                    />
                  </Field>

                  <Field
                    id="profile-display-name"
                    label="Tên hiển thị"
                    hint="Tối đa 100 ký tự."
                  >
                    <Input
                      id="profile-display-name"
                      required
                      maxLength={100}
                      value={profile.displayName || ''}
                      onChange={event =>
                        setProfile(previous => ({
                          ...previous,
                          displayName: event.target.value,
                        }))
                      }
                      disabled={state.saving}
                      placeholder="Nhập tên hiển thị..."
                      className="h-11"
                    />
                  </Field>

                  <Field
                    id="profile-bio"
                    label="Giới thiệu bản thân"
                  >
                    <textarea
                      id="profile-bio"
                      maxLength={500}
                      rows={4}
                      value={profile.bio ?? ''}
                      onChange={event =>
                        setProfile(previous => ({
                          ...previous,
                          bio: event.target.value,
                        }))
                      }
                      disabled={state.saving}
                      placeholder="Viết một vài dòng giới thiệu về bạn..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />

                    <p className="text-right text-[11px] tabular-nums text-slate-400">
                      {(profile.bio || '').length}/500
                    </p>
                  </Field>

                  <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={
                        state.saving ||
                        !profile.displayName?.trim()
                      }
                      loading={state.saving}
                    >
                      {!state.saving && <Save size={16} />}
                      Lưu hồ sơ
                    </Button>
                  </div>
                </form>
              </SettingsSection>

              {/* ==========================================
                  USERNAME
              ========================================== */}
              <SettingsSection
                id="username"
                icon={AtSign}
                title="Tên đăng nhập"
                description="Thay đổi username dùng để người khác tìm kiếm bạn."
              >
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <Clock3
                    size={19}
                    className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                  />

                  <div>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Giới hạn thay đổi username
                    </p>

                    <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                      Bạn chỉ có thể đổi username một lần trong mỗi 30 ngày.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={changeUsername}
                  className="space-y-5"
                >
                  <Field
                    id="current-username"
                    label="Username hiện tại"
                  >
                    <div className="relative">
                      <AtSign
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="current-username"
                        value={profile.username || ''}
                        disabled
                        className="h-11 bg-slate-50 pl-10 dark:bg-slate-800/50"
                      />
                    </div>
                  </Field>

                  <Field
                    id="new-username"
                    label="Username mới"
                    hint="Từ 3 đến 50 ký tự."
                  >
                    <div className="relative">
                      <AtSign
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="new-username"
                        required
                        minLength={3}
                        maxLength={50}
                        autoComplete="off"
                        value={newUsername}
                        onChange={event =>
                          setNewUsername(event.target.value)
                        }
                        disabled={state.saving}
                        placeholder="Username mới..."
                        className="h-11 pl-10"
                      />
                    </div>
                  </Field>

                  <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={
                        state.saving ||
                        newUsername.trim().length < 3 ||
                        newUsername.trim() === profile.username
                      }
                      loading={state.saving}
                    >
                      {!state.saving && <Check size={16} />}
                      Đổi username
                    </Button>
                  </div>
                </form>
              </SettingsSection>

              {/* ==========================================
                  EMAIL
              ========================================== */}
              <SettingsSection
                id="email"
                icon={Mail}
                title="Địa chỉ email"
                description="Thay đổi email đăng nhập và xác minh địa chỉ mới."
              >
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />

                  <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                    Email mới chỉ có hiệu lực sau khi bạn hoàn tất
                    bước xác minh bằng token.
                  </p>
                </div>

                {/* REQUEST EMAIL CHANGE */}
                <form
                  onSubmit={requestEmailChange}
                  className="space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Bước 1: Yêu cầu đổi email
                  </h3>

                  <Field
                    id="new-email"
                    label="Email mới"
                  >
                    <div className="relative">
                      <Mail
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="new-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={newEmail}
                        onChange={event =>
                          setNewEmail(event.target.value)
                        }
                        disabled={state.saving}
                        placeholder="example@email.com"
                        className="h-11 pl-10"
                      />
                    </div>
                  </Field>

                  <Button
                    type="submit"
                    variant="outline"
                    disabled={state.saving || !newEmail.trim()}
                    loading={state.saving}
                  >
                    {!state.saving && <Mail size={16} />}
                    Gửi yêu cầu xác minh
                  </Button>
                </form>

                <div className="my-7 border-t border-dashed border-slate-200 dark:border-slate-700" />

                {/* CONFIRM EMAIL CHANGE */}
                <form
                  onSubmit={confirmEmailChange}
                  className="space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Bước 2: Xác minh email mới
                  </h3>

                  <Field
                    id="email-token"
                    label="Token xác minh"
                    hint="Nhập token xác minh được cung cấp trong email hoặc hộp thư phát triển."
                  >
                    <div className="relative">
                      <Fingerprint
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="email-token"
                        required
                        autoComplete="off"
                        value={emailToken}
                        onChange={event =>
                          setEmailToken(event.target.value)
                        }
                        disabled={state.saving}
                        placeholder="Nhập token xác minh..."
                        className="h-11 pl-10"
                      />
                    </div>
                  </Field>

                  <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={state.saving || !emailToken.trim()}
                      loading={state.saving}
                    >
                      {!state.saving && <ShieldCheck size={16} />}
                      Xác minh email
                    </Button>
                  </div>
                </form>
              </SettingsSection>

              {/* ==========================================
                  PRIVACY
              ========================================== */}
              <SettingsSection
                id="privacy"
                icon={LockKeyhole}
                title="Quyền riêng tư"
                description="Kiểm soát trạng thái hoạt động và cách người khác liên hệ với bạn."
              >
                <form
                  onSubmit={savePrivacy}
                  className="space-y-5"
                >
                  <div className="space-y-3">
                    <PrivacyToggle
                      title="Hiển thị trạng thái online"
                      description="Cho phép người khác biết khi bạn đang hoạt động."
                      icon={Globe}
                      checked={privacy.showOnline}
                      onChange={value =>
                        updatePrivacy('showOnline', value)
                      }
                      disabled={state.saving}
                    />

                    <PrivacyToggle
                      title="Hiển thị lần hoạt động cuối"
                      description="Cho phép người khác xem thời điểm bạn hoạt động gần nhất."
                      icon={Clock3}
                      checked={privacy.showLastSeen}
                      onChange={value =>
                        updatePrivacy('showLastSeen', value)
                      }
                      disabled={state.saving}
                    />

                    <PrivacyToggle
                      title="Nhận tin nhắn từ người lạ"
                      description="Cho phép người chưa kết bạn gửi yêu cầu tin nhắn."
                      icon={MessageCircle}
                      checked={privacy.allowStrangerMessages}
                      onChange={value =>
                        updatePrivacy('allowStrangerMessages', value)
                      }
                      disabled={state.saving}
                    />

                    <PrivacyToggle
                      title="Nhận lời mời tham gia nhóm"
                      description="Cho phép người khác gửi lời mời tham gia nhóm chat."
                      icon={Users}
                      checked={privacy.allowGroupInvites}
                      onChange={value =>
                        updatePrivacy('allowGroupInvites', value)
                      }
                      disabled={state.saving}
                    />
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={state.saving}
                      loading={state.saving}
                    >
                      {!state.saving && <Save size={16} />}
                      Lưu quyền riêng tư
                    </Button>
                  </div>
                </form>
              </SettingsSection>

              {/* FOOTNOTE */}
              <div className="flex items-start gap-3 rounded-2xl px-2 py-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-indigo-500"
                />

                <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                  Các thay đổi được gửi đến hệ thống ChitChat và
                  áp dụng theo quyền truy cập, chính sách bảo mật
                  hiện hành.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
