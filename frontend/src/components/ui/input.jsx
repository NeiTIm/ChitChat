
import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  {
    className = '',
    type = 'text',
    disabled = false,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      className={`
        flex h-11 w-full min-w-0
        rounded-xl border border-slate-200
        bg-white px-3.5 py-2.5
        text-sm font-normal text-slate-900
        shadow-sm shadow-slate-200/20
        outline-none
        transition-all duration-200 ease-out

        placeholder:text-slate-400

        hover:border-slate-300

        focus:border-indigo-400
        focus:ring-4
        focus:ring-indigo-500/10

        focus-visible:outline-none

        disabled:cursor-not-allowed
        disabled:bg-slate-100
        disabled:text-slate-400
        disabled:opacity-60

        aria-invalid:border-rose-500
        aria-invalid:focus:border-rose-500
        aria-invalid:focus:ring-rose-500/10

        file:mr-3
        file:border-0
        file:bg-transparent
        file:text-sm
        file:font-semibold
        file:text-indigo-600

        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-100
        dark:shadow-none
        dark:placeholder:text-slate-500

        dark:hover:border-slate-600
        dark:focus:border-indigo-500
        dark:focus:ring-indigo-500/15

        dark:disabled:bg-slate-800
        dark:disabled:text-slate-500

        dark:aria-invalid:border-rose-500
        dark:aria-invalid:focus:ring-rose-500/15

        ${className}
      `}
      {...props}
    />
  )
})

Input.displayName = 'Input'
