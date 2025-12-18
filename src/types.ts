/**
 * Chunk information
 */
export interface ChunkInfo {
  start: number
  end: number
  index: number
  hash: string
}

/**
 * File information
 */
export interface FileInfo {
  name: string
  type: string
  size: number
  lastModified: number
  chunks: ChunkInfo[]
}

/**
 * Options for fragmentUpload
 */
export interface FragmentUploadOptions {
  perCallback?: (fileInfo: FileInfo & { isDone: boolean }) => void
  lastCallback?: (filesInfo: FileInfo[]) => void
  splitCallback?: (fileInfo: FileInfo) => void
  chunkSize?: number
  onError?: (error: UploadError) => void
}

/**
 * Options for fragmentUpload1
 */
export interface FragmentUpload1Options {
  chunkSize?: number
  callback?: (chunk: ChunkInfo & { isDone: boolean }) => void
  onError?: (error: UploadError) => void
}

/**
 * 错误类型枚举
 */
export enum ChunkUploadError {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  WORKER_ERROR = 'WORKER_ERROR',
  HASH_ERROR = 'HASH_ERROR',
  INVALID_FILE = 'INVALID_FILE',
  WORKER_LOAD_ERROR = 'WORKER_LOAD_ERROR',
}

/**
 * 上传错误信息
 */
export interface UploadError {
  type: ChunkUploadError
  message: string
  file?: File
  chunkIndex?: number
  originalError?: Error
}
