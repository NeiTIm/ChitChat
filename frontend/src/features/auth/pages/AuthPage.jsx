
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'

import ThemeToggle from '../../../shared/components/ThemeToggle'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { authApi } from '../api/authApi'
import { setAccessToken } from '../utils/authSession'

// ======================================================
// PAGE CONFIGURATION
// ======================================================

const pageConfig = {
  login: {
    title: 'Chào mừng trở lại',
    description: 'Đăng nhập để tiếp tục kết nối với bạn bè.',
    button: 'Đăng nhập',
    icon: LockKeyhole,
  },
  register: {
    title: 'Tạo tài khoản',
    description: 'Tạo tài khoản ChitChat và bắt đầu kết nối.',
    button: 'Tạo tài khoản',
    icon: UserRound,
  },
  verify: {
    title: 'Xác minh email',
    description: 'Nhập token được gửi đến email để kích hoạt tài khoản.',
    button: 'Xác minh email',
    icon: Mail,
  },
  forgot: {
    title: 'Quên mật khẩu?',
    description: 'Nhập email của bạn để yêu cầu đặt lại mật khẩu.',
    button: 'Gửi yêu cầu',
    icon: KeyRound,
  },
  reset: {
    title: 'Đặt lại mật khẩu',
    description: 'Tạo mật khẩu mới để bảo vệ tài khoản của bạn.',
    button: 'Đổi mật khẩu',
    icon: ShieldCheck,
  },
  reactivate: {
    title: 'Kích hoạt lại tài khoản',
    description: 'Đăng nhập để kích hoạt lại tài khoản đã tạm ngừng.',
    button: 'Kích hoạt tài khoản',
    icon: ShieldCheck,
  },
}

// ======================================================
// FORM COMPONENTS
// ======================================================

