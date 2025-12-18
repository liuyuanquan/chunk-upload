import SparkMD5 from 'spark-md5'
import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'
import { calculateHash } from './utils/hashOptimizer'

// 使用 LRU 缓存策略限制内存使用
const MAX_CACHE_SIZE = 100
const hashMap = new Map<ArrayBuffer, string>()

/**
 * 清理缓存（保留最新的 MAX_CACHE_SIZE 个条目）
 */
function cleanupCache(): void {
  if (hashMap.size > MAX_CACHE_SIZE) {
    // 删除最旧的条目（Map 保持插入顺序）
    const entriesToDelete = hashMap.size - MAX_CACHE_SIZE
    let deleted = 0
    for (const key of hashMap.keys()) {
      if (deleted >= entriesToDelete) break
      hashMap.delete(key)
      deleted++
    }
  }
}

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
  return new Promise((resolve, reject) => {
    const start = index * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const fileReader = new FileReader()

    // 文件读取错误处理
    fileReader.onerror = () => {
      const error: UploadError = {
        type: ChunkUploadError.FILE_READ_ERROR,
        message: `读取文件分片失败: index=${index}, start=${start}, end=${end}`,
        file,
        chunkIndex: index,
      }
      reject(error)
    }

    fileReader.onload = (e) => {
      try {
        const fileBuffer = e.target?.result as ArrayBuffer
        if (!fileBuffer) {
          const error: UploadError = {
            type: ChunkUploadError.FILE_READ_ERROR,
            message: `文件读取结果为空: index=${index}`,
            file,
            chunkIndex: index,
          }
          reject(error)
          return
        }

        let hash: string

        // 检查缓存
        if (hashMap.has(fileBuffer)) {
          hash = hashMap.get(fileBuffer)!
        } else {
          // 计算哈希（使用优化策略）
          try {
            hash = calculateHash(fileBuffer)
            hashMap.set(fileBuffer, hash)

            // 清理缓存
            cleanupCache()
          } catch (error) {
            const uploadError: UploadError = {
              type: ChunkUploadError.HASH_ERROR,
              message: `计算哈希失败: ${error instanceof Error ? error.message : String(error)}`,
              file,
              chunkIndex: index,
              originalError: error instanceof Error ? error : undefined,
            }
            reject(uploadError)
            return
          }
        }

        resolve({
          start,
          end,
          index,
          hash,
        })
      } catch (error) {
        const uploadError: UploadError = {
          type: ChunkUploadError.FILE_READ_ERROR,
          message: `处理文件分片时出错: ${error instanceof Error ? error.message : String(error)}`,
          file,
          chunkIndex: index,
          originalError: error instanceof Error ? error : undefined,
        }
        reject(uploadError)
      }
    }

    // 读取文件分片
    fileReader.readAsArrayBuffer(file.slice(start, end))
  })
}

/**
 * 清理所有缓存
 */
export function clearHashCache(): void {
  hashMap.clear()
}

/**
 * 获取当前缓存大小
 */
export function getCacheSize(): number {
  return hashMap.size
}
