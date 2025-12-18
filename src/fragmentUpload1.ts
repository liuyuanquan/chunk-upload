import type { FragmentUpload1Options } from './types'
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
    throw new Error(`Element not found: ${selector}`)
  }

  const { callback, chunkSize } = options || {}

  el.onchange = async () => {
    const files = el.files ? Array.from(el.files) : []
    for (const file of files) {
      fragmentFile1(file, chunkSize, callback)
    }
  }
}
