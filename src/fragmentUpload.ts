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
 * 处理文件列表（内部函数）
 */
async function processFiles(
  files: File[],
  options: FragmentUploadOptions,
  cancelController: CancelController,
): Promise<FileInfo[]> {
  const {
    perCallback,
    lastCallback,
    chunkSize,
    onError,
    splitCallback,
    onProgress,
    validation,
    retry,
  } = options

  const results: FileInfo[] = []
  let fileCount = files.length

  for (const file of files) {
    // 检查是否已取消
    if (cancelController.isCancelled()) {
      throw new Error('操作已取消')
    }

    try {
      // 文件验证
      if (validation) {
        const validationError = validateFile(file, validation)
        if (validationError) {
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
            onError?.(error)
          },
          onProgress,
          cancelController,
        )
      }

      const chunks = retry
        ? await withRetry(processFile, retry)
        : await processFile()

      // 如果已取消，停止处理
      if (cancelController.isCancelled()) {
        throw new Error('操作已取消')
      }

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
        throw error
      }

      const uploadError: UploadError = {
        type: error instanceof Error && 'type' in error
          ? (error as UploadError).type
          : 'WORKER_ERROR' as any,
        message: error instanceof Error ? error.message : String(error),
        file,
        originalError: error instanceof Error ? error : undefined,
      }
      onError?.(uploadError)
      throw uploadError
    }
  }

  return results
}

/**
 * Fragment upload function - batch callback mode
 * All chunks of a file are processed before callback
 *
 * @example
 * ```typescript
 * // 使用选择器
 * const controller = fragmentUpload('#file-input', {
 *   onProgress: (progress) => console.log(progress.percentage)
 * })
 *
 * // 使用 File 对象
 * const result = await fragmentUpload(file, {
 *   onProgress: (progress) => console.log(progress.percentage)
 * })
 *
 * // 使用 FileList
 * const result = await fragmentUpload(fileList, options)
 * ```
 */
export function fragmentUpload(
  selector: string,
  options?: FragmentUploadOptions,
): CancelController
export function fragmentUpload(
  file: File,
  options?: FragmentUploadOptions,
): Promise<FileInfo[]>
export function fragmentUpload(
  files: FileList | File[],
  options?: FragmentUploadOptions,
): Promise<FileInfo[]>
export function fragmentUpload(
  input: string | File | FileList | File[],
  options?: FragmentUploadOptions,
): CancelController | Promise<FileInfo[]> {
  const cancelController = createCancelController()

  // 如果输入是选择器字符串，返回取消控制器（事件监听模式）
  if (typeof input === 'string') {
    const el = document.querySelector(input) as HTMLInputElement
    if (!el) {
      throw new Error(`元素未找到: ${input}`)
    }

    el.onchange = async () => {
      const files = el.files ? Array.from(el.files) : []
      if (files.length === 0) return

      try {
        await processFiles(files, options || {}, cancelController)
      } catch (error) {
        // 错误已在 processFiles 中处理
      }
    }

    return cancelController
  }

  // 如果输入是 File 或 FileList/File[]，返回 Promise（直接处理模式）
  const files = input instanceof File
    ? [input]
    : Array.from(input)

  return processFiles(files, options || {}, cancelController)
}
