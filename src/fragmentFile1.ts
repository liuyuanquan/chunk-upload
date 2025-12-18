import type { ChunkInfo, FragmentUpload1Options } from './types'
import { createChunk } from './createChunk'

/**
 * Fragment file into chunks with immediate callback
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @param callback - Callback function for each chunk
 */
export async function fragmentFile1(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
  callback?: FragmentUpload1Options['callback'],
): Promise<void> {
  const chunkCount = Math.ceil(file.size / chunkSize)
  let processedCount = 0

  for (let i = 0; i < chunkCount; i++) {
    const chunk = await createChunk(file, i, chunkSize)
    processedCount++
    callback?.({
      ...chunk,
      isDone: processedCount === chunkCount,
    })
  }
}
