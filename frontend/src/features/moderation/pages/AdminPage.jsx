
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Ban,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileClock,
  FileText,
  Gavel,
  Inbox,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
} from 'lucide-react'

import { moderationApi } from '../api/moderationApi'
import { restoreAccessToken } from '../../auth/utils/authSession'
import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'

const sections = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'reports', label: 'Báo cáo', icon: ShieldAlert },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'appeals', label: 'Kháng nghị', icon: Scale },
  { id: 'retention', label: 'Lưu trữ & Nhật ký', icon: FileClock },
]

const statusLabels = {
  Pending: 'Chờ xử lý',
  Resolved: 'Đã xử lý',
  Dismissed: 'Đã bác bỏ',
  Accepted: 'Đã chấp nhận',
  Rejected: 'Đã từ chối',
}

const statisticLabels = {
  totalUsers: 'Tổng người dùng',
  activeUsers: 'Người dùng hoạt động',
  suspendedUsers: 'Tài khoản bị đình chỉ',
  totalMessages: 'Tổng tin nhắn',
  totalGroups: 'Tổng nhóm',
  totalConversations: 'Cuộc trò chuyện',
  totalReports: 'Tổng báo cáo',
  pendingReports: 'Báo cáo chờ xử lý',
  resolvedReports: 'Báo cáo đã xử lý',
  pendingAppeals: 'Kháng nghị chờ xử lý',
  newUsers: 'Người dùng mới',
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(value) {
  if (typeof value !== 'number') return String(value ?? '—')
  return value.toLocaleString('vi-VN')
}

function StatusBadge({ status }) {
  const variants = {
    Pending: 'warning',
    Resolved: 'success',
    Accepted: 'success',
    Dismissed: 'secondary',
    Rejected: 'destructive',
  }

  return (
    <Badge variant={variants[status] || 'secondary'} size="sm">
      {statusLabels[status] || status || 'Không rõ'}
    </Badge>
  )
}

function SectionHeader({ icon: Icon, title, description, count, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={21} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            {count !== undefined && (
              <Badge variant="secondary" size="sm">
                {count}
              </Badge>
            )}
          </div>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={28} strokeWidth={1.6} />
      </div>

      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  )
}

function LoadingState() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Đang tải dữ liệu quản trị...</span>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <Skeleton className="mb-5 size-11 rounded-xl" />
            <Skeleton className="mb-3 h-7 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="mb-6 h-5 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}

