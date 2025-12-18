import type { ChunkInfo } from './types'

const THREAD_COUNT = navigator.hardwareConcurrency || 4

/**
 * Fragment file into chunks using Web Workers
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @returns Promise that resolves to array of chunk info
 */
export function fragmentFile(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
): Promise<ChunkInfo[]> {
  return new Promise((resolve) => {
    const result: ChunkInfo[] = []
    let finishCount = 0
    const chunkCount = Math.ceil(file.size / chunkSize)
    const workerChunkCount = Math.ceil(chunkCount / THREAD_COUNT)

    for (let i = 0; i < THREAD_COUNT; i++) {
      // In development (Vite), use source file; in production, use dist/work.js
      // For npm package users, they should use the built dist/work.js
      const workerUrl =
        typeof import.meta.env !== 'undefined' && import.meta.env.DEV
          ? new URL('./work.ts', import.meta.url)
          : new URL('./work.js', import.meta.url)
      const worker = new Worker(workerUrl, {
        type: 'module',
      })
      const startIndex = i * workerChunkCount
      let endIndex = startIndex + workerChunkCount
      if (endIndex > chunkCount) {
        endIndex = chunkCount
      }

      worker.postMessage({
        file,
        CHUNK_SIZE: chunkSize,
        startIndex,
        endIndex,
      })
      worker.onmessage = ({ data }) => {
        for (let j = startIndex; j < endIndex; j++) {
          result[j] = data[j - startIndex]
        }

        worker.terminate()
        finishCount++
        if (finishCount === THREAD_COUNT) {
          resolve(result)
        }
      }
    }
  })
}
