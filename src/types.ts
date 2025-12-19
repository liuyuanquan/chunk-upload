export interface ChunkInfo {
  /** 分片起始位置（字节） */
  start: number;
  /** 分片结束位置（字节） */
  end: number;
  /** 分片索引（从0开始） */
  index: number;
  /** 分片的哈希值 */
  hash: string;
}

export interface FileInfo {
  /** 文件名 */
  name: string;
  /** 文件MIME类型 */
  type: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件最后修改时间戳 */
  lastModified: number;
  /** 文件分片信息数组 */
  chunks: ChunkInfo[];
}

export interface FragmentUploadOptions {
  /** 每个文件处理完成时的回调函数 */
  perCallback?: (fileInfo: FileInfo & { isDone: boolean }) => void;
  /** 所有文件处理完成时的回调函数 */
  lastCallback?: (filesInfo: FileInfo[]) => void;
  /** 文件分片完成时的回调函数 */
  splitCallback?: (fileInfo: FileInfo) => void;
  /** 分片大小（字节），默认2MB */
  chunkSize?: number;
  /** Web Worker数量，默认4 */
  workerCount?: number;
  /** 是否启用自适应分片大小 */
  adaptiveChunkSize?: boolean;
  /** 错误处理回调函数 */
  onError?: (error: UploadError) => void;
  /** 上传进度回调函数 */
  onProgress?: (progress: ProgressInfo) => void;
  /** 重试配置 */
  retry?: RetryConfig;
  /** 文件验证配置 */
  validation?: FileValidationConfig;
}

export interface FragmentUpload1Options {
  /** 分片大小（字节），默认2MB */
  chunkSize?: number;
  /** Web Worker数量，默认4 */
  workerCount?: number;
  /** 是否启用自适应分片大小 */
  adaptiveChunkSize?: boolean;
  /** 每个分片处理完成时的回调函数 */
  callback?: (chunk: ChunkInfo & { isDone: boolean }) => void;
  /** 错误处理回调函数 */
  onError?: (error: UploadError) => void;
  /** 上传进度回调函数 */
  onProgress?: (progress: ProgressInfo) => void;
  /** 重试配置 */
  retry?: RetryConfig;
  /** 文件验证配置 */
  validation?: FileValidationConfig;
}

export enum ChunkUploadError {
  /** 文件读取错误 */
  FILE_READ_ERROR = "FILE_READ_ERROR",
  /** Web Worker执行错误 */
  WORKER_ERROR = "WORKER_ERROR",
  /** 哈希计算错误 */
  HASH_ERROR = "HASH_ERROR",
  /** 无效的文件 */
  INVALID_FILE = "INVALID_FILE",
  /** Web Worker加载错误 */
  WORKER_LOAD_ERROR = "WORKER_LOAD_ERROR",
}

export interface UploadError {
  /** 错误类型 */
  type: ChunkUploadError;
  /** 错误消息 */
  message: string;
  /** 发生错误的文件 */
  file?: File;
  /** 发生错误的分片索引 */
  chunkIndex?: number;
  /** 原始错误对象 */
  originalError?: Error;
}

export interface ProgressInfo {
  /** 当前处理的文件 */
  file: File;
  /** 已上传的字节数 */
  loaded: number;
  /** 文件总字节数 */
  total: number;
  /** 上传进度百分比（0-100） */
  percentage: number;
  /** 当前处理的分片索引 */
  chunkIndex?: number;
  /** 总分片数 */
  totalChunks?: number;
  /** 已处理的分片数 */
  processedChunks?: number;
}

export interface CancelController {
  /** 取消上传操作 */
  cancel: () => void;
  /** 检查是否已取消 */
  isCancelled: () => boolean;
}

export interface RetryConfig {
  /** 最大重试次数，默认3次 */
  maxRetries?: number;
  /** 重试延迟时间（毫秒），默认1000ms */
  retryDelay?: number;
  /** 重试延迟倍数（每次重试延迟时间 = retryDelay * retryDelayMultiplier^重试次数），默认2 */
  retryDelayMultiplier?: number;
}

export interface FileValidationConfig {
  /** 允许的文件MIME类型列表 */
  allowedTypes?: string[];
  /** 禁止的文件MIME类型列表 */
  blockedTypes?: string[];
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最小文件大小（字节） */
  minSize?: number;
  /** 自定义验证函数，返回true表示通过，返回字符串表示错误消息 */
  validate?: (file: File) => boolean | string;
}
