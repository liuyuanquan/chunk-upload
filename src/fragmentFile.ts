import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'
import { createWorker } from './utils/workerUrl'

const THREAD_COUNT = navigator.hardwareConcurrency || 4

/**
 * Fragment file into chunks using Web Workers
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @param onError - 错误回调函数
 * @returns Promise that resolves to array of chunk info
 */
export function fragmentFile(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
  onError?: (error: UploadError) => void,
): Promise<ChunkInfo[]> {
  return new Promise((resolve, reject) => {
    // 验证文件
    if (!file || !(file instanceof File)) {
      const error: UploadError = {
        type: ChunkUploadError.INVALID_FILE,
        message: '无效的文件对象',
        file,
      }
      onError?.(error)
      reject(error)
      return
    }

    const result: ChunkInfo[] = []
    let finishCount = 0
    let hasError = false
    const chunkCount = Math.ceil(file.size / chunkSize)
    const workerChunkCount = Math.ceil(chunkCount / THREAD_COUNT)
    const workers: Worker[] = []

    // 错误处理函数
    const handleError = (error: UploadError, worker?: Worker) => {
      if (hasError) return
      hasError = true

      // 清理所有 Worker
      workers.forEach((w) => {
        try {
          w.terminate()
        } catch (e) {
          // 忽略终止错误
        }
      })

      onError?.(error)
      reject(error)
    }

    // 如果没有分片，直接返回空数组
    if (chunkCount === 0) {
      resolve([])
      return
    }

    for (let i = 0; i < THREAD_COUNT; i++) {
      const startIndex = i * workerChunkCount
      let endIndex = startIndex + workerChunkCount
      if (endIndex > chunkCount) {
        endIndex = chunkCount
      }

      // 如果 startIndex >= endIndex，跳过这个 Worker
      if (startIndex >= endIndex) {
        continue
      }

      try {
        const worker = createWorker('work.js')
        workers.push(worker)

        // Worker 错误处理
        worker.onerror = (event) => {
          const error: UploadError = {
            type: ChunkUploadError.WORKER_ERROR,
            message: `Worker 错误: ${event.message || '未知错误'}`,
            file,
            chunkIndex: startIndex,
            originalError: event.error,
          }
          handleError(error, worker)
        }

        // Worker 消息处理
        worker.onmessage = ({ data }) => {
          if (hasError) return

          try {
            // 检查 Worker 返回的数据格式
            if (data && typeof data === 'object' && 'success' in data) {
              if (!data.success) {
                // Worker 返回错误
                const error = data.error as UploadError
                handleError(error, worker)
                return
              }
              // Worker 成功返回数据
              const chunks = data.data as ChunkInfo[]
              for (let j = startIndex; j < endIndex; j++) {
                result[j] = chunks[j - startIndex]
              }
            } else {
              // 兼容旧格式（直接返回数组）
              const chunks = data as ChunkInfo[]
              for (let j = startIndex; j < endIndex; j++) {
                result[j] = chunks[j - startIndex]
              }
            }

            worker.terminate()
            finishCount++

            if (finishCount === workers.length) {
              resolve(result)
            }
          } catch (error) {
            const uploadError: UploadError = {
              type: ChunkUploadError.WORKER_ERROR,
              message: `处理 Worker 消息时出错: ${error instanceof Error ? error.message : String(error)}`,
              file,
              chunkIndex: startIndex,
              originalError: error instanceof Error ? error : undefined,
            }
            handleError(uploadError, worker)
          }
        }

        // 发送消息到 Worker
        worker.postMessage({
          file,
          CHUNK_SIZE: chunkSize,
          startIndex,
          endIndex,
        })
      } catch (error) {
        const uploadError: UploadError = {
          type: ChunkUploadError.WORKER_LOAD_ERROR,
          message: `无法创建 Worker: ${error instanceof Error ? error.message : String(error)}`,
          file,
          chunkIndex: startIndex,
          originalError: error instanceof Error ? error : undefined,
        }
        handleError(uploadError)
        return
      }
    }

    // 如果没有创建任何 Worker（理论上不应该发生）
    if (workers.length === 0) {
      resolve([])
    }
  })
}
