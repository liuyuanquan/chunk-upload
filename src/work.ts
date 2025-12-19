/**
 * Web Worker 文件
 * 在后台线程中并行处理文件分片，计算 SHA-256 哈希值
 */

import { createChunk } from './createChunk'
import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'

interface WorkerMessage {
	file: File
	CHUNK_SIZE: number
	startIndex: number
	endIndex: number
}

/**
 * Worker 消息处理函数
 */
onmessage = async (e: MessageEvent<WorkerMessage>) => {
	try {
		const { file, CHUNK_SIZE, startIndex, endIndex } = e.data

		// 数据验证
		if (!file || !(file instanceof File)) {
			throw new Error('无效的 File 对象: file 不存在或不是 File 实例')
		}

		if (typeof CHUNK_SIZE !== 'number' || CHUNK_SIZE <= 0) {
			throw new Error(`无效的分片大小: ${CHUNK_SIZE} (必须是正数)`)
		}

		if (typeof startIndex !== 'number' || typeof endIndex !== 'number') {
			throw new Error(
				`无效的索引范围: startIndex=${startIndex}, endIndex=${endIndex}`,
			)
		}

		if (startIndex >= endIndex) {
			throw new Error(
				`无效的索引范围: startIndex (${startIndex}) >= endIndex (${endIndex})`,
			)
		}

		// 并行处理分片
		const promises: Promise<ChunkInfo>[] = []
		for (let i = startIndex; i < endIndex; i++) {
			promises.push(createChunk(file, i, CHUNK_SIZE))
		}

		const results = await Promise.all(promises)
		postMessage({ success: true, data: results })
	} catch (error) {
		let uploadError: UploadError

		if (
			error &&
			typeof error === 'object' &&
			'type' in error &&
			'message' in error
		) {
			uploadError = error as UploadError
		} else {
			let errorMessage = 'Worker 处理失败'

			if (error instanceof Error) {
				errorMessage = error.message || errorMessage
			} else if (typeof error === 'string') {
				errorMessage = error
			} else {
				errorMessage = String(error)
			}

			uploadError = {
				type: ChunkUploadError.WORKER_ERROR,
				message: errorMessage,
				file: e.data?.file,
				chunkIndex: e.data?.startIndex,
				originalError: error instanceof Error ? error : undefined,
			}
		}

		postMessage({ success: false, error: uploadError })
	}
}

self.addEventListener('error', event => {
	console.error('[Worker] 全局错误:', event.message || '未知错误')
})

self.addEventListener('unhandledrejection', event => {
	console.error('[Worker] 未处理的 Promise 拒绝:', event.reason)
})
