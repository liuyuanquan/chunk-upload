import { createChunk } from './createChunk'
import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'

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
  try {
    console.log('[Worker] 收到消息:', {
      fileName: e.data?.file?.name,
      fileSize: e.data?.file?.size,
      CHUNK_SIZE: e.data?.CHUNK_SIZE,
      startIndex: e.data?.startIndex,
      endIndex: e.data?.endIndex,
    })

    const { file, CHUNK_SIZE, startIndex, endIndex } = e.data

    // 验证数据
    if (!file || !(file instanceof File)) {
      throw new Error('无效的 File 对象: file 不存在或不是 File 实例')
    }

    if (typeof CHUNK_SIZE !== 'number' || CHUNK_SIZE <= 0) {
      throw new Error(`无效的分片大小: ${CHUNK_SIZE} (必须是正数)`)
    }

    if (typeof startIndex !== 'number' || typeof endIndex !== 'number') {
      throw new Error(`无效的索引范围: startIndex=${startIndex}, endIndex=${endIndex}`)
    }

    if (startIndex >= endIndex) {
      throw new Error(`无效的索引范围: startIndex (${startIndex}) >= endIndex (${endIndex})`)
    }

    console.log(`[Worker] 开始处理分片 ${startIndex} 到 ${endIndex - 1}`)

    const promises: Promise<ChunkInfo>[] = []

    for (let i = startIndex; i < endIndex; i++) {
      promises.push(createChunk(file, i, CHUNK_SIZE))
    }

    console.log(`[Worker] 等待 ${promises.length} 个分片处理完成...`)
    const results = await Promise.all(promises)
    console.log(`[Worker] 处理完成，返回 ${results.length} 个分片结果`)
    
    postMessage({ success: true, data: results })
  } catch (error) {
    // 发送错误信息回主线程
    console.error('[Worker] 处理出错:', error)
    
    let uploadError: UploadError
    
    if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
      // 如果已经是 UploadError 对象
      uploadError = error as UploadError
    } else {
      // 创建新的 UploadError
      let errorMessage = 'Worker 处理失败'
      let errorStack: string | undefined
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
        errorStack = error.stack
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = String(error)
      }
      
      console.error('[Worker] 错误详情:', {
        message: errorMessage,
        stack: errorStack,
        errorType: error instanceof Error ? error.name : typeof error,
        errorObj: error,
      })
      
      uploadError = {
        type: ChunkUploadError.WORKER_ERROR,
        message: errorMessage,
        file: e.data?.file,
        chunkIndex: e.data?.startIndex,
        originalError: error instanceof Error ? error : undefined,
      }
    }
    
    console.error('[Worker] 发送错误到主线程:', uploadError)
    postMessage({ success: false, error: uploadError })
  }
}

// 监听全局错误
self.addEventListener('error', (event) => {
  console.error('[Worker] 全局错误:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  })
})

// 监听未处理的 Promise 拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Worker] 未处理的 Promise 拒绝:', {
    reason: event.reason,
    promise: event.promise,
  })
})
