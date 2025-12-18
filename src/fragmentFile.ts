import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'
import { getWorkerPool } from './utils/workerPool'

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

    // 如果没有分片，直接返回空数组
    if (chunkCount === 0) {
      resolve([])
      return
    }

    // 获取 Worker 池实例
    const workerPool = getWorkerPool(THREAD_COUNT, 'work.js')
    const workerChunkCount = Math.ceil(chunkCount / THREAD_COUNT)
    const tasks: Array<Promise<ChunkInfo[]>> = []

    // 错误处理函数
    const handleError = (error: UploadError) => {
      if (hasError) return
      hasError = true
      onError?.(error)
      reject(error)
    }

    // 创建任务
    for (let i = 0; i < THREAD_COUNT; i++) {
      const startIndex = i * workerChunkCount
      let endIndex = startIndex + workerChunkCount
      if (endIndex > chunkCount) {
        endIndex = chunkCount
      }

      // 如果 startIndex >= endIndex，跳过这个任务
      if (startIndex >= endIndex) {
        continue
      }

      // 创建 Promise 任务
      const taskPromise = new Promise<ChunkInfo[]>((taskResolve, taskReject) => {
        workerPool.submitTask({
          file,
          CHUNK_SIZE: chunkSize,
          startIndex,
          endIndex,
          resolve: (chunks) => {
            if (hasError) return
            taskResolve(chunks)
          },
          reject: (error) => {
            const uploadError: UploadError = {
              type: ChunkUploadError.WORKER_ERROR,
              message: error.message,
              file,
              chunkIndex: startIndex,
              originalError: error,
            }
            handleError(uploadError)
            taskReject(error)
          },
        })
      })

      tasks.push(taskPromise)
    }

    // 等待所有任务完成
    Promise.all(tasks)
      .then((chunksArrays) => {
        if (hasError) return

        // 合并所有分片结果
        chunksArrays.forEach((chunks, taskIndex) => {
          const startIndex = taskIndex * workerChunkCount
          chunks.forEach((chunk, chunkIndex) => {
            result[startIndex + chunkIndex] = chunk
          })
        })

        resolve(result)
      })
      .catch((error) => {
        if (!hasError) {
          const uploadError: UploadError = {
            type: ChunkUploadError.WORKER_ERROR,
            message: error instanceof Error ? error.message : String(error),
            file,
            originalError: error instanceof Error ? error : undefined,
          }
          handleError(uploadError)
        }
      })
  })
}
