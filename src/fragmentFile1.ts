import type {
  ChunkInfo,
  FragmentUpload1Options,
  UploadError,
  ProgressInfo,
  CancelController,
} from './types'
import { createChunk } from './createChunk'
import { createCancelController } from './utils/cancelController'
import { withRetry } from './utils/retry'

/**
 * Fragment file into chunks with immediate callback
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @param callback - Callback function for each chunk
 * @param onError - 错误回调函数
 * @param onProgress - 进度回调函数
 * @param cancelController - 取消控制器
 * @param retryConfig - 重试配置
 */
export async function fragmentFile1(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
  callback?: FragmentUpload1Options['callback'],
  onError?: (error: UploadError) => void,
  onProgress?: (progress: ProgressInfo) => void,
  cancelController?: CancelController,
  retryConfig?: FragmentUpload1Options['retry'],
): Promise<void> {
  // 验证文件
  if (!file || !(file instanceof File)) {
    const error: UploadError = {
      type: 'INVALID_FILE' as any,
      message: '无效的文件对象',
      file,
    }
    onError?.(error)
    throw error
  }

  const chunkCount = Math.ceil(file.size / chunkSize)
  let processedCount = 0
  let processedBytes = 0
  const controller = cancelController || createCancelController()

  // 更新进度
  const updateProgress = (chunkIndex: number, loadedBytes: number) => {
    if (onProgress) {
      const progress: ProgressInfo = {
        file,
        loaded: loadedBytes,
        total: file.size,
        percentage: Math.min(100, Math.round((loadedBytes / file.size) * 100)),
        chunkIndex,
        totalChunks: chunkCount,
        processedChunks: processedCount,
      }
      onProgress(progress)
    }
  }

  for (let i = 0; i < chunkCount; i++) {
    // 检查是否已取消
    if (controller.isCancelled()) {
      throw new Error('操作已取消')
    }

    try {
      // 使用重试机制
      const chunk = retryConfig
        ? await withRetry(
            () => createChunk(file, i, chunkSize),
            retryConfig,
          )
        : await createChunk(file, i, chunkSize)

      processedCount++
      processedBytes += chunk.end - chunk.start

      // 更新进度
      updateProgress(i, processedBytes)

      callback?.({
        ...chunk,
        isDone: processedCount === chunkCount,
      })
    } catch (error) {
      const uploadError: UploadError = error instanceof Error && 'type' in error
        ? (error as UploadError)
        : {
            type: 'FILE_READ_ERROR' as any,
            message: error instanceof Error ? error.message : String(error),
            file,
            chunkIndex: i,
            originalError: error instanceof Error ? error : undefined,
          }
      onError?.(uploadError)
      throw uploadError
    }
  }
}
