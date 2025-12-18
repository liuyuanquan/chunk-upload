import type {
	ChunkInfo,
	UploadError,
	ProgressInfo,
	CancelController,
} from './types'
import { ChunkUploadError } from './types'
import { getWorkerPool } from './utils/workerPool'
import { createCancelController } from './utils/cancelController'
import {
	calculateChunkStrategy,
	calculateWorkerCount,
} from './utils/chunkStrategy'

/**
 * Chunk file into chunks using Web Workers
 * @param file - File to chunk
 * @param chunkSize - Size of each chunk in bytes (default: auto-calculated)
 * @param onError - 错误回调函数
 * @param onProgress - 进度回调函数
 * @param cancelController - 取消控制器
 * @param workerCount - Worker 数量（可选，默认自动计算）
 * @param adaptiveChunkSize - 是否启用自适应分片大小（默认 true）
 * @returns Promise that resolves to array of chunk info
 */
export function chunkFile(
	file: File,
	chunkSize?: number,
	onError?: (error: UploadError) => void,
	onProgress?: (progress: ProgressInfo) => void,
	cancelController?: CancelController,
	workerCount?: number,
	adaptiveChunkSize: boolean = true,
): Promise<ChunkInfo[]> {
	return new Promise((resolve, reject) => {
		// 验证文件
		if (!file || !(file instanceof File)) {
			const error: UploadError = {
				type: ChunkUploadError.INVALID_FILE,
				message: '无效的文件对象',
				file,
			}
			onError?.(error)
			reject(error)
			return
		}

		const result: ChunkInfo[] = []
		let finishCount = 0
		let processedBytes = 0
		let hasError = false
		// 先使用传入的 chunkSize 计算初始分片数量
		const initialChunkSize = chunkSize || 5 * 1024 * 1024
		let chunkCount = Math.ceil(file.size / initialChunkSize)
		const controller = cancelController || createCancelController()

		// 如果没有分片，直接返回空数组
		if (chunkCount === 0) {
			resolve([])
			return
		}

		// 检查是否已取消
		if (controller.isCancelled()) {
			reject(new Error('操作已取消'))
			return
		}

		// 计算最优分片策略
		let finalChunkSize = chunkSize
		let finalWorkerCount = workerCount

		if (adaptiveChunkSize && finalChunkSize === undefined) {
			const strategy = calculateChunkStrategy(file.size, workerCount)
			finalChunkSize = strategy.chunkSize
			finalWorkerCount = strategy.workerCount
		} else {
			// 如果没有指定 chunkSize，使用默认值
			finalChunkSize = finalChunkSize || 5 * 1024 * 1024
			// 如果没有指定 workerCount，根据分片数量计算
			if (finalWorkerCount === undefined) {
				finalWorkerCount = calculateWorkerCount(chunkCount)
			}
		}

		// 重新计算分片数量（如果分片大小改变了）
		const finalChunkCount = Math.ceil(file.size / finalChunkSize)

		// 获取 Worker 池实例
		const workerPool = getWorkerPool(finalWorkerCount, 'work.js')
		const workerChunkCount = Math.ceil(finalChunkCount / finalWorkerCount)
		const tasks: Array<Promise<ChunkInfo[]>> = []

		// 更新进度
		const updateProgress = (processedChunks: number, loadedBytes: number) => {
			if (onProgress) {
				const progress: ProgressInfo = {
					file,
					loaded: loadedBytes,
					total: file.size,
					percentage: Math.min(
						100,
						Math.round((loadedBytes / file.size) * 100),
					),
					processedChunks,
					totalChunks: finalChunkCount,
				}
				onProgress(progress)
			}
		}

		// 错误处理函数
		const handleError = (error: UploadError) => {
			if (hasError) return
			hasError = true
			onError?.(error)
			reject(error)
		}

		// 创建任务
		for (let i = 0; i < finalWorkerCount; i++) {
			const startIndex = i * workerChunkCount
			let endIndex = startIndex + workerChunkCount
			if (endIndex > finalChunkCount) {
				endIndex = finalChunkCount
			}

			// 如果 startIndex >= endIndex，跳过这个任务
			if (startIndex >= endIndex) {
				continue
			}

			// 创建 Promise 任务
			const taskPromise = new Promise<ChunkInfo[]>(
				(taskResolve, taskReject) => {
					// 检查是否已取消
					if (controller.isCancelled()) {
						taskReject(new Error('操作已取消'))
						return
					}

					workerPool.submitTask({
						file,
						CHUNK_SIZE: finalChunkSize,
						startIndex,
						endIndex,
						resolve: chunks => {
							if (hasError || controller.isCancelled()) return

							// 计算已处理的字节数
							chunks.forEach(chunk => {
								processedBytes += chunk.end - chunk.start
							})

							finishCount++
							updateProgress(finishCount, processedBytes)

							taskResolve(chunks)
						},
						reject: error => {
							if (controller.isCancelled()) {
								taskReject(new Error('操作已取消'))
								return
							}

							// 确保错误消息是字符串
							let errorMessage = 'Worker 处理失败'
							if (error instanceof Error) {
								errorMessage = error.message || errorMessage
							} else if (typeof error === 'string') {
								errorMessage = error
							} else if (error && typeof error === 'object') {
								// 如果是 UploadError 对象，提取 message
								if ('message' in error && typeof error.message === 'string') {
									errorMessage = error.message
								} else {
									errorMessage = JSON.stringify(error)
								}
							}

							const uploadError: UploadError = {
								type: ChunkUploadError.WORKER_ERROR,
								message: errorMessage,
								file,
								chunkIndex: startIndex,
								originalError: error instanceof Error ? error : undefined,
							}
							handleError(uploadError)
							taskReject(
								error instanceof Error ? error : new Error(errorMessage),
							)
						},
					})
				},
			)

			tasks.push(taskPromise)
		}

		// 等待所有任务完成
		Promise.all(tasks)
			.then(chunksArrays => {
				if (hasError || controller.isCancelled()) {
					if (controller.isCancelled()) {
						reject(new Error('操作已取消'))
					}
					return
				}

				// 合并所有分片结果
				chunksArrays.forEach((chunks, taskIndex) => {
					const startIndex = taskIndex * workerChunkCount
					chunks.forEach((chunk, chunkIndex) => {
						result[startIndex + chunkIndex] = chunk
					})
				})

				// 最终进度更新
				updateProgress(finalChunkCount, file.size)
				resolve(result)
			})
			.catch(error => {
				if (controller.isCancelled()) {
					reject(new Error('操作已取消'))
					return
				}

				if (!hasError) {
					const uploadError: UploadError = {
						type: ChunkUploadError.WORKER_ERROR,
						message: error instanceof Error ? error.message : String(error),
						file,
						originalError: error instanceof Error ? error : undefined,
					}
					handleError(uploadError)
				}
			})
	})
}
