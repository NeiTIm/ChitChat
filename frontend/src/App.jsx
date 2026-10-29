
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { ThemeProvider } from './shared/contexts/ThemeContext'
import { ToastProvider } from './shared/contexts/ToastContext'
import ThemeToggle from './shared/components/ThemeToggle'
import AppShell from './shared/components/AppShell'
import { systemApi } from './shared/api/systemApi'

import AuthPage from './features/auth/pages/AuthPage'
import AccountPage from './features/auth/pages/AccountPage'
import SettingsPage from './features/settings/pages/SettingsPage'
import FriendsPage from './features/friends/pages/FriendsPage'
import ChatPage from './features/chat/pages/ChatPage'
import MessageRequestsPage from './features/chat/pages/MessageRequestsPage'
import GroupsPage from './features/groups/pages/GroupsPage'
import NotificationsPage from './features/notifications/pages/NotificationsPage'
import AdminPage from './features/moderation/pages/AdminPage'
import AppealPage from './features/moderation/pages/AppealPage'

// ======================================================
// HOME PAGE COMPONENTS
// ======================================================

const features = [
  {
    icon: MessageSquareText,
    title: 'Tin nhắn cá nhân',
    description:
      'Trò chuyện trực tiếp, chia sẻ nội dung và giữ liên lạc với bạn bè.',
    color:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  {
    icon: Users,
    title: 'Nhóm trò chuyện',
    description:
      'Tạo nhóm, mời thành viên và kết nối nhiều người trong cùng không gian.',
    color:
      'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  },
  {
    icon: Bell,
    title: 'Thông báo realtime',
    description:
      'Theo dõi tin nhắn, lời mời và các cập nhật mới trong ứng dụng.',
    color:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
  {
    icon: ShieldCheck,
    title: 'Quyền riêng tư',
    description:
      'Quản lý tài khoản, các phiên đăng nhập và tùy chọn riêng tư.',
    color:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
]

function Brand({ to = '/' }) {
  return (
    <Link
      to={to}
      aria-label="ChitChat - Trang chủ"
      className="group inline-flex shrink-0 items-center gap-3"
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
        <MessageCircle size={23} strokeWidth={2.1} />
      </span>

      <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Chit
        <span className="text-indigo-600 dark:text-indigo-400">
          Chat
        </span>
      </span>
    </Link>
  )
}

function ServiceStatus({ status, onRetry }) {
  const loading = status.state === 'loading'
  const ready = status.state === 'ready'

  const Icon = loading
    ? LoaderCircle
    : ready
      ? Wifi
      : WifiOff

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex max-w-full items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${
        loading
          ? 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          : ready
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
      }`}
    >
      <Icon
        size={18}
        className={`shrink-0 ${loading ? 'animate-spin' : ''}`}
      />

      <span className="min-w-0 leading-5">
        {status.message}
      </span>

      {!ready && !loading && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-2 py-1 font-bold underline-offset-2 hover:underline"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

function ChatPreview() {
  const conversations = [
    {
      id: 1,
      name: 'Nhóm phát triển',
      letter: 'N',
      message: 'Hẹn mọi người trong nhóm nhé!',
      time: '09:42',
      selected: true,
      unread: 0,
    },
    {
      id: 2,
      name: 'Minh Anh',
      letter: 'M',
      message: 'Cảm ơn bạn nhiều!',
      time: '08:30',
      selected: false,
      unread: 2,
    },
    {
      id: 3,
      name: 'Hoàng Nam',
      letter: 'H',
      message: 'Hẹn gặp lại nhé.',
      time: 'Hôm qua',
      selected: false,
      unread: 0,
    },
  ]

  return (
    <div
      aria-label="Giao diện minh họa ứng dụng trò chuyện ChitChat"
      className="relative mx-auto w-full max-w-[590px]"
    >
      {/* DECORATIVE GLOW */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-200/60 via-violet-100/50 to-blue-100/60 blur-3xl dark:from-indigo-600/15 dark:via-violet-600/10 dark:to-blue-600/10"
      />

      {/* MOCK APPLICATION */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-indigo-950/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        {/* WINDOW HEADER */}
        <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>

          <span className="text-[11px] font-semibold text-slate-400">
            ChitChat Messenger
          </span>

          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium">Online</span>
          </div>
        </div>

        <div className="flex h-[350px] sm:h-[390px]">
          {/* PREVIEW SIDEBAR */}
          <div className="hidden w-[43%] shrink-0 border-r border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:block">
            <div className="mb-4 flex items-center justify-between px-1">
              <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                Tin nhắn
              </span>

              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <MessageSquareText size={15} />
              </span>
            </div>

            <div className="mb-4 h-8 rounded-lg bg-slate-100 px-3 py-2 text-[10px] text-slate-400 dark:bg-slate-800">
              Tìm cuộc trò chuyện...
            </div>

            <div className="space-y-1">
              {conversations.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-xl p-2 ${
                    item.selected
                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                      : ''
                  }`}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.selected
                      ? 'bg-indigo-200 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {item.letter}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-slate-800 dark:text-slate-100">
                      {item.name}
                    </p>

                    <p className="mt-1 truncate text-[9px] text-slate-400">
                      {item.message}
                    </p>
                  </div>

                  {item.unread > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white">
                      {item.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PREVIEW CHAT */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 dark:border-slate-800">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Users size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                  Nhóm phát triển
                </p>

                <p className="mt-0.5 text-[10px] text-emerald-500">
                  Đang hoạt động
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 p-2 text-slate-400 dark:bg-slate-800">
                <ChevronRight size={16} />
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-end gap-3 bg-gradient-to-b from-indigo-50/50 to-white p-4 dark:from-indigo-950/20 dark:to-slate-900">
              <div className="flex max-w-[85%] items-end gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  M
                </div>

                <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  Chào mọi người! 👋
                </div>
              </div>

              <div className="flex max-w-[85%] items-end gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  H
                </div>

                <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  Hôm nay chúng ta có cuộc họp nhé.
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-[11px] leading-5 text-white shadow-sm shadow-indigo-500/10">
                  Tuyệt vời! Mình sẽ tham gia. ✨
                </div>
              </div>

              <div className="flex justify-end pr-1">
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  09:42
                  <Check size={12} className="text-indigo-500" />
                </span>
              </div>
            </div>

            <div className="flex h-[65px] shrink-0 items-center gap-2 border-t border-slate-100 bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 min-w-0 flex-1 items-center rounded-xl bg-slate-100 px-3 text-[10px] text-slate-400 dark:bg-slate-800">
                Viết tin nhắn...
              </div>

              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Send size={16} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -right-2 flex items-center gap-2 rounded-2xl border border-white bg-white px-3 py-2.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 sm:-right-5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 size={18} />
        </span>

        <div>
          <p className="text-[11px] font-bold text-slate-800 dark:text-white">
            Kết nối mọi lúc
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400">
            Realtime messaging
          </p>
        </div>
      </div>
    </div>
  )
}

// ======================================================
// HOME PAGE
// ======================================================

function Home() {
  const [status, setStatus] = useState({
    state: 'loading',
    message: 'Đang kết nối máy chủ…',
  })

  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    systemApi
      .getHealth({ signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return

        setStatus(
          data?.status === 'ok'
            ? {
                state: 'ready',
                message: 'Máy chủ API đang hoạt động',
              }
            : {
                state: 'error',
                message: 'Máy chủ trả về trạng thái không hợp lệ',
              }
        )
      })
      .catch(error => {
        if (
          controller.signal.aborted ||
          error?.code === 'ERR_CANCELED'
        ) {
          return
        }

        setStatus({
          state: 'error',
          message:
            'Không thể kết nối API. Hãy kiểm tra backend trên cổng 5089.',
        })
      })

    return () => controller.abort()
  }, [retryKey])

  const retryHealth = () => {
    setStatus({
      state: 'loading',
      message: 'Đang kiểm tra kết nối…',
    })

    setRetryKey(previous => previous + 1)
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f7f9fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="relative z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Brand />

          <nav
            aria-label="Điều hướng tài khoản"
            className="flex items-center gap-2 sm:gap-3"
          >
            <ThemeToggle compact />

            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 sm:px-4 sm:text-sm"
            >
              Đăng nhập
            </Link>

            <Link
              to="/register"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-[0.98] sm:px-5 sm:text-sm"
            >
              Đăng ký
              <ArrowRight size={16} className="hidden sm:block" />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] max-w-full -translate-x-1/2 rounded-full bg-indigo-100/50 blur-[100px] dark:bg-indigo-500/5"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 lg:pb-32 lg:pt-24">
          {/* HERO CONTENT */}
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[11px] font-bold tracking-wide text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles size={15} />
              MỘT KHÔNG GIAN, MỌI KẾT NỐI
            </div>

            <h1
              id="hero-title"
              className="text-4xl font-extrabold leading-[1.16] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[clamp(3rem,4.2vw,4rem)]"
            >
              Kết nối gần hơn,
              <span className="mt-2 block bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">
                trò chuyện tự nhiên.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-[15px] leading-8 text-slate-500 dark:text-slate-400 sm:text-base">
              Trò chuyện cùng bạn bè, tạo nhóm, chia sẻ những
              khoảnh khắc và cập nhật tin nhắn theo thời gian
              thực. Tất cả trong một không gian đơn giản,
              hiện đại và dễ sử dụng.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25 active:translate-y-0"
              >
                Bắt đầu miễn phí
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800"
              >
                Đăng nhập
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-9 flex flex-col items-start gap-3">
              <ServiceStatus
                status={status}
                onRetry={retryHealth}
              />

              <div className="flex items-start gap-2.5 text-[11px] leading-6 text-slate-400 dark:text-slate-500">
                <ShieldCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-indigo-500"
                />
                <span>
                  Môi trường phát triển sử dụng database
                  WebChatCodexDb_Refactor riêng.
                </span>
              </div>
            </div>
          </div>

          {/* HERO PREVIEW */}
          <div className="min-w-0 lg:pl-3">
            <ChatPreview />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-slate-200/70 bg-white py-20 dark:border-slate-800 dark:bg-slate-900/50 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              Khám phá ChitChat
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Mọi điều bạn cần để kết nối
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Từ nhắn tin cá nhân đến trò chuyện nhóm, ChitChat
              mang các tính năng giao tiếp vào cùng một trải nghiệm.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(feature => {
              const Icon = feature.icon

              return (
                <article
                  key={feature.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:shadow-black/10"
                >
                  <div
                    className={`mb-6 flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${feature.color}`}
                  >
                    <Icon size={23} strokeWidth={1.8} />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-xs leading-7 text-slate-500 dark:text-slate-400">
                    {feature.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-14 text-center text-white shadow-2xl shadow-indigo-500/15 sm:px-12 sm:py-16">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-white/15">
            <MessageCircle size={29} />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bắt đầu cuộc trò chuyện của bạn
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-indigo-100">
            Tạo tài khoản để kết nối với bạn bè, tham gia nhóm
            và trải nghiệm ChitChat.
          </p>

          <Link
            to="/register"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-0"
          >
            Tạo tài khoản
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-7 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-extrabold tracking-tight">
              ChitChat
            </span>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Phiên bản phát triển tại máy cục bộ
          </p>

          <div className="flex items-center gap-5">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Đăng nhập
            </Link>

            <Link
              to="/register"
              className="text-xs font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

// ======================================================
// SCROLL TO TOP ON ROUTE CHANGE
// ======================================================

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/auth')) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [pathname])

  return null
}

// ======================================================
// APPLICATION ROUTES
// ======================================================

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Home />} />

      {/* AUTHENTICATION */}
      <Route
        path="/register"
        element={<AuthPage mode="register" />}
      />
      <Route
        path="/verify-email"
        element={<AuthPage mode="verify" />}
      />
      <Route
        path="/login"
        element={<AuthPage mode="login" />}
      />
      <Route
        path="/forgot-password"
        element={<AuthPage mode="forgot" />}
      />
      <Route
        path="/reset-password"
        element={<AuthPage mode="reset" />}
      />
      <Route
        path="/reactivate"
        element={<AuthPage mode="reactivate" />}
      />

      {/* APPEAL */}
      <Route path="/appeal" element={<AppealPage />} />

      {/* ACCOUNT */}
      <Route
        path="/account"
        element={
          <AppShell>
            <AccountPage />
          </AppShell>
        }
      />

      {/* SETTINGS */}
      <Route
        path="/settings"
        element={
          <AppShell>
            <SettingsPage />
          </AppShell>
        }
      />

      {/* FRIENDS */}
      <Route
        path="/friends"
        element={
          <AppShell>
            <FriendsPage />
          </AppShell>
        }
      />

      {/* MESSAGE REQUESTS */}
      <Route
        path="/message-requests"
        element={
          <AppShell>
            <MessageRequestsPage />
          </AppShell>
        }
      />

      {/* NOTIFICATIONS */}
      <Route
        path="/notifications"
        element={
          <AppShell>
            <NotificationsPage />
          </AppShell>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <AppShell>
            <AdminPage />
          </AppShell>
        }
      />

      {/* GROUP CHAT */}
      <Route
        path="/groups"
        element={<GroupsPage />}
      />

      {/* PRIVATE CHAT */}
      <Route
        path="/chat"
        element={<ChatPage />}
      />
      <Route
        path="/chat/:id"
        element={<ChatPage />}
      />

      {/* FALLBACK */}
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

// ======================================================
// APP
// ======================================================

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
