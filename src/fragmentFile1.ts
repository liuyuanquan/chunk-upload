import type { ChunkInfo, FragmentUpload1Options, UploadError } from './types'
import { createChunk } from './createChunk'

/**
 * Fragment file into chunks with immediate callback
 * @param file - File to fragment
 * @param chunkSize - Size of each chunk in bytes (default: 5MB)
 * @param callback - Callback function for each chunk
 * @param onError - 错误回调函数
 */
export async function fragmentFile1(
  file: File,
  chunkSize: number = 5 * 1024 * 1024,
  callback?: FragmentUpload1Options['callback'],
  onError?: (error: UploadError) => void,
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

  for (let i = 0; i < chunkCount; i++) {
    try {
      const chunk = await createChunk(file, i, chunkSize)
      processedCount++
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