function ActivityChart({ activity = [] }) {
  const maxValue = Math.max(
    1,
    ...activity.flatMap(day => [
      Number(day.newUsers) || 0,
      Number(day.messages) || 0,
    ])
  )

  return (
    <Panel>
      <SectionHeader
        icon={Activity}
        title="Hoạt động 7 ngày"
        description="Thống kê người dùng mới và tin nhắn."
      />

      <div className="p-5 sm:p-6">
        {activity.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Chưa có dữ liệu hoạt động"
            description="Biểu đồ sẽ hiển thị khi có dữ liệu thống kê."
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="size-2.5 rounded-full bg-indigo-500" />
                Tin nhắn
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="size-2.5 rounded-full bg-violet-400" />
                Người dùng mới
              </div>
            </div>

            <div className="flex h-64 items-end justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700 sm:gap-5">
              {activity.map((day, index) => {
                const messages = Number(day.messages) || 0
                const newUsers = Number(day.newUsers) || 0

                return (
                  <div
                    key={day.date || index}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="flex h-[190px] w-full items-end justify-center gap-1.5 sm:gap-3">
                      <div
                        title={`${messages} tin nhắn`}
                        className="w-full max-w-7 rounded-t-lg bg-indigo-500 transition-all duration-300 hover:bg-indigo-600"
                        style={{
                          height: `${messages === 0 ? 2 : Math.max(5, (messages / maxValue) * 100)}%`,
                        }}
                      />

                      <div
                        title={`${newUsers} người dùng mới`}
                        className="w-full max-w-7 rounded-t-lg bg-violet-400 transition-all duration-300 hover:bg-violet-500"
                        style={{
                          height: `${newUsers === 0 ? 2 : Math.max(5, (newUsers / maxValue) * 100)}%`,
                        }}
                      />
                    </div>

                    <span className="whitespace-nowrap text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
                      {new Date(day.date).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-500/10">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tin nhắn trong kỳ
                </p>
                <p className="mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                  {formatNumber(
                    activity.reduce(
                      (total, day) => total + (Number(day.messages) || 0),
                      0
                    )
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Người dùng mới
                </p>
                <p className="mt-2 text-2xl font-bold text-violet-700 dark:text-violet-400">
                  {formatNumber(
                    activity.reduce(
                      (total, day) => total + (Number(day.newUsers) || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [data, setData] = useState({
    dashboard: null,
    users: [],
    reports: [],
    appeals: [],
    audit: [],
    retention: null,
  })

  const [selected, setSelected] = useState(null)
  const [openingCase, setOpeningCase] = useState('')
  const [downloadingId, setDownloadingId] = useState('')

  const [state, setState] = useState({
    loading: true,
    busy: false,
    error: '',
    notice: '',
  })

  const auth = useCallback(
    access => ({
      headers: {
        Authorization: `Bearer ${access}`,
      },
    }),
    []
  )

  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

  const load = useCallback(async access => {
    const paths = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/reports',
      '/admin/appeals',
      '/admin/audit',
      '/admin/retention/preview',
    ]

    const [
      dashboard,
      users,
      reports,
      appeals,
      audit,
      retention,
    ] = await Promise.all(
      paths.map(path =>
        moderationApi.getUnknown(path, auth(access))
      )
    )

    setData({
      dashboard: dashboard.data,
      users: users.data || [],
      reports: reports.data || [],
      appeals: appeals.data || [],
      audit: audit.data || [],
      retention: retention.data,
    })

    setState(value => ({
      ...value,
      loading: false,
      error: '',
    }))
  }, [auth])

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

        return load(access).catch(error => {
          if (!active) return

          setState(value => ({
            ...value,
            loading: false,
            error:
              error.response?.status === 403
                ? 'Bạn không có quyền truy cập trang quản trị.'
                : 'Không thể tải dữ liệu quản trị.',
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
    }
  }, [navigate, load])

  // ====================================================
  // REFRESH
  // ====================================================

  const refresh = async () => {
    if (!token || state.busy) return

    setState(value => ({
      ...value,
      loading: true,
      error: '',
      notice: '',
    }))

    try {
      await load(token)
      setState(value => ({
        ...value,
        notice: 'Đã cập nhật dữ liệu mới nhất.',
      }))
    } catch {
      setState(value => ({
        ...value,
        loading: false,
        error: 'Không thể làm mới dữ liệu.',
      }))
    }
  }

  // ====================================================
  // ADMIN ACTIONS
  // ====================================================

  const act = async (path, body = null) => {
    if (state.busy) return

    setState(value => ({
      ...value,
      busy: true,
      error: '',
      notice: '',
    }))

    try {
      await moderationApi.postUnknown(
        path,
        body,
        auth(token)
      )

      await load(token)

      setState(value => ({
        ...value,
        notice: 'Đã lưu thay đổi thành công.',
      }))

      return true
    } catch {
      setState(value => ({
        ...value,
        error:
          'Thao tác bị từ chối hoặc dữ liệu đã thay đổi. Hãy làm mới và thử lại.',
      }))

      return false
    } finally {
      setState(value => ({
        ...value,
        busy: false,
      }))
    }
  }

  // ====================================================
  // REPORT CASE
  // ====================================================

  const openCase = async report => {
    setOpeningCase(report.id)

    try {
      const { data: value } =
        await moderationApi.getAdminReportsById(
          report.id,
          auth(token)
        )

      setSelected(value)
    } catch {
      setState(value => ({
        ...value,
        error:
          'Bạn cần tiếp nhận hồ sơ trước khi xem bằng chứng.',
      }))
    } finally {
      setOpeningCase('')
    }
  }

  const download = async evidence => {
    if (!selected || downloadingId) return

    setDownloadingId(evidence.id)

    try {
      const response =
        await moderationApi.getAdminReportsByIdEvidenceByIdFile(
          selected.report.id,
          evidence.id,
          {
            ...auth(token),
            responseType: 'blob',
          }
        )

      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')

      link.href = url
      link.download = `evidence-${evidence.id}`
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      link.remove()

      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setState(value => ({
        ...value,
        error:
          'Không thể tải bằng chứng hoặc quyền truy cập đã bị thu hồi.',
      }))
    } finally {
      setDownloadingId('')
    }
  }

  const reason = (label, path) => {
    const value = window.prompt(label)

    if (value?.trim()) {
      act(path, { reason: value.trim() })
    }
  }

  const resolveReport = async (report, status) => {
    const label =
      status === 'Resolved'
        ? 'Nhập ghi chú xử lý báo cáo'
        : 'Nhập lý do bác bỏ báo cáo'

    const note = window.prompt(label)
    if (!note?.trim()) return

    const okay = await act(
      `/admin/reports/${report.id}/resolve`,
      {
        status,
        note: note.trim(),
      }
    )

    if (okay) {
      setSelected(null)
    }
  }

  const reviewAppeal = (appeal, status) => {
    const note = window.prompt(
      status === 'Accepted'
        ? 'Nhập ghi chú chấp nhận kháng nghị'
        : 'Nhập lý do từ chối kháng nghị'
    )

    if (!note?.trim()) return

    act(
      `/admin/appeals/${appeal.id}/review`,
      {
        status,
        note: note.trim(),
      }
    )
  }

  // ====================================================
  // STATISTICS
  // ====================================================

  const statistics = data.dashboard
    ? Object.entries(data.dashboard).filter(
        ([key, value]) =>
          key !== 'activity' &&
          (typeof value === 'number' ||
            typeof value === 'string')
      )
    : []

  const statIcons = [
    Users,
    MessageCircle,
    ShieldAlert,
    Activity,
    UserCheck,
    Inbox,
    Scale,
    Shield,
  ]

  const statAccents = [
    'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  ]

  return (
    <main className="min-h-dvh bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ==================================================
          TOP BAR
      ================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/account"
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <ShieldCheck size={22} />
            </span>

            <div>
              <span className="block text-base font-extrabold tracking-tight">
                ChitChat
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Admin Console
              </span>
            </div>
          </Link>

          <Link
            to="/account"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft size={17} />
            Tài khoản
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        {/* PAGE HEADING */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="default" size="sm">
              <ShieldCheck size={13} />
              Administration
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Quản trị & Kiểm duyệt
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Theo dõi hoạt động hệ thống, xử lý báo cáo,
              quản lý người dùng và xem lịch sử kiểm duyệt.
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
            Làm mới dữ liệu
          </Button>
        </div>

        {/* FEEDBACK */}
        <div className="space-y-3">
          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">{state.error}</span>

              <button
                type="button"
                onClick={() =>
                  setState(value => ({ ...value, error: '' }))
                }
                aria-label="Đóng thông báo lỗi"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {state.notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">{state.notice}</span>

              <button
                type="button"
                onClick={() =>
                  setState(value => ({ ...value, notice: '' }))
                }
                aria-label="Đóng thông báo"
              >
                <X size={17} />
              </button>
            </div>
          )}
        </div>

        {/* LOADING */}
        {state.loading ? (
          <div className="mt-6">
            <LoadingState />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            {/* SIDEBAR NAVIGATION */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-24">
              <div className="mb-3 px-3 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Quản lý hệ thống
                </p>
              </div>

              <nav
                aria-label="Điều hướng quản trị"
                className="flex gap-1 overflow-x-auto lg:flex-col"
              >
                {sections.map(section => {
                  const Icon = section.icon
                  const active = activeSection === section.id

                  const count =
                    section.id === 'reports'
                      ? data.reports.length
                      : section.id === 'users'
                        ? data.users.length
                        : section.id === 'appeals'
                          ? data.appeals.length
                          : null

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-colors lg:w-full ${
                        active
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <span className="flex-1 whitespace-nowrap">
                        {section.label}
                      </span>

                      {count !== null && (
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] ${
                          active
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-4 hidden border-t border-slate-100 px-3 pt-4 dark:border-slate-800 lg:block">
                <div className="flex items-start gap-2">
                  <ShieldCheck
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    Các thao tác quản trị được hệ thống kiểm tra quyền truy cập.
                  </p>
                </div>
              </div>
            </aside>

            {/* ==================================================
                CONTENT
            ================================================== */}
            <div className="min-w-0 space-y-6">
              {/* OVERVIEW */}
              {activeSection === 'overview' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statistics.map(([key, value], index) => {
                      const Icon = statIcons[index % statIcons.length]

                      return (
                        <div
                          key={key}
                          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className={`mb-5 flex size-11 items-center justify-center rounded-xl ${
                            statAccents[index % statAccents.length]
                          }`}>
                            <Icon size={21} />
                          </div>

                          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {formatNumber(value)}
                          </p>

                          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {statisticLabels[key] || key}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {data.dashboard && (
                    <ActivityChart activity={data.dashboard.activity || []} />
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        id: 'reports',
                        title: 'Báo cáo vi phạm',
                        description: `${data.reports.length} báo cáo`,
                        icon: ShieldAlert,
                      },
                      {
                        id: 'users',
                        title: 'Quản lý người dùng',
                        description: `${data.users.length} tài khoản`,
                        icon: Users,
                      },
                      {
                        id: 'appeals',
                        title: 'Kháng nghị',
                        description: `${data.appeals.length} kháng nghị`,
                        icon: Scale,
                      },
                    ].map(item => {
                      const Icon = item.icon

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
                        >
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <Icon size={21} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {item.description}
                            </p>
                          </div>

                          <ChevronRight
                            size={17}
                            className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
                          />
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* REPORTS */}
              {activeSection === 'reports' && (
                <Panel>
                  <SectionHeader
                    icon={ShieldAlert}
                    title="Báo cáo vi phạm"
                    description="Tiếp nhận và xử lý các báo cáo từ người dùng."
                    count={data.reports.length}
                  />

                  {data.reports.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="Chưa có báo cáo"
                      description="Các báo cáo vi phạm sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.reports.map(report => (
                        <article
                          key={report.id}
                          className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 sm:flex-row sm:items-start sm:justify-between sm:p-6"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                              <ShieldAlert size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {report.targetType || 'Báo cáo'}
                                </h3>
                                <StatusBadge status={report.status} />
                              </div>

                              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
                                {report.reason}
                              </p>

                              <p className="mt-2 break-all text-[10px] text-slate-400">
                                ID: {report.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {report.status === 'Pending' && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={state.busy}
                                onClick={() =>
                                  act(`/admin/reports/${report.id}/claim`)
                                }
                              >
                                <Check size={15} />
                                Tiếp nhận
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={Boolean(openingCase)}
                              loading={openingCase === report.id}
                              onClick={() => openCase(report)}
                            >
                              <FileText size={15} />
                              Xem hồ sơ
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {/* USERS */}
              {activeSection === 'users' && (
                <Panel>
                  <SectionHeader
                    icon={Users}
                    title="Quản lý người dùng"
                    description="Cảnh cáo, đình chỉ và khôi phục tài khoản."
                    count={data.users.length}
                  />

                  {data.users.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Chưa có người dùng"
                      description="Không có tài khoản nào trong danh sách."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.users.map(user => (
                        <article
                          key={user.id}
                          className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 xl:flex-row xl:items-center xl:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              name={user.displayName || user.username}
                              src={user.avatarUrl}
                              size="lg"
                              className="size-12"
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {user.username}
                                </h3>

                                {user.suspended && (
                                  <Badge variant="destructive" size="sm">
                                    <Ban size={12} />
                                    Đình chỉ
                                  </Badge>
                                )}
                              </div>

                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={state.busy}
                              onClick={() =>
                                reason(
                                  'Nhập lý do cảnh cáo',
                                  `/admin/users/${user.id}/warn`
                                )
                              }
                            >
                              <ShieldAlert size={15} />
                              Cảnh cáo
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={state.busy}
                              onClick={() =>
                                reason(
                                  'Nhập lý do đình chỉ tài khoản',
                                  `/admin/users/${user.id}/suspend`
                                )
                              }
                            >
                              <UserX size={15} />
                              Đình chỉ
                            </Button>

                            {user.suspended && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={state.busy}
                                onClick={() =>
                                  reason(
                                    'Nhập lý do khôi phục tài khoản',
                                    `/admin/users/${user.id}/unsuspend`
                                  )
                                }
                              >
                                <UserCheck size={15} />
                                Khôi phục
                              </Button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {/* APPEALS */}
              {activeSection === 'appeals' && (
                <Panel>
                  <SectionHeader
                    icon={Scale}
                    title="Kháng nghị"
                    description="Xem xét các yêu cầu kháng nghị của người dùng."
                    count={data.appeals.length}
                  />

                  {data.appeals.length === 0 ? (
                    <EmptyState
                      icon={Scale}
                      title="Không có kháng nghị"
                      description="Các yêu cầu kháng nghị sẽ xuất hiện tại đây."
                    />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.appeals.map(appeal => (
                        <article
                          key={appeal.id}
                          className="p-5 sm:p-6"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                              <Scale size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Yêu cầu kháng nghị
                              </h3>
                              <p className="mt-1 break-all text-[10px] text-slate-400">
                                {appeal.id}
                              </p>
                            </div>

                            <StatusBadge status={appeal.status} />
                          </div>

                          <p className="mt-4 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
                            {appeal.reason}
                          </p>

                          {appeal.status === 'Pending' && (
                            <div className="mt-5 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={state.busy}
                                onClick={() =>
                                  reviewAppeal(appeal, 'Rejected')
                                }
                              >
                                <X size={15} />
                                Từ chối
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                disabled={state.busy}
                                onClick={() =>
                                  reviewAppeal(appeal, 'Accepted')
                                }
                              >
                                <Check size={15} />
                                Chấp nhận
                              </Button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {/* RETENTION & AUDIT */}
              {activeSection === 'retention' && (
                <>
                  <Panel>
                    <SectionHeader
                      icon={FileClock}
                      title="Chính sách lưu trữ"
                      description="Xem trước các bản ghi đủ điều kiện theo chính sách lưu trữ."
                    />

                    <div className="p-5 sm:p-6">
                      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                        <ShieldCheck
                          size={19}
                          className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                        />
                        <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                          Chế độ chỉ xem trước. Các bản ghi thuộc diện
                          lưu giữ pháp lý không được đưa vào danh sách
                          xử lý theo chính sách lưu trữ.
                        </p>
                      </div>

                      <pre className="max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-200 dark:border-slate-700">
                        {JSON.stringify(data.retention, null, 2) || 'Không có dữ liệu.'}
                      </pre>
                    </div>
                  </Panel>

                  <Panel>
                    <SectionHeader
                      icon={ClipboardList}
                      title="Nhật ký kiểm duyệt"
                      description="30 hoạt động quản trị gần nhất trong dữ liệu hiện có."
                      count={Math.min(data.audit.length, 30)}
                    />

                    {data.audit.length === 0 ? (
                      <EmptyState
                        icon={FileClock}
                        title="Chưa có nhật ký"
                        description="Các thao tác quản trị sẽ được liệt kê tại đây."
                      />
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.audit.slice(0, 30).map(item => (
                          <article
                            key={item.id}
                            className="flex items-start gap-3 p-5 sm:p-6"
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Activity size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="break-words text-xs font-bold text-slate-800 dark:text-slate-100">
                                {item.action}
                              </h3>

                              <p className="mt-1 break-all text-[11px] text-slate-500 dark:text-slate-400">
                                {item.targetType} · {item.targetId}
                              </p>

                              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                                <Clock3 size={12} />
                                {formatDate(item.createdAt)}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </Panel>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          CASE MODAL
      ================================================== */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[3px] sm:p-5"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !state.busy) {
              setSelected(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-case-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* MODAL HEADER */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                  <Gavel size={21} />
                </div>

                <div className="min-w-0">
                  <h2
                    id="admin-case-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    Chi tiết báo cáo
                  </h2>

                  <p className="mt-1 break-all text-[11px] text-slate-400">
                    {selected.report.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={state.busy}
                aria-label="Đóng hồ sơ"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold">
                    Nội dung báo cáo
                  </h3>

                  <StatusBadge status={selected.report.status} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {selected.report.reason}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Bằng chứng
                  <Badge variant="secondary" size="sm">
                    {selected.evidence?.length || 0}
                  </Badge>
                </h3>

                {!selected.evidence?.length ? (
                  <EmptyState
                    icon={FileText}
                    title="Không có bằng chứng đính kèm"
                    description="Hồ sơ không có bằng chứng tin nhắn đã được lưu lại."
                  />
                ) : (
                  <div className="space-y-3">
                    {selected.evidence.map(item => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-700 dark:text-slate-300">
                          {item.evidenceContent || 'Bằng chứng tệp đính kèm'}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CalendarDays size={13} />
                            {formatDate(item.capturedAt)}
                          </span>

                          {item.storedFileId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={Boolean(downloadingId)}
                              loading={downloadingId === item.id}
                              onClick={() => download(item)}
                            >
                              <Download size={15} />
                              Tải bằng chứng
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30 sm:px-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.busy}
                onClick={() => setSelected(null)}
              >
                Đóng
              </Button>

              {selected.report.status === 'Pending' && (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={state.busy}
                    onClick={() =>
                      resolveReport(selected.report, 'Dismissed')
                    }
                  >
                    <X size={15} />
                    Bác bỏ
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={state.busy}
                    loading={state.busy}
                    onClick={() =>
                      resolveReport(selected.report, 'Resolved')
                    }
                  >
                    <Check size={15} />
                    Xử lý
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
