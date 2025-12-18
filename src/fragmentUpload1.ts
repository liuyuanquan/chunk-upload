import type { FragmentUpload1Options, UploadError } from './types'
import { fragmentFile1 } from './fragmentFile1'

/**
 * Fragment upload function - immediate callback mode
 * Each chunk triggers callback immediately after processing
 */
export function fragmentUpload1(
  selector: string,
  options?: FragmentUpload1Options,
): void {
  const el = document.querySelector(selector) as HTMLInputElement
  if (!el) {
    throw new Error(`元素未找到: ${selector}`)
  }

  const { callback, chunkSize, onError } = options || {}

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    if (files.length === 0) return

    for (const file of files) {
      try {
        await fragmentFile1(file, chunkSize, callback, onError)
      } catch (error) {
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
