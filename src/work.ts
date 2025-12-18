import { createChunk } from './createChunk'
import type { ChunkInfo, UploadError } from './types'

interface WorkerMessage {
  file: File
  CHUNK_SIZE: number
  startIndex: number
  endIndex: number
}

/**
 * Web Worker for parallel chunk processing
 */
onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file, CHUNK_SIZE, startIndex, endIndex } = e.data
  const promises: Promise<ChunkInfo>[] = []

  try {
    for (let i = startIndex; i < endIndex; i++) {
      promises.push(createChunk(file, i, CHUNK_SIZE))
    }

    const results = await Promise.all(promises)
    postMessage({ success: true, data: results })
  } catch (error) {
    // 发送错误信息回主线程
    const uploadError: UploadError = error instanceof Error && 'type' in error
      ? (error as UploadError)
      : {
          type: 'WORKER_ERROR' as any,
          message: error instanceof Error ? error.message : String(error),
          file,
          originalError: error instanceof Error ? error : undefined,
        }
    postMessage({ success: false, error: uploadError })
  }
}
