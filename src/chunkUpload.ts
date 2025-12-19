import type {
	FileInfo,
	FragmentUploadOptions,
	UploadError,
	CancelController,
} from './types'
import { ChunkUploadError } from './types'
import { chunkFile } from './chunkFile'
import { validateFile } from './utils/fileValidator'
import { createCancelController } from './utils/cancelController'
import { withRetry } from './utils/retry'

/**
 * 处理文件列表
 */
async function processFiles(
	files: File[],
	options: FragmentUploadOptions,
	cancelController: CancelController,
): Promise<FileInfo[]> {
	const {
		perCallback,
		lastCallback,
		chunkSize,
		workerCount,
		adaptiveChunkSize = true,
		onError,
		splitCallback,
		onProgress,
		validation,
		retry,
	} = options

	const results: FileInfo[] = []
	let fileCount = files.length

	for (const file of files) {
		// 检查是否已取消
		if (cancelController.isCancelled()) {
			throw new Error('操作已取消')
		}

		try {
			// 文件验证
			if (validation) {
				const validationError = validateFile(file, validation)
				if (validationError) {
					onError?.(validationError)
					continue
				}
			}

			// 使用重试机制处理文件
			const processFile = async () => {
				return await chunkFile(
					file,
					chunkSize,
					error => {
						onError?.(error)
					},
					onProgress,
					cancelController,
					workerCount,
					adaptiveChunkSize,
				)
			}

			const chunks = retry
				? await withRetry(processFile, retry)
				: await processFile()

			// 如果已取消，停止处理
			if (cancelController.isCancelled()) {
				throw new Error('操作已取消')
			}

			const fileInfo: FileInfo = {
				name: file.name,
				type: file.type,
				size: file.size,
				lastModified: file.lastModified,
				chunks,
			}

			// 分片完成回调
			splitCallback?.(fileInfo)

			fileCount--
			const isDone = fileCount === 0

			// 单个文件完成回调
			perCallback?.({ ...fileInfo, isDone })

			results.push(fileInfo)

			// 所有文件完成回调
			if (isDone) {
				lastCallback?.(results)
			}
		} catch (error) {
			if (cancelController.isCancelled()) {
				throw error
			}

			// 确保错误消息是字符串
			let errorMessage = '处理失败'
			let errorType: ChunkUploadError = ChunkUploadError.WORKER_ERROR

			if (error && typeof error === 'object' && 'type' in error) {
				// 如果已经是 UploadError 对象
				const uploadErr = error as UploadError
				errorType = uploadErr.type
				errorMessage = uploadErr.message || errorMessage
			} else if (error instanceof Error) {
				errorMessage = error.message || errorMessage
			} else if (typeof error === 'string') {
				errorMessage = error
			} else {
				errorMessage = String(error)
			}

			const uploadError: UploadError = {
				type: errorType,
				message: errorMessage,
				file,
				originalError: error instanceof Error ? error : undefined,
			}
			onError?.(uploadError)
			throw uploadError
		}
	}

	return results
}

/**
 * 文件分片上传（批量回调模式）
 * 文件的所有分片处理完成后才触发回调
 * @param input - 选择器字符串、File 对象、FileList 或 File 数组
 * @param options - 配置选项
 * @returns 选择器模式返回取消控制器，否则返回 Promise<FileInfo[]>
 */
export function chunkUpload(
	selector: string,
	options?: FragmentUploadOptions,
): CancelController
export function chunkUpload(
	file: File,
	options?: FragmentUploadOptions,
): Promise<FileInfo[]>
export function chunkUpload(
	files: FileList | File[],
	options?: FragmentUploadOptions,
): Promise<FileInfo[]>
export function chunkUpload(
	input: string | File | FileList | File[],
	options?: FragmentUploadOptions,
): CancelController | Promise<FileInfo[]> {
	const cancelController = createCancelController()

	// 如果输入是选择器字符串，返回取消控制器（事件监听模式）
	if (typeof input === 'string') {
		const el = document.querySelector(input) as HTMLInputElement
		if (!el) {
			throw new Error(`元素未找到: ${input}`)
		}

		el.onchange = async () => {
			const files = el.files ? Array.from(el.files) : []
			if (files.length === 0) return

			try {
				await processFiles(files, options || {}, cancelController)
			} catch (error) {
				// 错误已在 processFiles 中处理
			}
		}

		return cancelController
	}

	// 如果输入是 File 或 FileList/File[]，返回 Promise（直接处理模式）
	const files = input instanceof File ? [input] : Array.from(input)

	return processFiles(files, options || {}, cancelController)
}
