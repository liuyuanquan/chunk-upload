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
 * 将文件分片处理（使用 Web Workers 并行处理）
 *
 * 该函数会将文件分割成多个分片，并使用 Worker 池并行处理每个分片。
 * 每个分片会计算 MD5 哈希值，最终返回所有分片的信息。
 *
 * @param file - 要处理的文件对象
 * @param chunkSize - 每个分片的大小（字节），未指定时根据文件大小自动计算
 * @param onError - 错误回调函数，当处理过程中发生错误时调用
 * @param onProgress - 进度回调函数，实时更新处理进度
 * @param cancelController - 取消控制器，用于取消正在进行的操作
 * @param workerCount - Worker 数量，未指定时根据文件大小和分片数量自动计算
 * @param adaptiveChunkSize - 是否启用自适应分片大小，默认 true（根据文件大小自动调整分片大小和 Worker 数量）
 * @returns Promise，解析为分片信息数组
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

		// 结果数组，存储所有分片信息
		const result: ChunkInfo[] = []
		// 已完成的任务数量
		let finishCount = 0
		// 已处理的字节数
		let processedBytes = 0
		// 是否已发生错误
		let hasError = false

		// 计算初始分片数量（使用传入的 chunkSize 或默认值 5MB）
		const initialChunkSize = chunkSize || 5 * 1024 * 1024
		let chunkCount = Math.ceil(file.size / initialChunkSize)
		// 创建或使用传入的取消控制器
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
		// 如果启用自适应模式且未指定分片大小，根据文件大小自动计算
		let finalChunkSize = chunkSize
		let finalWorkerCount = workerCount

		if (adaptiveChunkSize && finalChunkSize === undefined) {
			// 自适应模式：根据文件大小计算最优分片大小和 Worker 数量
			const strategy = calculateChunkStrategy(file.size, workerCount)
			finalChunkSize = strategy.chunkSize
			finalWorkerCount = strategy.workerCount
		} else {
			// 手动模式：使用指定的分片大小或默认值
			finalChunkSize = finalChunkSize || 5 * 1024 * 1024
			// 如果未指定 Worker 数量，根据分片数量计算
			if (finalWorkerCount === undefined) {
				finalWorkerCount = calculateWorkerCount(chunkCount)
			}
		}

		// 使用最终确定的分片大小重新计算分片数量
		const finalChunkCount = Math.ceil(file.size / finalChunkSize)

		// 获取 Worker 池实例（复用 Worker，提升性能）
		const workerPool = getWorkerPool(finalWorkerCount, 'work.js')
		// 计算每个 Worker 需要处理的分片数量
		const workerChunkCount = Math.ceil(finalChunkCount / finalWorkerCount)
		// 存储所有任务的 Promise
		const tasks: Array<Promise<ChunkInfo[]>> = []

		/**
		 * 更新处理进度
		 * @param processedChunks - 已处理的分片数量
		 * @param loadedBytes - 已处理的字节数
		 */
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

		/**
		 * 统一错误处理函数
		 * 确保错误只被处理一次，避免重复回调
		 * @param error - 上传错误对象
		 */
		const handleError = (error: UploadError) => {
			if (hasError) return
			hasError = true
			onError?.(error)
			reject(error)
		}

		// 为每个 Worker 创建任务
		// 将分片范围分配给不同的 Worker 并行处理
		for (let i = 0; i < finalWorkerCount; i++) {
			// 计算当前 Worker 负责的分片范围 [startIndex, endIndex)
			const startIndex = i * workerChunkCount
			let endIndex = startIndex + workerChunkCount
			// 确保不超过总分片数
			if (endIndex > finalChunkCount) {
				endIndex = finalChunkCount
			}

			// 如果分片范围无效，跳过该任务
			if (startIndex >= endIndex) {
				continue
			}

			// 创建 Promise 任务，等待 Worker 处理完成
			const taskPromise = new Promise<ChunkInfo[]>(
				(taskResolve, taskReject) => {
					// 检查是否已取消
					if (controller.isCancelled()) {
						taskReject(new Error('操作已取消'))
						return
					}

					// 提交任务到 Worker 池
					workerPool.submitTask({
						file,
						CHUNK_SIZE: finalChunkSize,
						startIndex,
						endIndex,
						// Worker 处理成功回调
						resolve: chunks => {
							// 如果已发生错误或已取消，忽略结果
							if (hasError || controller.isCancelled()) return

							// 累加已处理的字节数
							chunks.forEach(chunk => {
								processedBytes += chunk.end - chunk.start
							})

							// 更新完成计数和进度
							finishCount++
							updateProgress(finishCount, processedBytes)

							// 返回该 Worker 处理的分片结果
							taskResolve(chunks)
						},
						// Worker 处理失败回调
						reject: error => {
							// 如果已取消，直接拒绝
							if (controller.isCancelled()) {
								taskReject(new Error('操作已取消'))
								return
							}

							// 提取错误消息（支持多种错误类型）
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

							// 构造统一的错误对象
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

			// 将任务添加到任务数组
			tasks.push(taskPromise)
		}

		// 等待所有 Worker 任务完成
		Promise.all(tasks)
			.then(chunksArrays => {
				// 检查是否已发生错误或已取消
				if (hasError || controller.isCancelled()) {
					if (controller.isCancelled()) {
						reject(new Error('操作已取消'))
					}
					return
				}

				// 合并所有 Worker 返回的分片结果
				// 按照原始分片索引顺序排列
				chunksArrays.forEach((chunks, taskIndex) => {
					const startIndex = taskIndex * workerChunkCount
					chunks.forEach((chunk, chunkIndex) => {
						result[startIndex + chunkIndex] = chunk
					})
				})

				// 更新最终进度（100%）
				updateProgress(finalChunkCount, file.size)
				// 返回所有分片信息
				resolve(result)
			})
			.catch(error => {
				// 处理 Promise.all 的异常情况
				if (controller.isCancelled()) {
					reject(new Error('操作已取消'))
					return
				}

				// 如果还没有处理过错误，统一处理
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
