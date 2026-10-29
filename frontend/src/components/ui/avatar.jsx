
import { useState } from 'react'

const avatarColors = [
  'from-indigo-400 to-violet-500',
  'from-sky-400 to-blue-600',
  'from-pink-400 to-rose-500',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-purple-600',
]

function getInitials(name) {
  const text = String(name || '').trim()

  if (!text) return '?'

  const words = text.split(/\s+/)

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

function getAvatarColor(name) {
  const text = String(name || '')

  const hash = Array.from(text).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  )

  return avatarColors[hash % avatarColors.length]
}

const sizes = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-2xl',
  '2xl': 'size-28 text-3xl',
}

export function Avatar({
  name = '?',
  src,
  size = 'md',
  online = false,
  className = '',
  rounded = 'full',
  showRing = false,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false)

  const initials = getInitials(name)
  const gradient = getAvatarColor(name)
  const dimension = sizes[size] || sizes.md

  const roundStyle =
    rounded === 'square'
      ? 'rounded-2xl'
      : 'rounded-full'

  const onlineDot = {
    xs: 'size-2 border',
    sm: 'size-2.5 border-2',
    md: 'size-3 border-2',
    lg: 'size-3.5 border-[3px]',
    xl: 'size-4.5 border-[3px]',
    '2xl': 'size-5 border-4',
  }

  const Component = onClick ? 'button' : 'span'

  return (
    <Component
      {...(onClick
        ? {
            type: 'button',
            onClick,
            'aria-label': `Xem hồ sơ ${name}`,
          }
        : {})}
      className={`
        relative inline-flex shrink-0
        items-center justify-center
        ${dimension}
        ${roundStyle}
        ${showRing
          ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-indigo-500 dark:ring-offset-slate-950'
          : ''
        }
        ${onClick
          ? 'cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95'
          : ''
        }
        ${className}
      `}
    >
      <span
        className={`
          flex h-full w-full items-center justify-center
          overflow-hidden
          ${roundStyle}
          bg-gradient-to-br ${gradient}
          font-bold uppercase tracking-tight
          text-white select-none
          shadow-sm
        `}
      >
        {src && !imageFailed ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </span>

      {online && (
        <span
          role="img"
          aria-label="Đang hoạt động"
          className={`
            absolute bottom-0 right-0
            rounded-full
            border-white bg-emerald-500
            shadow-sm
            dark:border-slate-900
            ${onlineDot[size] || onlineDot.md}
          `}
        />
      )}
    </Component>
  )
}