function FormField({
  id,
  label,
  type = 'text',
  icon: Icon = Mail,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  maxLength,
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <Icon
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <Input
          id={id}
          type={type}
          required
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          className="h-12 rounded-xl pl-11 pr-4"
        />
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  minLength,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder="Nhập mật khẩu"
          className="h-12 rounded-xl pl-11 pr-12"
        />

        <button
          type="button"
          onClick={() => setVisible(previous => !previous)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  )
}

// ======================================================
// LEFT SHOWCASE
// ======================================================

function AuthShowcase() {
  return (
    <aside className="relative hidden min-h-dvh flex-col overflow-hidden bg-[#19233d] p-10 text-white lg:flex xl:p-14">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-28 top-1/3 size-[420px] rounded-full bg-indigo-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-[440px] rounded-full bg-violet-500/20 blur-[110px]" />

      <div className="pointer-events-none absolute right-10 top-24 size-48 rounded-full border border-white/10" />

      <div className="pointer-events-none absolute -bottom-20 left-20 size-64 rounded-full border border-white/10" />

      {/* Logo */}
      <Link
        to="/"
        className="relative z-10 flex w-fit items-center gap-3"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-indigo-950/30">
          <MessageCircle size={26} />
        </div>

        <span className="text-2xl font-extrabold tracking-tight">
          ChitChat
        </span>
      </Link>

      {/* Main content */}
      <div className="relative z-10 my-auto max-w-xl py-16">
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-200 backdrop-blur-sm">
            <Sparkles size={15} />
            Connect · Share · Together
          </span>
        </div>

        <h2 className="text-4xl font-extrabold leading-[1.18] tracking-tight xl:text-5xl">
          Những cuộc trò chuyện
          <span className="mt-2 block bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
            ý nghĩa bắt đầu ở đây.
          </span>
        </h2>

        <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
          Kết nối với bạn bè, chia sẻ những khoảnh khắc
          và trò chuyện trong một không gian hiện đại,
          thân thiện và đầy cảm hứng.
        </p>

        {/* Feature cards */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-300">
              <Zap size={22} />
            </div>

            <h3 className="text-sm font-bold">
              Realtime Chat
            </h3>

            <p className="mt-2 text-xs leading-6 text-slate-400">
              Tin nhắn và trạng thái được cập nhật tức thì.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
              <Users size={22} />
            </div>

            <h3 className="text-sm font-bold">
              Kết nối bạn bè
            </h3>

            <p className="mt-2 text-xs leading-6 text-slate-400">
              Trò chuyện riêng tư và kết nối cộng đồng.
            </p>
          </div>
        </div>

        <div className="mt-9 flex items-center gap-2 text-xs text-indigo-200">
          <CheckCircle2 size={17} className="text-emerald-400" />
          Trải nghiệm mượt mà trên mọi thiết bị
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 text-xs text-slate-400">
        © ChitChat · Your space to connect
      </p>
    </aside>
  )
}

// ======================================================
// MAIN AUTH PAGE
// ======================================================

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    token: '',
  })

  const [state, setState] = useState({
    loading: false,
    error: '',
    message: '',
  })

  const config = pageConfig[mode] || pageConfig.login
  const PageIcon = config.icon

  const update = key => event => {
    const value = event.target.value

    setForm(previous => ({
      ...previous,
      [key]: value,
    }))
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  const submit = async event => {
    event.preventDefault()

    if (state.loading) return

    setState({
      loading: true,
      error: '',
      message: '',
    })

    try {
      let message = ''

      if (mode === 'register') {
        await authApi.postAuthRegister({
          email: form.email,
          username: form.username,
          password: form.password,
        })

        message =
          'Tài khoản đã tạo. Mở thư xác minh trong backend/WebChat.Api/private-uploads/dev-mail rồi nhập token.'
      } else if (mode === 'verify') {
        await authApi.postAuthVerifyEmail({
          token: form.token,
        })

        message =
          'Email đã xác minh. Bạn có thể đăng nhập.'
      } else if (mode === 'forgot') {
        await authApi.postAuthForgotPassword({
          email: form.email,
        })

        message =
          'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được chuẩn bị.'
      } else if (mode === 'reset') {
        await authApi.postAuthResetPassword({
          token: form.token,
          newPassword: form.password,
        })

        message =
          'Mật khẩu đã thay đổi. Hãy đăng nhập lại.'
      } else if (mode === 'reactivate') {
        await authApi.postAuthReactivate({
          identifier: form.email,
          password: form.password,
        })

        message =
          'Tài khoản đã được kích hoạt lại. Hãy đăng nhập.'
      } else {
        const { data } = await authApi.postAuthLogin({
          identifier: form.email,
          password: form.password,
          deviceName: 'Web browser',
        })

        setAccessToken(data.accessToken)
        navigate('/account')
        return
      }

      setState({
        loading: false,
        error: '',
        message,
      })
    } catch (error) {
      const code = error.response?.data?.code

      const errorMessage =
        code === 'INVALID_CREDENTIALS_OR_ACCOUNT_STATE'
          ? 'Thông tin đăng nhập không đúng hoặc tài khoản chưa thể đăng nhập.'
          : code === 'INVALID_TOKEN'
            ? 'Token xác minh không hợp lệ hoặc đã hết hạn.'
            : 'Yêu cầu thất bại. Vui lòng kiểm tra thông tin và thử lại.'

      setState({
        loading: false,
        error: errorMessage,
        message: '',
      })
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:grid-cols-2">
      <AuthShowcase />

      {/* RIGHT AUTH SECTION */}
      <section className="relative flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        {/* Topbar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Trang chủ
          </Link>

          <ThemeToggle compact />
        </div>

        {/* Main form container */}
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
          {/* Mobile logo */}
          <Link
            to="/"
            className="mb-9 flex items-center gap-3 lg:hidden"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <MessageCircle size={23} />
            </div>

            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              ChitChat
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <PageIcon size={27} strokeWidth={1.8} />
            </div>

            <Badge
              variant="default"
              size="sm"
              className="mb-4 uppercase tracking-widest"
            >
              ChitChat Account
            </Badge>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {config.title}
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              {config.description}
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={submit}
            className="space-y-5"
          >
            {/* Token */}
            {(mode === 'verify' || mode === 'reset') ? (
              <FormField
                id="auth-token"
                label={
                  mode === 'verify'
                    ? 'Token xác minh'
                    : 'Token đặt lại mật khẩu'
                }
                icon={KeyRound}
                value={form.token}
                onChange={update('token')}
                placeholder="Nhập token của bạn"
                autoComplete="off"
              />
            ) : (
              <>
                {/* Email / Username */}
                <FormField
                  id="auth-identifier"
                  label={
                    mode === 'login' || mode === 'reactivate'
                      ? 'Email hoặc tên đăng nhập'
                      : 'Địa chỉ email'
                  }
                  type={
                    mode === 'login' || mode === 'reactivate'
                      ? 'text'
                      : 'email'
                  }
                  icon={Mail}
                  value={form.email}
                  onChange={update('email')}
                  placeholder={
                    mode === 'login' || mode === 'reactivate'
                      ? 'Nhập email hoặc username'
                      : 'name@example.com'
                  }
                  autoComplete="username"
                />

                {/* Username registration */}
                {mode === 'register' && (
                  <FormField
                    id="auth-username"
                    label="Tên đăng nhập"
                    icon={UserRound}
                    value={form.username}
                    onChange={update('username')}
                    placeholder="Nhập username"
                    minLength={3}
                    maxLength={50}
                    autoComplete="username"
                  />
                )}
              </>
            )}

            {/* Password */}
            {mode !== 'verify' && mode !== 'forgot' && (
              <PasswordField
                id="auth-password"
                label={
                  mode === 'reset'
                    ? 'Mật khẩu mới'
                    : 'Mật khẩu'
                }
                value={form.password}
                onChange={update('password')}
                minLength={
                  mode === 'register' || mode === 'reset'
                    ? 12
                    : undefined
                }
                autoComplete={
                  mode === 'register' || mode === 'reset'
                    ? 'new-password'
                    : 'current-password'
                }
              />
            )}

            {/* Forgot password */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            {/* Error */}
            {state.error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <CircleAlert
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>{state.error}</span>
              </div>
            )}

            {/* Success */}
            {state.message && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>{state.message}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              loading={state.loading}
              disabled={state.loading}
              fullWidth
              size="lg"
              className="mt-2 h-12 rounded-xl"
            >
              {state.loading
                ? 'Đang xử lý...'
                : config.button}

              {!state.loading && (
                <ArrowRight size={18} />
              )}
            </Button>
          </form>

          {/* MAIN AUTH NAVIGATION */}
          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
            {mode === 'login' ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Chưa có tài khoản?{' '}
                <Link
                  to="/register"
                  className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Đăng ký ngay
                </Link>
              </p>
            ) : mode === 'register' ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Đã có tài khoản?{' '}
                <Link
                  to="/login"
                  className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Đăng nhập
                </Link>
              </p>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
              >
                <ArrowLeft size={16} />
                Quay lại đăng nhập
              </Link>
            )}
          </div>

          {/* SECONDARY LINKS */}
          <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-medium text-slate-400 dark:text-slate-500">
            {mode !== 'verify' && (
              <Link
                to="/verify-email"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Xác minh email
              </Link>
            )}

            {mode !== 'forgot' && mode !== 'login' && (
              <Link
                to="/forgot-password"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Quên mật khẩu
              </Link>
            )}

            {mode !== 'reactivate' && (
              <Link
                to="/reactivate"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Kích hoạt lại
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-2 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck size={15} />
          ChitChat · Bảo vệ kết nối của bạn
        </footer>
      </section>
    </main>
  )
}
