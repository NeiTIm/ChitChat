
export function Skeleton({
  className = '',
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={`
        animate-pulse
        rounded-xl
        bg-slate-200/80
        dark:bg-slate-700/60
        ${className}
      `}
      {...props}
    />
  )
}

export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải dữ liệu"
      aria-busy="true"
      className="mx-auto w-full max-w-6xl space-y-7 p-4 sm:p-6 lg:p-8"
    >
      <span className="sr-only">Đang tải dữ liệu...</span>

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-40 sm:w-80" />
        </div>

        <Skeleton className="h-11 w-11 shrink-0 rounded-2xl sm:w-32" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="
              space-y-4 rounded-2xl
              border border-slate-200/80
              bg-white p-5
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>

            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div
        className="
          rounded-2xl border border-slate-200/80
          bg-white p-5 sm:p-6
          dark:border-slate-800 dark:bg-slate-900
        "
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4"
            >
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />

              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>

              <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatListSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách cuộc trò chuyện"
      aria-busy="true"
      className="space-y-2 p-3"
    >
      <span className="sr-only">
        Đang tải danh sách cuộc trò chuyện...
      </span>

      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl p-3"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />

          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageSkeleton({ count = 5 }) {
  return (
    <div
      role="status"
      aria-label="Đang tải tin nhắn"
      aria-busy="true"
      className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6"
    >
      <span className="sr-only">Đang tải tin nhắn...</span>

      {Array.from({ length: count }).map((_, index) => {
        const mine = index % 2 === 1

        return (
          <div
            key={index}
            className={`flex items-end gap-2.5 ${
              mine ? 'justify-end' : 'justify-start'
            }`}
          >
            {!mine && (
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            )}

            <div
              className={`
                space-y-2 rounded-2xl p-4
                ${
                  mine
                    ? 'bg-indigo-100/60 dark:bg-indigo-500/15'
                    : 'bg-white dark:bg-slate-800'
                }
              `}
            >
              <Skeleton
                className={`h-3 ${
                  index % 3 === 0
                    ? 'w-36 sm:w-52'
                    : 'w-44 sm:w-64'
                }`}
              />

              {index % 2 === 0 && (
                <Skeleton className="h-3 w-28 sm:w-40" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
