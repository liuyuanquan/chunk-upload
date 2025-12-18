import type {
  FileInfo,
  FragmentUploadOptions,
  UploadError,
} from './types'
import { fragmentFile } from './fragmentFile'

/**
 * Fragment upload function - batch callback mode
 * All chunks of a file are processed before callback
 */
export function fragmentUpload(
  selector: string,
  options?: FragmentUploadOptions,
): void {
  const el = document.querySelector(selector) as HTMLInputElement
  if (!el) {
    throw new Error(`元素未找到: ${selector}`)
  }

  const {
    perCallback,
    lastCallback,
    chunkSize,
    onError,
    splitCallback,
  } = options || {}

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    if (files.length === 0) return

    const results: FileInfo[] = []
    let fileCount = files.length
    let hasError = false

    for (const file of files) {
      // 如果已经有错误，停止处理
      if (hasError) break

      try {
        const chunks = await fragmentFile(file, chunkSize, (error) => {
          hasError = true
          onError?.(error)
        })

        // 如果处理过程中出现错误，chunks 可能为空
        if (hasError) continue

        const fileInfo: FileInfo = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          chunks,
        }

        // 分片完成回调
        splitCallback?.(fileInfo)

        fileCount--
        const isDone = fileCount === 0

        // 单个文件完成回调
        perCallback?.({ ...fileInfo, isDone })

        results.push(fileInfo)

        // 所有文件完成回调
        if (isDone) {
          lastCallback?.(results)
        }
      } catch (error) {
        hasError = true
        const uploadError: UploadError = {
          type: error instanceof Error && 'type' in error
            ? (error as UploadError).type
            : 'WORKER_ERROR' as any,
          message: error instanceof Error ? error.message : String(error),
          file,
          originalError: error instanceof Error ? error : undefined,
        }
        onError?.(uploadError)
      }
    }
  }
}
