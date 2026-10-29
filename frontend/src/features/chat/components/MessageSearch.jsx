
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  FileText,
  LoaderCircle,
  MessageCircle,
  Search,
  X,
} from 'lucide-react'

import { chatApi } from '../api/chatApi'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HighlightText({ text, query }) {
  const content = String(text || '')
  const keyword = query.trim()

  if (!keyword) return content

  const index = content.toLocaleLowerCase('vi').indexOf(
    keyword.toLocaleLowerCase('vi')
  )

  if (index === -1) return content

  return (
    <>
      {content.slice(0, index)}

      <mark className="rounded-sm bg-amber-200 px-0.5 text-slate-900 dark:bg-amber-500/40 dark:text-amber-100">
        {content.slice(index, index + keyword.length)}
      </mark>

      {content.slice(index + keyword.length)}
    </>
  )
}

function SearchResult({ message, query }) {
  return (
    <div className="group rounded-xl border border-transparent p-3 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <MessageCircle size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Tin nhắn
            </span>

            {message.createdAt && (
              <time
                dateTime={message.createdAt}
                className="text-[10px] text-slate-400 dark:text-slate-500"
              >
                {formatDate(message.createdAt)}
              </time>
            )}
          </div>

          <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-600 dark:text-slate-300">
            <HighlightText
              text={message.content || 'Tin nhắn không có nội dung văn bản'}
              query={query}
            />
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MessageSearch({
  token,
  conversationId,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searchedQuery, setSearchedQuery] = useState('')

  const [state, setState] = useState({
    loading: false,
    error: '',
  })

  const requestId = useRef(0)

  useEffect(() => {
    requestId.current += 1
    setQuery('')
    setResults(null)
    setSearchedQuery('')
    setState({
      loading: false,
      error: '',
    })
  }, [conversationId, token])

  const search = async event => {
    event.preventDefault()

    const keyword = query.trim()

    if (
      keyword.length < 2 ||
      state.loading ||
      !conversationId ||
      !token
    ) {
      return
    }

    const currentRequest = ++requestId.current

    setState({
      loading: true,
      error: '',
    })

    setResults(null)
    setSearchedQuery(keyword)

    try {
      const { data } =
        await chatApi.getConversationsByIdMessagesSearch(
          conversationId,
          {
            params: {
              q: keyword,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

      if (currentRequest !== requestId.current) return

      setResults(Array.isArray(data?.items) ? data.items : [])

      setState({
        loading: false,
        error: '',
      })
    } catch {
      if (currentRequest !== requestId.current) return

      setResults(null)

      setState({
        loading: false,
        error: 'Không thể tìm kiếm tin nhắn. Vui lòng thử lại.',
      })
    }
  }

  const clearSearch = () => {
    requestId.current += 1

    setQuery('')
    setResults(null)
    setSearchedQuery('')

    setState({
      loading: false,
      error: '',
    })
  }

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Search size={20} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Tìm kiếm tin nhắn
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tìm nội dung trong cuộc trò chuyện.
          </p>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form
        onSubmit={search}
        role="search"
        className="p-4"
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Nhập từ khóa cần tìm..."
              aria-label="Tìm tin nhắn"
              minLength={2}
              maxLength={100}
              className="h-11 pl-10 pr-10"
            />

            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              state.loading ||
              query.trim().length < 2 ||
              !conversationId ||
              !token
            }
            loading={state.loading}
            className="h-11 shrink-0"
          >
            <span className="hidden sm:inline">Tìm kiếm</span>
            <span className="sm:hidden">Tìm</span>
            {!state.loading && <ArrowRight size={16} />}
          </Button>
        </div>

        <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
          Nhập ít nhất 2 ký tự để tìm kiếm tin nhắn.
        </p>
      </form>

      {/* RESULTS */}
      {(state.loading || state.error || results !== null) && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* RESULT HEADER */}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Kết quả tìm kiếm
            </h4>

            {results !== null && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {results.length} kết quả
              </span>
            )}
          </div>

          {/* LOADING */}
          {state.loading && (
            <div
              role="status"
              aria-label="Đang tìm kiếm tin nhắn"
              className="space-y-3 px-4 pb-5"
            >
              <span className="sr-only">Đang tìm kiếm tin nhắn...</span>

              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl p-2"
                >
                  <Skeleton className="size-9 shrink-0 rounded-xl" />

                  <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ERROR */}
          {state.error && (
            <div
              role="alert"
              className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* EMPTY STATE */}
          {!state.loading && results?.length === 0 && (
            <div className="flex flex-col items-center px-5 pb-9 pt-5 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <FileText size={28} strokeWidth={1.6} />
              </div>

              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Không tìm thấy tin nhắn
              </h4>

              <p className="mt-2 max-w-xs text-xs leading-6 text-slate-500 dark:text-slate-400">
                Không có tin nhắn nào phù hợp với từ khóa
                <span className="font-semibold"> "{searchedQuery}"</span>.
              </p>
            </div>
          )}

          {/* RESULT LIST */}
          {!state.loading && results?.length > 0 && (
            <div className="max-h-80 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3">
              {results.map(message => (
                <SearchResult
                  key={message.id}
                  message={message}
                  query={searchedQuery}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
