
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { moderationApi } from '../api/moderationApi'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'

const statusConfig = {
  Pending: {
    label: 'Đang chờ xem xét',
    variant: 'warning',
    icon: Clock3,
  },
  Accepted: {
    label: 'Đã chấp nhận',
    variant: 'success',
    icon: CheckCircle2,
  },
  Rejected: {
    label: 'Đã từ chối',
    variant: 'destructive',
    icon: X,
  },
}

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

function Feedback({ message, type = 'error', onClose }) {
  if (!message) return null

  const success = type === 'success'
  const Icon = success ? CheckCircle2 : AlertCircle

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-xs leading-6 ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
      }`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />

      <span className="min-w-0 flex-1">{message}</span>

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

function AppealCard({ appeal }) {
  const config = statusConfig[appeal.status] || {
    label: appeal.status || 'Không rõ',
    variant: 'secondary',
    icon: FileText,
  }

  const StatusIcon = config.icon

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-indigo-500/30 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Scale size={19} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Yêu cầu kháng nghị
            </h3>

            {appeal.createdAt && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <CalendarDays size={12} />
                {formatDate(appeal.createdAt)}
              </p>
            )}
          </div>
        </div>

        <Badge variant={config.variant} size="sm">
          <StatusIcon size={13} />
          {config.label}
        </Badge>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Nội dung kháng nghị
        </p>

        <p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-slate-600 dark:text-slate-300">
          {appeal.reason}
        </p>
      </div>

      {appeal.reviewNote && (
        <div className="mt-4 rounded-xl border-l-[3px] border-indigo-400 bg-indigo-50/60 px-4 py-3 dark:bg-indigo-500/10">
          <p className="mb-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            Phản hồi từ quản trị viên
          </p>

          <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
            {appeal.reviewNote}
          </p>
        </div>
      )}
    </article>
  )
}

export default function AppealPage() {
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    reason: '',
  })

  const [token, setToken] = useState('')
  const [appeals, setAppeals] = useState([])
  const [showPassword, setShowPassword] = useState(false)

  const [state, setState] = useState({
    busy: false,
    error: '',
    notice: '',
  })

  const auth = access => ({
    headers: {
      Authorization: `Bearer ${access}`,
    },
  })

  // ====================================================
  // AUTHENTICATE LIMITED APPEAL SESSION
  // ====================================================

  const login = async event => {
    event.preventDefault()

    if (
      !form.identifier.trim() ||
      !form.password ||
      state.busy
    ) {
      return
    }

    setState({
      busy: true,
      error: '',
      notice: '',
    })

    try {
      const response =
        await moderationApi.postAppealsAuthenticate({
          identifier: form.identifier.trim(),
          password: form.password,
        })

      const access = response.data.accessToken

      const history = await moderationApi.getAppealsMe(
        auth(access)
      )

      setToken(access)
      setAppeals(Array.isArray(history.data) ? history.data : [])

      setForm(value => ({
        ...value,
        password: '',
      }))

      setState({
        busy: false,
        error: '',
        notice:
          'Xác thực thành công. Phiên kháng nghị có hiệu lực trong 10 phút.',
      })
    } catch {
      setState({
        busy: false,
        error:
          'Không thể xác thực. Vui lòng kiểm tra tài khoản, mật khẩu và trạng thái đình chỉ.',
        notice: '',
      })
    }
  }

  // ====================================================
  // SUBMIT APPEAL
  // ====================================================

  const submit = async event => {
    event.preventDefault()

    const reason = form.reason.trim()

    if (
      reason.length < 10 ||
      reason.length > 1000 ||
      !token ||
      state.busy
    ) {
      return
    }

    setState({
      busy: true,
      error: '',
      notice: '',
    })

    try {
      await moderationApi.postAppeals(
        { reason },
        auth(token)
      )

      const history = await moderationApi.getAppealsMe(
        auth(token)
      )

      setAppeals(Array.isArray(history.data) ? history.data : [])

      setForm(value => ({
        ...value,
        reason: '',
      }))

      setState({
        busy: false,
        error: '',
        notice: 'Đã gửi yêu cầu kháng nghị thành công.',
      })
    } catch {
      setState({
        busy: false,
        error:
          'Không thể gửi kháng nghị. Có thể bạn đã có yêu cầu đang chờ xử lý hoặc phiên xác thực đã hết hạn.',
        notice: '',
      })
    }
  }

  const closeSession = () => {
    setToken('')
    setAppeals([])

    setForm({
      identifier: '',
      password: '',
      reason: '',
    })

    setState({
      busy: false,
      error: '',
      notice: '',
    })
  }

  const hasPendingAppeal = appeals.some(
    appeal => appeal.status === 'Pending'
  )

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/login"
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <ShieldCheck size={22} />
            </span>

            <span className="text-lg font-extrabold tracking-tight">
              ChitChat
            </span>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Đăng nhập
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        {/* PAGE HEADING */}
        <div className="mb-9 text-center">
          <div className="mb-5 inline-flex size-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Scale size={30} strokeWidth={1.7} />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Kháng nghị tài khoản
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            Nếu tài khoản bị đình chỉ, bạn có thể gửi yêu cầu
            để quản trị viên xem xét lại quyết định.
          </p>
        </div>

        <div className={`mx-auto grid items-start gap-6 ${
          token
            ? 'max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
            : 'max-w-lg'
        }`}>
          {/* MAIN FORM */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {token ? (
                    <FileText size={21} />
                  ) : (
                    <LockKeyhole size={21} />
                  )}
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {token
                      ? 'Gửi yêu cầu xem xét'
                      : 'Xác thực tài khoản'}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {token
                      ? 'Mô tả lý do bạn muốn kháng nghị.'
                      : 'Đăng nhập bằng tài khoản bị đình chỉ.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
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

              {state.notice && (
                <Feedback
                  message={state.notice}
                  type="success"
                  onClose={() =>
                    setState(value => ({
                      ...value,
                      notice: '',
                    }))
                  }
                />
              )}

              {/* LOGIN */}
              {!token ? (
                <form
                  onSubmit={login}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="appeal-identifier"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Email hoặc tên đăng nhập
                    </label>

                    <div className="relative">
                      <UserRound
                        size={18}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="appeal-identifier"
                        required
                        autoComplete="username"
                        value={form.identifier}
                        onChange={event =>
                          setForm(value => ({
                            ...value,
                            identifier: event.target.value,
                          }))
                        }
                        placeholder="Nhập email hoặc username"
                        className="h-12 pl-11"
                        disabled={state.busy}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="appeal-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Mật khẩu
                    </label>

                    <div className="relative">
                      <KeyRound
                        size={18}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="appeal-password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={form.password}
                        onChange={event =>
                          setForm(value => ({
                            ...value,
                            password: event.target.value,
                          }))
                        }
                        placeholder="Nhập mật khẩu"
                        className="h-12 pl-11 pr-11"
                        disabled={state.busy}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(value => !value)
                        }
                        aria-label={
                          showPassword
                            ? 'Ẩn mật khẩu'
                            : 'Hiện mật khẩu'
                        }
                        className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    disabled={
                      state.busy ||
                      !form.identifier.trim() ||
                      !form.password
                    }
                    loading={state.busy}
                  >
                    {!state.busy && <LogIn size={18} />}
                    {state.busy
                      ? 'Đang xác thực...'
                      : 'Xác thực để kháng nghị'}
                    {!state.busy && <ArrowRight size={17} />}
                  </Button>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck
                        size={18}
                        className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                      />

                      <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                        Sau khi xác thực thành công, bạn sẽ có
                        phiên giới hạn 10 phút để gửi và xem
                        kháng nghị.
                      </p>
                    </div>
                  </div>
                </form>
              ) : (
                /* APPEAL FORM */
                <form
                  onSubmit={submit}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={16} />
                      Đã xác thực
                    </span>

                    <button
                      type="button"
                      onClick={closeSession}
                      disabled={state.busy}
                      className="text-xs font-semibold text-slate-500 transition hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-rose-400"
                    >
                      Thoát phiên
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="appeal-reason"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Lý do kháng nghị
                      <span className="ml-1 text-rose-500">*</span>
                    </label>

                    <textarea
                      id="appeal-reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={7}
                      value={form.reason}
                      onChange={event =>
                        setForm(value => ({
                          ...value,
                          reason: event.target.value,
                        }))
                      }
                      disabled={state.busy || hasPendingAppeal}
                      placeholder="Giải thích lý do bạn cho rằng tài khoản cần được xem xét lại..."
                      className="min-h-44 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400">
                        Tối thiểu 10 ký tự
                      </p>

                      <span className="text-[11px] tabular-nums text-slate-400">
                        {form.reason.length}/1000
                      </span>
                    </div>
                  </div>

                  {hasPendingAppeal && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <Clock3
                        size={18}
                        className="mt-0.5 shrink-0"
                      />
                      <span>
                        Bạn đã có một kháng nghị đang chờ xem xét.
                        Vui lòng chờ kết quả trước khi gửi yêu cầu mới.
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    disabled={
                      state.busy ||
                      hasPendingAppeal ||
                      form.reason.trim().length < 10
                    }
                    loading={state.busy}
                  >
                    {!state.busy && <Send size={17} />}
                    {state.busy
                      ? 'Đang gửi...'
                      : 'Gửi kháng nghị'}
                  </Button>
                </form>
              )}
            </div>
          </section>

          {/* APPEAL HISTORY */}
          {token && (
            <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold">
                    Lịch sử kháng nghị
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Theo dõi trạng thái các yêu cầu đã gửi.
                  </p>
                </div>

                <Badge variant="secondary" size="sm">
                  {appeals.length}
                </Badge>
              </div>

              <div className="max-h-[620px] space-y-3 overflow-y-auto p-5">
                {appeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <FileText size={28} strokeWidth={1.6} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Chưa có kháng nghị
                    </h3>

                    <p className="mt-2 max-w-xs text-xs leading-6 text-slate-500 dark:text-slate-400">
                      Các yêu cầu và kết quả xem xét sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  appeals.map(item => (
                    <AppealCard
                      key={item.id}
                      appeal={item}
                    />
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        {/* FOOTNOTE */}
        <div className="mx-auto mt-8 max-w-xl text-center">
          <p className="text-xs leading-6 text-slate-400 dark:text-slate-500">
            Việc chấp nhận kháng nghị không đồng nghĩa tài khoản
            được tự động khôi phục. Quyết định khôi phục quyền
            truy cập được thực hiện riêng bởi quản trị viên.
          </p>
        </div>
      </div>
    </main>
  )
}
