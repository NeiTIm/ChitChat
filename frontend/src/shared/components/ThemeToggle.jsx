
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle({
  compact = false,
  className = '',
}) {
  const { theme, toggleTheme } = useTheme()

  const isDark = theme === 'dark'

  const label = isDark
    ? 'Chuyển sang giao diện sáng'
    : 'Chuyển sang giao diện tối'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`
        group relative inline-flex shrink-0
        items-center justify-center gap-2.5
        overflow-hidden rounded-xl
        border border-slate-200
        bg-white text-slate-600
        shadow-sm shadow-slate-900/[0.03]
        transition-all duration-200 ease-in-out

        hover:border-indigo-300
        hover:bg-indigo-50
        hover:text-indigo-600
        hover:shadow-md hover:shadow-indigo-500/5

        active:scale-95

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-indigo-500
        focus-visible:ring-offset-2

        dark:border-slate-700
        dark:bg-slate-800
        dark:text-slate-300
        dark:shadow-black/10

        dark:hover:border-indigo-500/40
        dark:hover:bg-indigo-500/10
        dark:hover:text-indigo-400

        dark:focus-visible:ring-offset-slate-900

        ${compact ? 'size-10' : 'h-10 px-3.5'}
        ${className}
      `}
    >
      {/* ICON */}
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {isDark ? (
          <Sun
            size={19}
            strokeWidth={1.9}
            className="text-amber-400 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110"
          />
        ) : (
          <Moon
            size={19}
            strokeWidth={1.9}
            className="text-slate-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 group-hover:text-indigo-600"
          />
        )}
      </span>

      {/* LABEL */}
      {!compact && (
        <span className="whitespace-nowrap text-xs font-semibold">
          {isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        </span>
      )}
    </button>
  )
}
