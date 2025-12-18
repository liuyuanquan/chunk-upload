/**
 * Chunk Upload Lib
 * A simple and fast file chunk upload library using Web Workers
 *
 * @example
 * ```typescript
 * import { chunkUpload, chunkUploadStream } from '@xumi/chunk-upload-lib'
 *
 * // 方式1: 使用选择器（事件监听模式，返回取消控制器）
 * const controller = chunkUpload('#file-input', {
 *   onProgress: (progress) => console.log(progress.percentage)
 * })
 * controller.cancel() // 取消操作
 *
 * // 方式2: 使用 File 对象（Promise 模式）
 * const result = await chunkUpload(file, {
 *   onProgress: (progress) => console.log(progress.percentage)
 * })
 *
 * // 方式3: 使用 FileList
 * const result = await chunkUpload(fileList, options)
 * ```
 */

export * from './types'
export { chunkUpload } from './chunkUpload'
export { chunkUploadStream } from './chunkUploadStream'
export { chunkFile } from './chunkFile'
export { clearHashCache, getCacheSize } from './createChunk'
export { getWorkerPool, resetWorkerPool, WorkerPool } from './utils/workerPool'
export { validateFile } from './utils/fileValidator'
export { createCancelController } from './utils/cancelController'
export { withRetry } from './utils/retry'
export {
  calculateChunkStrategy,
  calculateWorkerCount,
} from './utils/chunkStrategy'
export { calculateHash, shouldUseOptimizedHash } from './utils/hashOptimizer'
export { getWorkerUrl, createWorker } from './utils/workerUrl'
