import type {
  ChunkInfo,
  UploadError,
  ProgressInfo,
  CancelController,
} from './types'
import { ChunkUploadError } from './types'
import { getWorkerPool } from './utils/workerPool'
import { createCancelController } from './utils/cancelController'

const THREAD_COUNT = navigator.hardwareConcurrency || 4

/**
 * Fragment file into chunks using Web Workers
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @param onError - 错误回调函数
 * @param onProgress - 进度回调函数
 * @param cancelController - 取消控制器
 * @returns Promise that resolves to array of chunk info
 */
export function fragmentFile(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
  onError?: (error: UploadError) => void,
  onProgress?: (progress: ProgressInfo) => void,
  cancelController?: CancelController,
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
    let processedBytes = 0
    let hasError = false
    const chunkCount = Math.ceil(file.size / chunkSize)
    const controller = cancelController || createCancelController()

    // 如果没有分片，直接返回空数组
    if (chunkCount === 0) {
      resolve([])
      return
    }

    // 检查是否已取消
    if (controller.isCancelled()) {
      reject(new Error('操作已取消'))
      return
    }

    // 获取 Worker 池实例
    const workerPool = getWorkerPool(THREAD_COUNT, 'work.js')
    const workerChunkCount = Math.ceil(chunkCount / THREAD_COUNT)
    const tasks: Array<Promise<ChunkInfo[]>> = []

    // 更新进度
    const updateProgress = (processedChunks: number, loadedBytes: number) => {
      if (onProgress) {
        const progress: ProgressInfo = {
          file,
          loaded: loadedBytes,
          total: file.size,
          percentage: Math.min(100, Math.round((loadedBytes / file.size) * 100)),
          processedChunks,
          totalChunks: chunkCount,
        }
        onProgress(progress)
      }
    }

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
        // 检查是否已取消
        if (controller.isCancelled()) {
          taskReject(new Error('操作已取消'))
          return
        }

        workerPool.submitTask({
          file,
          CHUNK_SIZE: chunkSize,
          startIndex,
          endIndex,
          resolve: (chunks) => {
            if (hasError || controller.isCancelled()) return

            // 计算已处理的字节数
            chunks.forEach((chunk) => {
              processedBytes += chunk.end - chunk.start
            })

            finishCount++
            updateProgress(finishCount, processedBytes)

            taskResolve(chunks)
          },
          reject: (error) => {
            if (controller.isCancelled()) {
              taskReject(new Error('操作已取消'))
              return
            }

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
        if (hasError || controller.isCancelled()) {
          if (controller.isCancelled()) {
            reject(new Error('操作已取消'))
          }
          return
        }

        // 合并所有分片结果
        chunksArrays.forEach((chunks, taskIndex) => {
          const startIndex = taskIndex * workerChunkCount
          chunks.forEach((chunk, chunkIndex) => {
            result[startIndex + chunkIndex] = chunk
          })
        })

        // 最终进度更新
        updateProgress(chunkCount, file.size)
        resolve(result)
      })
      .catch((error) => {
        if (controller.isCancelled()) {
          reject(new Error('操作已取消'))
          return
        }

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
