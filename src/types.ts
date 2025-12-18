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
  /** 单个文件完成时的回调（每个文件分片完成后调用） */
  perCallback?: (fileInfo: FileInfo & { isDone: boolean }) => void
  /** 所有文件完成时的回调（所有文件处理完成后调用一次） */
  lastCallback?: (filesInfo: FileInfo[]) => void
  /** 文件分片完成时的回调（文件的所有分片处理完成后调用） */
  splitCallback?: (fileInfo: FileInfo) => void
  /** 分片大小（字节），默认根据文件大小自动计算 */
  chunkSize?: number
  /** Worker 数量，默认根据文件大小自动计算 */
  workerCount?: number
  /** 是否启用自适应分片大小，默认 true */
  adaptiveChunkSize?: boolean
  /** 错误回调 */
  onError?: (error: UploadError) => void
  /** 进度回调 */
  onProgress?: (progress: ProgressInfo) => void
  /** 重试配置 */
  retry?: RetryConfig
  /** 文件验证配置 */
  validation?: FileValidationConfig
}

/**
 * Options for fragmentUpload1
 */
export interface FragmentUpload1Options {
  /** 分片大小（字节），默认根据文件大小自动计算 */
  chunkSize?: number
  /** Worker 数量，默认根据文件大小自动计算 */
  workerCount?: number
  /** 是否启用自适应分片大小，默认 true */
  adaptiveChunkSize?: boolean
  /** 每个分片完成时的回调（每个分片处理完成后立即调用） */
  callback?: (chunk: ChunkInfo & { isDone: boolean }) => void
  /** 错误回调 */
  onError?: (error: UploadError) => void
  /** 进度回调 */
  onProgress?: (progress: ProgressInfo) => void
  /** 重试配置 */
  retry?: RetryConfig
  /** 文件验证配置 */
  validation?: FileValidationConfig
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

/**
 * 进度信息
 */
export interface ProgressInfo {
  file: File
  loaded: number // 已处理的字节数
  total: number // 总字节数
  percentage: number // 百分比 0-100
  chunkIndex?: number // 当前分片索引
  totalChunks?: number // 总分片数
  processedChunks?: number // 已处理分片数
}

/**
 * 取消控制器
 */
export interface CancelController {
  cancel: () => void
  isCancelled: () => boolean
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries?: number // 最大重试次数，默认 3
  retryDelay?: number // 重试延迟（毫秒），默认 1000
  retryDelayMultiplier?: number // 重试延迟倍数（指数退避），默认 2
}

/**
 * 文件验证配置
 */
export interface FileValidationConfig {
  allowedTypes?: string[] // 允许的文件类型（MIME type）
  blockedTypes?: string[] // 禁止的文件类型
  maxSize?: number // 最大文件大小（字节）
  minSize?: number // 最小文件大小（字节）
  validate?: (file: File) => boolean | string // 自定义验证函数，返回 true 或错误消息
}
