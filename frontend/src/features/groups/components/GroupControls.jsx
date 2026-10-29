
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crown,
  FileText,
  ImagePlus,
  Link2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Pin,
  Plus,
  Settings2,
  Shield,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRound,
  UserRoundCog,
  Users,
  X,
} from 'lucide-react'

import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'
import { groupsApi } from '../api/groupsApi'
import ReportButton from '../../moderation/components/ReportButton'

const config = token => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

function SectionTitle({ icon: Icon, title, description, count }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={18} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {count !== undefined && (
        <Badge variant="secondary" size="sm">
          {count}
        </Badge>
      )}
    </div>
  )
}

function Feedback({ message, type = 'error', onClose }) {
  if (!message) return null

  const success = type === 'success'
  const Icon = success ? CheckCircle2 : AlertCircle

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-6 ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
      }`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{message}</span>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-slate-400 dark:bg-slate-800">
        <Icon size={23} />
      </div>
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function RoleBadge({ role }) {
  const variants = {
    Owner: 'warning',
    Admin: 'default',
    Member: 'secondary',
  }

  const labels = {
    Owner: 'Chủ nhóm',
    Admin: 'Quản trị viên',
    Member: 'Thành viên',
  }

  return (
    <Badge variant={variants[role] || 'secondary'} size="sm">
      {role === 'Owner' && <Crown size={12} />}
      {role === 'Admin' && <ShieldCheck size={12} />}
      {labels[role] || role}
    </Badge>
  )
}

// ======================================================
// JOIN GROUP BY INVITE LINK
// ======================================================

export function LinkJoinForm({ token, onJoined }) {
  const [linkToken, setLinkToken] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [success, setSuccess] = useState('')

  const resolve = async event => {
    event.preventDefault()

    if (!linkToken.trim() || busy) return

    setError('')
    setSuccess('')
    setPreview(null)
    setBusy('resolve')

    try {
      const result = await groupsApi.postGroupInviteLinksResolve(
        { token: linkToken.trim() },
        config(token)
      )

      setPreview(result.data)
    } catch {
      setError('Liên kết mời không hợp lệ hoặc đã hết hạn.')
    } finally {
      setBusy('')
    }
  }

  const join = async () => {
    if (!preview || busy) return

    setError('')
    setBusy('join')

    try {
      const result = await groupsApi.postGroupInviteLinksJoin(
        {
          token: linkToken.trim(),
          confirm: true,
        },
        config(token)
      )

      setLinkToken('')
      setPreview(null)
      setSuccess('Đã tham gia nhóm thành công.')

      await onJoined(result.data.groupId)
    } catch {
      setError('Không thể tham gia nhóm này.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <SectionTitle
        icon={Link2}
        title="Tham gia bằng liên kết"
        description="Nhập mã mời để xem thông tin nhóm."
      />

      <form onSubmit={resolve} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Link2
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={linkToken}
            onChange={event => {
              setLinkToken(event.target.value)
              setPreview(null)
              setError('')
            }}
            placeholder="Nhập token lời mời..."
            aria-label="Token lời mời nhóm"
            autoComplete="off"
            className="h-11 pl-10"
          />
        </div>

        <Button
          type="submit"
          disabled={!linkToken.trim() || Boolean(busy)}
          loading={busy === 'resolve'}
          size="sm"
          className="h-11"
        >
          Xem nhóm
          {!busy && <ArrowRight size={16} />}
        </Button>
      </form>

      {preview && (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <Users size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {preview.name || 'Nhóm chat'}
              </h4>
              <p className="mt-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                {preview.description || 'Nhóm chưa có mô tả.'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={join}
            disabled={Boolean(busy)}
            loading={busy === 'join'}
            className="mt-4 w-full"
          >
            {!busy && <Check size={17} />}
            Xác nhận tham gia
          </Button>
        </div>
      )}

      {(error || success) && (
        <div className="mt-4">
          <Feedback
            message={error || success}
            type={error ? 'error' : 'success'}
            onClose={() => {
              setError('')
              setSuccess('')
            }}
          />
        </div>
      )}
    </section>
  )
}

// ======================================================
// GROUP CONTROLS
// ======================================================

export default function GroupControls({
  token,
  group,
  members = [],
  me,
  onRefresh,
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(
    group.description ?? ''
  )
  const [avatar, setAvatar] = useState(null)
  const [links, setLinks] = useState([])
  const [newToken, setNewToken] = useState('')
  const [pins, setPins] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)

  const active = group.status === 'Active'
  const owner = group.myRole === 'Owner'
  const manager = owner || group.myRole === 'Admin'

  // ====================================================
  // LOAD GROUP DATA
  // ====================================================

  const load = async () => {
    const [linkList, pinList] = await Promise.all([
      active
        ? groupsApi
            .getGroupsByIdInviteLinks(group.id, config(token))
            .then(result => result.data)
        : Promise.resolve([]),

      groupsApi
        .getGroupsByIdPins(group.id, config(token))
        .then(result => result.data),
    ])

    setLinks(Array.isArray(linkList) ? linkList : [])
    setPins(Array.isArray(pinList) ? pinList : [])
  }

  useEffect(() => {
    setName(group.name)
    setDescription(group.description ?? '')
    setAvatar(null)
    setNewToken('')
    setOpen(false)
    setError('')
    setSuccess('')
  }, [group.id, group.name, group.description])

  useEffect(() => {
    if (!open) return

    let activeEffect = true

    setLoading(true)

    load()
      .catch(() => {
        if (activeEffect) {
          setError('Không thể tải thông tin quản lý nhóm.')
        }
      })
      .finally(() => {
        if (activeEffect) setLoading(false)
      })

    return () => {
      activeEffect = false
    }
  }, [open, group.id, active, token])

  // ====================================================
  // OPERATIONS
  // ====================================================

  const run = async (
    operation,
    successMessage = 'Thao tác thành công.'
  ) => {
    if (busy) return

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      await operation()
      await load()
      await onRefresh()
      setSuccess(successMessage)
    } catch {
      setError(
        'Không thể thực hiện thao tác hoặc bạn không có quyền.'
      )
    } finally {
      setBusy(false)
    }
  }

  const confirm = (message, operation, successMessage) => {
    if (window.confirm(message)) {
      run(operation, successMessage)
    }
  }

  const saveGroup = event => {
    event.preventDefault()

    if (!name.trim() || !manager) return

    run(async () => {
      let avatarFileId = group.avatarFileId ?? null

      if (avatar) {
        const form = new FormData()

        form.append('file', avatar)
        form.append('purpose', 'Avatar')

        const result = await groupsApi.postFiles(
          form,
          config(token)
        )

        avatarFileId = result.data.id
      }

      await groupsApi.patchGroupsById(
        group.id,
        {
          name: name.trim(),
          description,
          avatarFileId,
        },
        config(token)
      )

      setAvatar(null)
    }, 'Đã cập nhật thông tin nhóm.')
  }

  const createInviteLink = () => {
    run(async () => {
      const result = await groupsApi.postGroupsByIdInviteLinks(
        group.id,
        { expiresAt: null },
        config(token)
      )

      setNewToken(result.data.token)
    }, 'Đã tạo liên kết mời mới.')
  }

  const copyInviteToken = async () => {
    try {
      await navigator.clipboard.writeText(newToken)
      setSuccess('Đã sao chép token lời mời.')
      setError('')
    } catch {
      setError('Không thể sao chép. Hãy sao chép token thủ công.')
    }
  }

  const memberCount = members.length

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* TOGGLE */}
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Settings2 size={21} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Quản lý nhóm
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thành viên, lời mời và cài đặt
            </p>
          </div>
        </div>

        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          {/* FEEDBACK */}
          <Feedback
            message={error || success}
            type={error ? 'error' : 'success'}
            onClose={() => {
              setError('')
              setSuccess('')
            }}
          />

          {/* LOADING */}
          {loading && (
            <div role="status" className="space-y-3">
              <span className="sr-only">
                Đang tải thông tin nhóm...
              </span>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {/* INACTIVE GROUP */}
          {!active && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <Ban size={20} className="mt-0.5 shrink-0" />
              <p>
                Nhóm này đã giải tán. Lịch sử trò chuyện vẫn
                được giữ lại cho những người có quyền truy cập.
              </p>
            </div>
          )}

          {/* GROUP INFORMATION */}
          {active && manager && (
            <div className="space-y-4">
              <SectionTitle
                icon={Settings2}
                title="Thông tin nhóm"
                description="Chỉnh sửa tên, mô tả và ảnh đại diện."
              />

              <form
                onSubmit={saveGroup}
                className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="group-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Tên nhóm
                  </label>

                  <Input
                    id="group-name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Nhập tên nhóm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="group-description"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Mô tả nhóm
                  </label>

                  <textarea
                    id="group-description"
                    value={description}
                    maxLength={500}
                    rows={3}
                    onChange={event =>
                      setDescription(event.target.value)
                    }
                    placeholder="Giới thiệu về nhóm..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="group-avatar"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Ảnh đại diện
                  </label>

                  <label
                    htmlFor="group-avatar"
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <ImagePlus size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {avatar ? avatar.name : 'Chọn ảnh đại diện'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        JPG, PNG hoặc WebP
                      </p>
                    </div>

                    <input
                      id="group-avatar"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={event =>
                        setAvatar(event.target.files?.[0] ?? null)
                      }
                      className="sr-only"
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={!name.trim() || busy}
                  loading={busy}
                >
                  {!busy && <Check size={16} />}
                  Lưu thay đổi
                </Button>
              </form>
            </div>
          )}

          {/* INVITE LINKS */}
          {active && manager && (
            <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
              <SectionTitle
                icon={Link2}
                title="Liên kết mời"
                description="Tạo và quản lý các token mời tham gia."
                count={links.length}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={createInviteLink}
              >
                <Plus size={16} />
                Tạo liên kết mời
              </Button>

              {newToken && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <p className="mb-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Token lời mời mới
                  </p>

                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {newToken}
                    </code>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyInviteToken}
                      aria-label="Sao chép token"
                      title="Sao chép token"
                    >
                      <Copy size={17} />
                    </Button>
                  </div>
                </div>
              )}

              {links.length === 0 ? (
                <EmptyState
                  icon={Link2}
                  title="Chưa có liên kết mời"
                  description="Tạo token mời để chia sẻ quyền tham gia nhóm."
                />
              ) : (
                <ul className="space-y-2">
                  {links.map(link => (
                    <li
                      key={link.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Link2 size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Liên kết mời
                        </p>

                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          Người tạo: {link.createdByUserId?.slice(0, 8) || 'Không rõ'}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          confirm(
                            'Thu hồi liên kết mời này?',
                            () =>
                              groupsApi.deleteGroupsByIdInviteLinksById(
                                group.id,
                                link.id,
                                config(token)
                              ),
                            'Đã thu hồi liên kết mời.'
                          )
                        }
                      >
                        <X size={14} />
                        Thu hồi
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* MEMBERS */}
          {active && (
            <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
              <SectionTitle
                icon={Users}
                title="Thành viên"
                description="Quản lý vai trò và thành viên trong nhóm."
                count={memberCount}
              />

              {members.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Chưa có thành viên"
                  description="Danh sách thành viên sẽ xuất hiện tại đây."
                />
              ) : (
                <ul className="max-h-96 space-y-2 overflow-y-auto">
                  {members.map(member => {
                    const isMe = member.userId === me?.id

                    return (
                      <li
                        key={member.userId}
                        className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={isMe ? (me?.displayName || 'Bạn') : member.userId.slice(0, 8)}
                            size="sm"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                              {isMe
                                ? 'Bạn'
                                : member.userId.slice(0, 8)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Thành viên nhóm
                            </p>
                          </div>

                          <RoleBadge role={member.role} />
                        </div>

                        {!isMe && (
                          <div className="flex flex-wrap gap-2">
                            {manager && member.role === 'Member' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      groupsApi.patchGroupsByIdMembersByIdRole(
                                        group.id,
                                        member.userId,
                                        { role: 'Admin' },
                                        config(token)
                                      ),
                                    'Đã thăng quyền quản trị viên.'
                                  )
                                }
                              >
                                <ShieldCheck size={14} />
                                Thăng quyền
                              </Button>
                            )}

                            {owner && member.role === 'Admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      groupsApi.patchGroupsByIdMembersByIdRole(
                                        group.id,
                                        member.userId,
                                        { role: 'Member' },
                                        config(token)
                                      ),
                                    'Đã chuyển về vai trò thành viên.'
                                  )
                                }
                              >
                                <UserRoundCog size={14} />
                                Hạ quyền
                              </Button>
                            )}

                            {(owner ||
                              (group.myRole === 'Admin' &&
                                member.role === 'Member')) &&
                              member.role !== 'Owner' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    confirm(
                                      'Xóa thành viên này khỏi nhóm?',
                                      () =>
                                        groupsApi.deleteGroupsByIdMembersById(
                                          group.id,
                                          member.userId,
                                          config(token)
                                        ),
                                      'Đã xóa thành viên khỏi nhóm.'
                                    )
                                  }
                                >
                                  <UserMinus size={14} />
                                  Xóa
                                </Button>
                              )}

                            {owner && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  confirm(
                                    'Bạn chắc chắn muốn chuyển quyền chủ nhóm?',
                                    () =>
                                      groupsApi.postGroupsByIdTransferOwner(
                                        group.id,
                                        {
                                          newOwnerUserId: member.userId,
                                        },
                                        config(token)
                                      ),
                                    'Đã chuyển quyền chủ nhóm.'
                                  )
                                }
                              >
                                <Crown size={14} />
                                Chuyển chủ nhóm
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* PINNED MESSAGES */}
          <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
            <SectionTitle
              icon={Pin}
              title="Tin nhắn đã ghim"
              description="Các tin nhắn quan trọng trong nhóm."
              count={pins.length}
            />

            {pins.length === 0 ? (
              <EmptyState
                icon={Pin}
                title="Chưa có tin nhắn ghim"
                description="Các tin nhắn được ghim sẽ hiển thị tại đây."
              />
            ) : (
              <ul className="space-y-2">
                {pins.map(pin => (
                  <li
                    key={pin.messageId}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Pin size={17} />
                    </div>

                    <p className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                      Tin nhắn {pin.messageId?.slice(0, 8)}
                    </p>

                    {active && manager && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              groupsApi.deleteGroupsByIdPinsById(
                                group.id,
                                pin.messageId,
                                config(token)
                              ),
                            'Đã bỏ ghim tin nhắn.'
                          )
                        }
                      >
                        <X size={14} />
                        Bỏ ghim
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* GROUP ACTIONS */}
          {active && (
            <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
              <SectionTitle
                icon={Shield}
                title="Hành động nhóm"
                description="Các thao tác quản lý và quyền thành viên."
              />

              <div className="flex flex-wrap gap-2">
                {!owner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      confirm(
                        'Bạn có chắc muốn rời khỏi nhóm này?',
                        () =>
                          groupsApi.postGroupsByIdLeave(
                            group.id,
                            null,
                            config(token)
                          ),
                        'Đã rời khỏi nhóm.'
                      )
                    }
                  >
                    <LogOut size={16} />
                    Rời nhóm
                  </Button>
                )}

                {owner && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      confirm(
                        'Giải tán nhóm này? Lịch sử trò chuyện vẫn được giữ lại.',
                        () =>
                          groupsApi.postGroupsByIdDissolve(
                            group.id,
                            { confirm: true },
                            config(token)
                          ),
                        'Đã giải tán nhóm.'
                      )
                    }
                  >
                    <Trash2 size={16} />
                    Giải tán nhóm
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* REPORT GROUP */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
            <ReportButton
              token={token}
              targetType="Group"
              targetId={group.id}
            />
          </div>
        </div>
      )}
    </section>
  )
}
