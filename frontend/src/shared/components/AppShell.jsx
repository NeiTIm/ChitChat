
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Menu,
  MessageCircle,
  MessageSquareText,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/chat', icon: MessageSquareText, label: 'Tin nhắn' },
  { to: '/friends', icon: Users, label: 'Bạn bè' },
  { to: '/groups', icon: MessageCircle, label: 'Nhóm chat' },
  { to: '/notifications', icon: Bell, label: 'Thông báo' },
  { to: '/settings', icon: UserRound, label: 'Hồ sơ' },
  { to: '/account', icon: Settings, label: 'Tài khoản' },
]

function isActive(pathname, to) {
  if (to === '/chat') {
    return pathname === '/chat' || pathname.startsWith('/chat/')
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavigationLink({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  mobile = false,
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`
        group relative flex items-center gap-2.5
        rounded-xl font-semibold
        transition-all duration-200
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-500
        ${
          mobile
            ? 'w-full px-4 py-3 text-sm'
            : 'px-3 py-2.5 text-xs'
        }
        ${
          active
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }
      `}
    >
      <Icon
        size={mobile ? 19 : 17}
        strokeWidth={active ? 2.2 : 1.8}
        className="shrink-0"
      />

      <span className="whitespace-nowrap">{label}</span>

      {mobile && (
        <ChevronRight
          size={16}
          className={`ml-auto transition-transform group-hover:translate-x-0.5 ${
            active
              ? 'text-indigo-500'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      )}
    </Link>
  )
}

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentPage =
    links.find(item => isActive(pathname, item.to))?.label ||
    (pathname.startsWith('/admin') ? 'Quản trị' : 'ChitChat')

  return (
    <div className="min-h-dvh bg-[#f7f9fc] text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* ==================================================
          HEADER
      ================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.025] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* BRAND */}
          <Link
            to="/chat"
            onClick={() => setMenuOpen(false)}
            aria-label="ChitChat - Trang tin nhắn"
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
              <MessageCircle size={23} strokeWidth={2.1} />
            </span>

            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Chit<span className="text-indigo-600 dark:text-indigo-400">Chat</span>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden min-w-0 items-center gap-1 xl:flex"
          >
            {links.map(item => (
              <NavigationLink
                key={item.to}
                {...item}
                active={isActive(pathname, item.to)}
              />
            ))}
          </nav>

          {/* HEADER ACTIONS */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 lg:flex xl:hidden">
              {currentPage}
            </div>

            <ThemeToggle compact />

            <Link
              to="/admin"
              title="Quản trị hệ thống"
              aria-label="Quản trị hệ thống"
              className={`
                flex size-10 items-center justify-center
                rounded-xl transition-colors
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-indigo-500
                ${
                  pathname.startsWith('/admin')
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400'
                }
              `}
            >
              <Shield size={19} strokeWidth={1.8} />
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              onClick={() => setMenuOpen(previous => !previous)}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              aria-controls="app-shell-mobile-nav"
              className={`
                flex size-10 items-center justify-center
                rounded-xl transition-colors
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-indigo-500
                xl:hidden
                ${
                  menuOpen
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }
              `}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ==================================================
            MOBILE / TABLET NAVIGATION
        ================================================== */}
        {menuOpen && (
          <nav
            id="app-shell-mobile-nav"
            aria-label="Điều hướng trên thiết bị nhỏ"
            className="border-t border-slate-100 bg-white px-4 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 xl:hidden"
          >
            <div className="mx-auto grid max-w-[1500px] gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {links.map(item => (
                <NavigationLink
                  key={item.to}
                  {...item}
                  mobile
                  active={isActive(pathname, item.to)}
                  onClick={() => setMenuOpen(false)}
                />
              ))}

              <NavigationLink
                to="/admin"
                icon={Shield}
                label="Quản trị hệ thống"
                mobile
                active={pathname.startsWith('/admin')}
                onClick={() => setMenuOpen(false)}
              />
            </div>
          </nav>
        )}
      </header>

      {/* ==================================================
          PAGE CONTENT
      ================================================== */}
      <div className="min-w-0">
        {children}
      </div>
    </div>
  )
}
