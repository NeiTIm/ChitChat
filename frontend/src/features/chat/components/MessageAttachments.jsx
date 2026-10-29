
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  ImageOff,
  LoaderCircle,
} from 'lucide-react'

import { chatApi } from '../api/chatApi'

function formatFileSize(bytes) {
  if (bytes == null || !Number.isFinite(Number(bytes))) return ''

  const size = Number(bytes)

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return FileImage
  }

  if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
    return FileText
  }

  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return FileSpreadsheet
  }

  if (['zip', 'rar', '7z'].includes(extension)) {
    return FileArchive
  }

  return File
}

function AttachmentCard({
  file,
  preview,
  previewFailed,
  downloading,
  onDownload,
}) {
  const isImage = file.contentType?.startsWith('image/')
  const FileIcon = getFileIcon(file.fileName)
  const fileSize = formatFileSize(file.fileSize ?? file.size)
  const fileName = file.fileName || 'Tệp đính kèm'

  if (isImage) {
    return (
      <div className="group relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/40">
        {preview ? (
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Xem ảnh ${fileName}`}
            className="relative block overflow-hidden bg-slate-100 dark:bg-slate-800"
          >
            <img
              src={preview}
              alt={fileName}
              loading="lazy"
              className="max-h-72 min-h-28 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />

            <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg bg-slate-950/60 text-white opacity-100 backdrop-blur-sm transition sm:opacity-0 sm:group-hover:opacity-100">
              <ExternalLink size={15} />
            </span>
          </a>
        ) : (
          <div className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {previewFailed ? (
              <>
                <ImageOff size={25} strokeWidth={1.6} />
                <span className="text-xs">Không thể xem trước ảnh</span>
              </>
            ) : (
              <>
                <LoaderCircle size={23} className="animate-spin" />
                <span className="text-xs">Đang tải ảnh...</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <FileImage size={17} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              title={fileName}
              className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              {fileName}
            </p>

            {fileSize && (
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                {fileSize}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            aria-label={`Tải xuống ${fileName}`}
            title="Tải xuống"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
          >
            {downloading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Download size={17} />
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex w-full max-w-[300px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/40">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
        <FileIcon size={23} strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          title={fileName}
          className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100"
        >
          {fileName}
        </p>

        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          {fileSize || 'Tệp đính kèm'}
        </p>
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        aria-label={`Tải xuống ${fileName}`}
        title="Tải xuống"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
      >
        {downloading ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <Download size={17} />
        )}
      </button>
    </div>
  )
}

export default function MessageAttachments({
  attachments,
  token,
}) {
  const [previews, setPreviews] = useState({})
  const [previewErrors, setPreviewErrors] = useState({})
  const [downloadingIds, setDownloadingIds] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const objectUrls = []

    setPreviews({})
    setPreviewErrors({})

    if (!token || !attachments?.length) {
      return () => {
        active = false
        controller.abort()
      }
    }

    const imageFiles = attachments.filter(
      file => file.contentType?.startsWith('image/')
    )

    const loadPreviews = async () => {
      await Promise.all(
        imageFiles.map(async file => {
          try {
            const response = await chatApi.getFilesByIdPreview(
              file.id,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                responseType: 'blob',
                signal: controller.signal,
              }
            )

            if (!active) return

            const url = URL.createObjectURL(response.data)
            objectUrls.push(url)

            setPreviews(previous => ({
              ...previous,
              [file.id]: url,
            }))
          } catch {
            if (!active) return

            setPreviewErrors(previous => ({
              ...previous,
              [file.id]: true,
            }))
          }
        })
      )
    }

    loadPreviews()

    return () => {
      active = false
      controller.abort()

      objectUrls.forEach(url => {
        URL.revokeObjectURL(url)
      })
    }
  }, [attachments, token])

  const download = async file => {
    if (!token || downloadingIds.includes(file.id)) return

    setError('')

    setDownloadingIds(previous => [
      ...previous,
      file.id,
    ])

    try {
      const response = await chatApi.getFilesByIdDownload(
        file.id,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      )

      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')

      link.href = url
      link.download = file.fileName || 'attachment'
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch {
      setError(
        'Không thể tải tệp. Tệp có thể không còn tồn tại hoặc bạn không có quyền truy cập.'
      )
    } finally {
      setDownloadingIds(previous =>
        previous.filter(id => id !== file.id)
      )
    }
  }

  if (!attachments?.length) return null

  return (
    <div className="mt-2 w-full space-y-2">
      <div className="flex flex-wrap items-start gap-2.5">
        {attachments.map(file => (
          <AttachmentCard
            key={file.id}
            file={file}
            preview={previews[file.id]}
            previewFailed={Boolean(previewErrors[file.id])}
            downloading={downloadingIds.includes(file.id)}
            onDownload={() => download(file)}
          />
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
