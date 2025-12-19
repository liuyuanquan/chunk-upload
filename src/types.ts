export interface ChunkInfo {
	start: number
	end: number
	index: number
	hash: string
}

export interface FileInfo {
	name: string
	type: string
	size: number
	lastModified: number
	chunks: ChunkInfo[]
}

export interface FragmentUploadOptions {
	perCallback?: (fileInfo: FileInfo & { isDone: boolean }) => void
	lastCallback?: (filesInfo: FileInfo[]) => void
	splitCallback?: (fileInfo: FileInfo) => void
	chunkSize?: number
	workerCount?: number
	adaptiveChunkSize?: boolean
	onError?: (error: UploadError) => void
	onProgress?: (progress: ProgressInfo) => void
	retry?: RetryConfig
	validation?: FileValidationConfig
}

export interface FragmentUpload1Options {
	chunkSize?: number
	workerCount?: number
	adaptiveChunkSize?: boolean
	callback?: (chunk: ChunkInfo & { isDone: boolean }) => void
	onError?: (error: UploadError) => void
	onProgress?: (progress: ProgressInfo) => void
	retry?: RetryConfig
	validation?: FileValidationConfig
}

export enum ChunkUploadError {
	FILE_READ_ERROR = 'FILE_READ_ERROR',
	WORKER_ERROR = 'WORKER_ERROR',
	HASH_ERROR = 'HASH_ERROR',
	INVALID_FILE = 'INVALID_FILE',
	WORKER_LOAD_ERROR = 'WORKER_LOAD_ERROR',
}

export interface UploadError {
	type: ChunkUploadError
	message: string
	file?: File
	chunkIndex?: number
	originalError?: Error
}

export interface ProgressInfo {
	file: File
	loaded: number
	total: number
	percentage: number
	chunkIndex?: number
	totalChunks?: number
	processedChunks?: number
}

export interface CancelController {
	cancel: () => void
	isCancelled: () => boolean
}

export interface RetryConfig {
	maxRetries?: number
	retryDelay?: number
	retryDelayMultiplier?: number
}

export interface FileValidationConfig {
	allowedTypes?: string[]
	blockedTypes?: string[]
	maxSize?: number
	minSize?: number
	validate?: (file: File) => boolean | string
}
