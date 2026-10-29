
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Forward,
  LoaderCircle,
  MessageCircle,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react'

import { chatApi } from '../api/chatApi'
import { Avatar } from '../../../components/ui/avatar'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'

export default function ForwardPicker({
  token,
  source,
  onClose,
}) {
  const [destinations, setDestinations] = useState([])
  const [target, setTarget] = useState('')
  const [search, setSearch] = useState('')

  const [state, setState] = useState({
    loading: true,
    busy: false,
    error: '',
    success: '',
  })

  // ======================================================
  // LOAD DESTINATIONS
  // ======================================================

  useEffect(() => {
    let active = true

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }

    const loadDestinations = async () => {
      setState({
        loading: true,
        busy: false,
        error: '',
        success: '',
      })

      try {
        const [privateChats, groups] = await Promise.all([
          chatApi.getConversations(config),
          chatApi.getGroups(config),
        ])

        const profiles = await Promise.all(
          (privateChats.data || []).map(async chat => {
            try {
              const { data } = await chatApi.getUsersById(
                chat.otherUserId,
                config
              )

              return {
                id: chat.id,
                name: data.displayName || 'Người dùng',
                type: 'private',
              }
            } catch {
              return {
                id: chat.id,
                name: 'Người dùng',
                type: 'private',
              }
            }
          })
        )

        const groupDestinations = (groups.data || []).map(
          group => ({
            id: group.id,
            name: group.name || 'Nhóm chat',
            type: 'group',
          })
        )

        if (!active) return

        setDestinations([
          ...profiles,
          ...groupDestinations,
        ])

        setState(value => ({
          ...value,
          loading: false,
        }))
      } catch {
        if (!active) return

        setState(value => ({
          ...value,
          loading: false,
          error: 'Không thể tải danh sách cuộc trò chuyện.',
        }))
      }
    }

    if (token) {
      loadDestinations()
    } else {
      setState(value => ({
        ...value,
        loading: false,
        error: 'Phiên đăng nhập không hợp lệ.',
      }))
    }

    return () => {
      active = false
    }
  }, [token])

  // ======================================================
  // SEND FORWARD MESSAGE
  // ======================================================

  const send = async event => {
    event.preventDefault()

    if (!target || state.busy || !source?.id) return

    setState(value => ({
      ...value,
      busy: true,
      error: '',
      success: '',
    }))

    try {
      await chatApi.postMessagesByIdForward(
        source.id,
        {
          destinationConversationId: target,
          clientMessageId: crypto.randomUUID(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setState(value => ({
        ...value,
        busy: false,
        success: 'Đã chuyển tiếp tin nhắn thành công.',
      }))
    } catch {
      setState(value => ({
        ...value,
        busy: false,
        error:
          'Không thể chuyển tiếp tới cuộc trò chuyện đã chọn.',
      }))
    }
  }

  // ======================================================
  // FILTER DESTINATIONS
  // ======================================================

  const filteredDestinations = destinations.filter(item =>
    item.name.toLocaleLowerCase('vi').includes(
      search.trim().toLocaleLowerCase('vi')
    )
  )

  const selectedDestination = destinations.find(
    item => item.id === target
  )

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Chuyển tiếp tin nhắn"
      className="
        w-full overflow-hidden rounded-2xl
        border border-slate-200 bg-white
        shadow-xl shadow-slate-900/5
        dark:border-slate-700 dark:bg-slate-900
        dark:shadow-black/20
      "
    >
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Forward size={20} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Chuyển tiếp tin nhắn
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chọn cuộc trò chuyện để chia sẻ.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chuyển tiếp"
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X size={19} />
        </button>
      </div>

      {/* MESSAGE PREVIEW */}
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="rounded-xl border-l-[3px] border-indigo-500 bg-indigo-50/60 px-4 py-3 dark:bg-indigo-500/10">
          <p className="mb-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            Tin nhắn được chuyển tiếp
          </p>

          <p className="line-clamp-3 break-words text-xs leading-6 text-slate-600 dark:text-slate-300">
            {source?.content || 'Tin nhắn hoặc tệp đính kèm'}
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={send}>
        {/* SEARCH */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tìm người hoặc nhóm..."
              aria-label="Tìm nơi chuyển tiếp"
              className="
                h-11 w-full rounded-xl
                border border-slate-200 bg-slate-50
                pl-11 pr-4 text-sm text-slate-800
                outline-none transition-all
                placeholder:text-slate-400
                focus:border-indigo-400
                focus:ring-4 focus:ring-indigo-500/10
                dark:border-slate-700 dark:bg-slate-800
                dark:text-slate-100
                dark:focus:border-indigo-500
              "
            />
          </div>
        </div>

        {/* DESTINATION LIST */}
        <div
          role="radiogroup"
          aria-label="Nơi nhận tin chuyển tiếp"
          className="max-h-72 space-y-1 overflow-y-auto px-3 py-4"
        >
          {state.loading ? (
            <div
              role="status"
              aria-label="Đang tải danh sách cuộc trò chuyện"
              className="space-y-3 px-2"
            >
              <span className="sr-only">
                Đang tải danh sách...
              </span>

              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2"
                >
                  <Skeleton className="size-11 shrink-0 rounded-full" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : destinations.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <MessageCircle size={26} />
              </div>

              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Chưa có cuộc trò chuyện
              </h3>

              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                Hãy bắt đầu cuộc trò chuyện trước khi chuyển tiếp tin nhắn.
              </p>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <Search
                size={27}
                className="mb-3 text-slate-300 dark:text-slate-600"
              />

              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Không tìm thấy kết quả
              </p>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Thử tìm kiếm bằng tên khác.
              </p>
            </div>
          ) : (
            filteredDestinations.map(item => {
              const selected = target === item.id

              return (
                <label
                  key={`${item.type}-${item.id}`}
                  className={`
                    flex cursor-pointer items-center
                    gap-3 rounded-xl border
                    px-3 py-2.5 transition-all
                    ${
                      selected
                        ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="forward-destination"
                    value={item.id}
                    checked={selected}
                    disabled={state.busy || Boolean(state.success)}
                    onChange={() => setTarget(item.id)}
                    className="sr-only"
                  />

                  {item.type === 'group' ? (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                      <Users size={21} />
                    </div>
                  ) : (
                    <Avatar
                      name={item.name}
                      className="size-11"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {item.type === 'group'
                        ? 'Nhóm chat'
                        : 'Cuộc trò chuyện riêng'}
                    </p>
                  </div>

                  <div
                    className={`
                      flex size-5 shrink-0 items-center justify-center
                      rounded-full border-2 transition-colors
                      ${
                        selected
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }
                    `}
                  >
                    {selected && (
                      <span className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>

        {/* FEEDBACK */}
        {(state.error || state.success) && (
          <div className="px-5 pb-4">
            {state.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <CircleAlert
                  size={17}
                  className="mt-0.5 shrink-0"
                />
                <span>{state.error}</span>
              </div>
            )}

            {state.success && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0"
                />
                <span>{state.success}</span>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30">
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 sm:block">
            {selectedDestination
              ? `Đến: ${selectedDestination.name}`
              : 'Chưa chọn nơi nhận'}
          </p>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Đóng
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                !target ||
                state.busy ||
                state.loading ||
                Boolean(state.success)
              }
              loading={state.busy}
            >
              {!state.busy && <Send size={16} />}
              {state.success ? 'Đã gửi' : 'Chuyển tiếp'}
              {!state.busy && !state.success && (
                <ArrowRight size={15} />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
