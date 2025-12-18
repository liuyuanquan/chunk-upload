import type { FileInfo, FragmentUploadOptions } from './types'
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
    throw new Error(`Element not found: ${selector}`)
  }

  const { perCallback, lastCallback, chunkSize } = options || {}

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    const results: FileInfo[] = []
    let fileCount = files.length

    for (const file of files) {
      fragmentFile(file, chunkSize).then((chunks) => {
        fileCount--
        const fileInfo: FileInfo = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          chunks,
        }
        perCallback?.({ ...fileInfo, isDone: fileCount === 0 })
        results.push(fileInfo)
        if (fileCount === 0) {
          lastCallback?.(results)
        }
      })
    }
  }
}
