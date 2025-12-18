import type {
  FragmentUpload1Options,
  UploadError,
  CancelController,
} from './types'
import { ChunkUploadError } from './types'
import { fragmentFile1 } from './fragmentFile1'
import { validateFile } from './utils/fileValidator'
import { createCancelController } from './utils/cancelController'

/**
 * 处理文件列表（内部函数）
 */
async function processFiles1(
  files: File[],
  options: FragmentUpload1Options,
  cancelController: CancelController,
): Promise<void> {
  const {
    callback,
    chunkSize,
    workerCount,
    adaptiveChunkSize = true,
    onError,
    onProgress,
    validation,
    retry,
  } = options

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

        await fragmentFile1(
          file,
          chunkSize,
          callback,
          onError,
          onProgress,
          cancelController,
          retry,
          adaptiveChunkSize,
        )
    } catch (error) {
      if (cancelController.isCancelled()) {
        throw error
      }

        // 确保错误消息是字符串
        let errorMessage = '处理失败'
        let errorType: ChunkUploadError = ChunkUploadError.WORKER_ERROR
        
        if (error && typeof error === 'object' && 'type' in error) {
          // 如果已经是 UploadError 对象
          const uploadErr = error as UploadError
          errorType = uploadErr.type
          errorMessage = uploadErr.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage
        } else if (typeof error === 'string') {
          errorMessage = error
        } else {
          errorMessage = String(error)
        }
        
        const uploadError: UploadError = {
          type: errorType,
          message: errorMessage,
          file,
          originalError: error instanceof Error ? error : undefined,
        }
      onError?.(uploadError)
      throw uploadError
    }
  }
}

/**
 * Fragment upload function - immediate callback mode
 * Each chunk triggers callback immediately after processing
 *
 * @example
 * ```typescript
 * // 使用选择器
 * const controller = fragmentUpload1('#file-input', {
 *   callback: (chunk) => console.log(chunk)
 * })
 *
 * // 使用 File 对象
 * await fragmentUpload1(file, {
 *   callback: (chunk) => console.log(chunk)
 * })
 *
 * // 使用 FileList
 * await fragmentUpload1(fileList, options)
 * ```
 */
export function fragmentUpload1(
  selector: string,
  options?: FragmentUpload1Options,
): CancelController
export function fragmentUpload1(
  file: File,
  options?: FragmentUpload1Options,
): Promise<void>
export function fragmentUpload1(
  files: FileList | File[],
  options?: FragmentUpload1Options,
): Promise<void>
export function fragmentUpload1(
  input: string | File | FileList | File[],
  options?: FragmentUpload1Options,
): CancelController | Promise<void> {
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
        await processFiles1(files, options || {}, cancelController)
      } catch (error) {
        // 错误已在 processFiles1 中处理
      }
    }

    return cancelController
  }

  // 如果输入是 File 或 FileList/File[]，返回 Promise（直接处理模式）
  const files = input instanceof File
    ? [input]
    : Array.from(input)

  return processFiles1(files, options || {}, cancelController)
}
