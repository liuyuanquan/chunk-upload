import type {
  FileInfo,
  FragmentUploadOptions,
  UploadError,
  CancelController,
} from './types'
import { fragmentFile } from './fragmentFile'
import { validateFile } from './utils/fileValidator'
import { createCancelController } from './utils/cancelController'
import { withRetry } from './utils/retry'

/**
 * Fragment upload function - batch callback mode
 * All chunks of a file are processed before callback
 * @returns 取消控制器
 */
export function fragmentUpload(
  selector: string,
  options?: FragmentUploadOptions,
): CancelController {
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
    onProgress,
    validation,
    retry,
  } = options || {}

  const cancelController = createCancelController()

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    if (files.length === 0) return

    const results: FileInfo[] = []
    let fileCount = files.length
    let hasError = false

    for (const file of files) {
      // 如果已经有错误或已取消，停止处理
      if (hasError || cancelController.isCancelled()) break

      try {
        // 文件验证
        if (validation) {
          const validationError = validateFile(file, validation)
          if (validationError) {
            hasError = true
            onError?.(validationError)
            continue
          }
        }

        // 使用重试机制处理文件
        const processFile = async () => {
          return await fragmentFile(
            file,
            chunkSize,
            (error) => {
              hasError = true
              onError?.(error)
            },
            onProgress,
            cancelController,
          )
        }

        const chunks = retry
          ? await withRetry(processFile, retry)
          : await processFile()

        // 如果处理过程中出现错误或已取消，跳过
        if (hasError || cancelController.isCancelled()) continue

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
        if (cancelController.isCancelled()) {
          break
        }

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

  return cancelController
}
