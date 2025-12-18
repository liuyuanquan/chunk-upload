import SparkMD5 from 'spark-md5'
import type { ChunkInfo } from './types'

const hashMap = new Map<ArrayBuffer, string>()

/**
 * Create a chunk from file with hash calculation
 * @param file - File to chunk
 * @param index - Chunk index
 * @param chunkSize - Size of each chunk in bytes
 * @returns Promise that resolves to chunk info
 */
export function createChunk(
  file: File,
  index: number,
  chunkSize: number,
): Promise<ChunkInfo> {
  return new Promise((resolve) => {
    const start = index * chunkSize
    const end = start + chunkSize
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    fileReader.onload = (e) => {
      const fileBuffer = e.target?.result as ArrayBuffer
      let hash: string

      if (!hashMap.has(fileBuffer)) {
        spark.append(fileBuffer)
        hash = spark.end()
        hashMap.set(fileBuffer, hash)
      } else {
        hash = hashMap.get(fileBuffer)!
      }

      resolve({
        start,
        end,
        index,
        hash,
      })
    }

    fileReader.readAsArrayBuffer(file.slice(start, end))
  })
}
