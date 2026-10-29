
import { useEffect, useState } from 'react'
import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Image,
  Paperclip,
  Plus,
  X,
} from 'lucide-react'

const MAX_FILES = 5

const ACCEPTED_FILES =
  '.jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx,.txt,.zip'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file) {
  const extension = file.name
    .split('.')
    .pop()
    ?.toLowerCase()

  if (file.type.startsWith('image/')) {
    return FileImage
  }

  if (extension === 'pdf' || extension === 'docx' || extension === 'txt') {
    return FileText
  }

  if (extension === 'xlsx') {
    return FileSpreadsheet
  }

  if (extension === 'zip') {
    return FileArchive
  }

  return File
}

function FilePreview({ file, preview, onRemove }) {
  const FileIcon = getFileIcon(file)

  return (
    <div
      className="
        group relative flex w-[180px] shrink-0 items-center gap-3
        rounded-2xl border border-slate-200/80
        bg-white p-2.5 shadow-sm
        transition-all duration-200
        hover:border-indigo-200 hover:shadow-md
        dark:border-slate-700 dark:bg-slate-800
        dark:hover:border-indigo-500/40
      "
    >
      {/* File thumbnail */}
      <div
        className="
          flex size-12 shrink-0 items-center justify-center
          overflow-hidden rounded-xl
          bg-indigo-50 text-indigo-500
          dark:bg-indigo-500/10 dark:text-indigo-400
        "
      >
        {preview ? (
          <img
            src={preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileIcon size={22} strokeWidth={1.7} />
        )}
      </div>

      {/* File information */}
      <div className="min-w-0 flex-1 pr-2">
        <p
          title={file.name}
          className="
            truncate text-xs font-semibold
            text-slate-800 dark:text-slate-100
          "
        >
          {file.name}
        </p>

        <p
          className="
            mt-1 text-[11px]
            text-slate-400 dark:text-slate-500
          "
        >
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Xóa tệp ${file.name}`}
        title="Xóa tệp"
        className="
          absolute -right-2 -top-2
          flex size-6 items-center justify-center
          rounded-full border-2 border-white
          bg-slate-700 text-white
          shadow-sm transition-all
          hover:scale-110 hover:bg-rose-500
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-indigo-500
          dark:border-slate-900
        "
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function FileComposer({
  files = [],
  onFiles,
  disabled = false,
}) {
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')

  // Generate image previews and release object URLs.
  useEffect(() => {
    const urls = files.map(file =>
      file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null
    )

    setPreviews(urls)

    return () => {
      urls.forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [files])

  const handleFileChange = event => {
    const selectedFiles = Array.from(event.target.files || [])

    event.target.value = ''

    if (selectedFiles.length === 0) return

    const remainingSlots = MAX_FILES - files.length

    if (remainingSlots <= 0) {
      setError(`Chỉ được đính kèm tối đa ${MAX_FILES} tệp.`)
      return
    }

    const newFiles = selectedFiles.slice(0, remainingSlots)

    const nextFiles = [...files, ...newFiles]

    onFiles(nextFiles)

    if (selectedFiles.length > remainingSlots) {
      setError(`Chỉ được đính kèm tối đa ${MAX_FILES} tệp.`)
    } else {
      setError('')
    }
  }

  const removeFile = index => {
    onFiles(files.filter((_, currentIndex) => currentIndex !== index))
    setError('')
  }

  const canAttach = !disabled && files.length < MAX_FILES

  return (
    <div className="w-full space-y-3">
      {/* Attachment toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <label
          title={
            canAttach
              ? 'Đính kèm hình ảnh hoặc tài liệu'
              : `Tối đa ${MAX_FILES} tệp`
          }
          className={`
            inline-flex h-10 items-center justify-center gap-2
            rounded-xl border border-slate-200
            bg-white px-3.5
            text-xs font-semibold text-slate-600
            shadow-sm transition-all duration-200
            dark:border-slate-700 dark:bg-slate-800
            dark:text-slate-300
            ${
              canAttach
                ? 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400'
                : 'cursor-not-allowed opacity-50'
            }
          `}
        >
          <Paperclip size={17} strokeWidth={1.9} />

          <span>Đính kèm</span>

          {files.length > 0 && (
            <span
              className="
                rounded-md bg-indigo-50 px-1.5 py-0.5
                text-[10px] font-bold text-indigo-600
                dark:bg-indigo-500/15 dark:text-indigo-400
              "
            >
              {files.length}/{MAX_FILES}
            </span>
          )}

          <input
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            disabled={!canAttach}
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Chọn tệp đính kèm"
          />
        </label>

        {files.length === 0 && (
          <div
            className="
              hidden items-center gap-2
              text-[11px] text-slate-400
              dark:text-slate-500 sm:flex
            "
          >
            <Image size={15} />
            <span>Ảnh, PDF, Word, Excel, TXT, ZIP</span>
          </div>
        )}

        {files.length > 0 && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {files.length} tệp đã chọn
          </span>
        )}
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div
          className="
            flex flex-wrap gap-3
            rounded-2xl border border-dashed
            border-slate-200 bg-slate-50/70
            p-3 dark:border-slate-700
            dark:bg-slate-800/30
          "
        >
          {files.map((file, index) => (
            <FilePreview
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              preview={previews[index]}
              onRemove={() => removeFile(index)}
            />
          ))}

          {/* Add more files */}
          {canAttach && (
            <label
              title="Thêm tệp"
              className="
                flex min-h-[68px] w-[68px]
                cursor-pointer items-center justify-center
                rounded-2xl border border-dashed
                border-slate-300 bg-white
                text-slate-400 transition-all
                hover:border-indigo-400 hover:bg-indigo-50
                hover:text-indigo-600
                dark:border-slate-600 dark:bg-slate-800
                dark:hover:border-indigo-500
                dark:hover:bg-indigo-500/10
                dark:hover:text-indigo-400
              "
            >
              <Plus size={23} />

              <input
                type="file"
                multiple
                accept={ACCEPTED_FILES}
                disabled={!canAttach}
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Thêm tệp đính kèm"
              />
            </label>
          )}
        </div>
      )}

      {/* Validation error */}
      {error && (
        <p
          role="alert"
          className="
            text-xs font-medium
            text-rose-600 dark:text-rose-400
          "
        >
          {error}
        </p>
      )}
    </div>
  )
}
