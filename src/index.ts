/**
 * Chunk Upload Lib
 * A simple and fast file chunk upload library using Web Workers
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
