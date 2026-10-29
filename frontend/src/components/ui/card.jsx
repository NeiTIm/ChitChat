
import { forwardRef } from 'react'

export const Card = forwardRef(function Card(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <section
      ref={ref}
      className={`
        flex flex-col
        rounded-2xl
        border border-slate-200/80
        bg-white
        p-6
        text-slate-900
        shadow-sm shadow-slate-200/40
        transition-colors duration-200
        dark:border-slate-800
        dark:bg-slate-900
        dark:text-slate-100
        dark:shadow-black/10
        ${className}
      `}
      {...props}
    >
      {children}
    </section>
  )
})

export const CardHeader = forwardRef(function CardHeader(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`
        mb-5 flex flex-col gap-1.5
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
})

export const CardTitle = forwardRef(function CardTitle(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <h2
      ref={ref}
      className={`
        text-lg font-bold
        leading-snug tracking-tight
        text-slate-900
        dark:text-slate-100
        ${className}
      `}
      {...props}
    >
      {children}
    </h2>
  )
})

export const CardDescription = forwardRef(function CardDescription(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <p
      ref={ref}
      className={`
        text-sm leading-relaxed
        text-slate-500
        dark:text-slate-400
        ${className}
      `}
      {...props}
    >
      {children}
    </p>
  )
})

export const CardContent = forwardRef(function CardContent(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`
        min-w-0 flex-1
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
})

export const CardFooter = forwardRef(function CardFooter(
  {
    className = '',
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`
        mt-6 flex items-center gap-3
        border-t border-slate-100 pt-5
        dark:border-slate-800
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'
