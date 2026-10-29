
export function Badge({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}) {
  const variants = {
    default:
      'bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20',
    secondary:
      'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    success:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20',
    warning:
      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20',
    destructive:
      'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/20',
    outline:
      'bg-transparent text-slate-600 ring-slate-200 dark:text-slate-300 dark:ring-slate-700',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`
        inline-flex w-fit shrink-0 items-center justify-center
        gap-1.5 whitespace-nowrap rounded-full
        font-semibold leading-none ring-1 ring-inset
        transition-colors duration-200
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
