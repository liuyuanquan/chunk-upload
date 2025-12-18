import type {
  FragmentUpload1Options,
  UploadError,
  CancelController,
} from './types'
import { fragmentFile1 } from './fragmentFile1'
import { validateFile } from './utils/fileValidator'
import { createCancelController } from './utils/cancelController'

/**
 * Fragment upload function - immediate callback mode
 * Each chunk triggers callback immediately after processing
 * @returns 取消控制器
 */
export function fragmentUpload1(
  selector: string,
  options?: FragmentUpload1Options,
): CancelController {
  const el = document.querySelector(selector) as HTMLInputElement
  if (!el) {
    throw new Error(`元素未找到: ${selector}`)
  }

  const {
    callback,
    chunkSize,
    onError,
    onProgress,
    validation,
    retry,
  } = options || {}

  const cancelController = createCancelController()

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    if (files.length === 0) return

    for (const file of files) {
      // 检查是否已取消
      if (cancelController.isCancelled()) break

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
        )
      } catch (error) {
        if (cancelController.isCancelled()) {
          break
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
      }
    }
  }

  return cancelController
}
