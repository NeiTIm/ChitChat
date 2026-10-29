
import { forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'

const variants = {
  default:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400',

  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',

  outline:
    'border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800',

  destructive:
    'bg-rose-600 text-white shadow-sm shadow-rose-500/20 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500',

  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',

  link:
    'text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400',
}

const sizes = {
  xs: 'h-8 rounded-lg px-2.5 text-xs',
  sm: 'h-9 rounded-lg px-3 text-xs',
  default: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-sm',
  xl: 'min-h-14 px-8 py-3.5 text-base',
  icon: 'size-10 p-0',
  'icon-sm': 'size-8 rounded-lg p-0',
  'icon-lg': 'size-12 p-0',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'default',
    size = 'default',
    className = '',
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`
        relative inline-flex shrink-0 items-center justify-center
        gap-2 whitespace-nowrap rounded-xl
        font-semibold leading-none
        transition-all duration-200 ease-out
        outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-500/50
        focus-visible:ring-offset-2
        focus-visible:ring-offset-white
        dark:focus-visible:ring-indigo-400/50
        dark:focus-visible:ring-offset-slate-950
        active:scale-[0.98]
        disabled:pointer-events-none
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
        [&_svg]:pointer-events-none
        [&_svg]:shrink-0
        [&_svg:not([class*='size-'])]:size-4
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.default}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <LoaderCircle
          size={16}
          aria-hidden="true"
          className="animate-spin"
        />
      )}

      {children}
    </button>
  )
})

Button.displayName = 'Button'
