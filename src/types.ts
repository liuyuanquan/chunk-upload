/**
 * 分片信息
 */
export interface ChunkInfo {
	/** 分片起始位置（字节） */
	start: number
	/** 分片结束位置（字节） */
	end: number
	/** 分片索引（从 0 开始） */
	index: number
	/** 分片的 SHA-256 哈希值（十六进制格式） */
	hash: string
}

/**
 * 文件信息
 */
export interface FileInfo {
	/** 文件名 */
	name: string
	/** 文件 MIME 类型 */
	type: string
	/** 文件大小（字节） */
	size: number
	/** 文件最后修改时间戳 */
	lastModified: number
	/** 文件的所有分片信息 */
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
 * Options for chunkUploadStream
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
	/** 当前处理的文件 */
	file: File
	/** 已处理的字节数 */
	loaded: number
	/** 总字节数 */
	total: number
	/** 进度百分比（0-100） */
	percentage: number
	/** 当前分片索引 */
	chunkIndex?: number
	/** 总分片数 */
	totalChunks?: number
	/** 已处理分片数 */
	processedChunks?: number
}

/**
 * 取消控制器
 * 用于取消正在进行的文件处理操作
 */
export interface CancelController {
	/** 取消操作 */
	cancel: () => void
	/** 检查是否已取消 */
	isCancelled: () => boolean
}

/**
 * 重试配置
 */
export interface RetryConfig {
	/** 最大重试次数，默认 3 */
	maxRetries?: number
	/** 重试延迟（毫秒），默认 1000 */
	retryDelay?: number
	/** 重试延迟倍数（指数退避），默认 2 */
	retryDelayMultiplier?: number
}

/**
 * 文件验证配置
 */
export interface FileValidationConfig {
	/** 允许的文件类型（MIME type），支持通配符如 'image/*' */
	allowedTypes?: string[]
	/** 禁止的文件类型（MIME type），支持通配符如 'image/*' */
	blockedTypes?: string[]
	/** 最大文件大小（字节） */
	maxSize?: number
	/** 最小文件大小（字节） */
	minSize?: number
	/** 自定义验证函数，返回 true 表示通过，返回字符串表示错误消息 */
	validate?: (file: File) => boolean | string
}
