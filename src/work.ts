/**
 * Web Worker 文件
 * 
 * 此文件是一个独立的 Web Worker 脚本，用于在后台线程中并行处理文件分片。
 * Worker 接收主线程发送的分片任务，并行处理多个分片，并返回处理结果。
 * 
 * 工作流程：
 * 1. 主线程通过 postMessage 发送分片任务（包含文件、分片大小、起始和结束索引）
 * 2. Worker 验证任务数据
 * 3. Worker 并行处理指定范围内的所有分片（计算 MD5 哈希）
 * 4. Worker 通过 postMessage 返回处理结果或错误信息
 * 
 * 优势：
 * - 在独立线程中运行，不阻塞主线程
 * - 可以并行处理多个分片，充分利用多核 CPU
 * - 通过 Worker 池复用，避免频繁创建和销毁 Worker 实例
 */

import { createChunk } from './createChunk'
import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'

/**
 * Worker 消息接口
 * 主线程发送给 Worker 的任务数据格式
 */
interface WorkerMessage {
	/** 要处理的文件对象 */
	file: File
	/** 每个分片的大小（字节） */
	CHUNK_SIZE: number
	/** 要处理的分片起始索引（包含） */
	startIndex: number
	/** 要处理的分片结束索引（不包含） */
	endIndex: number
}

/**
 * Worker 消息处理函数
 * 接收主线程发送的分片任务，并行处理并返回结果
 * 
 * @param e - 消息事件，包含分片任务数据
 */
onmessage = async (e: MessageEvent<WorkerMessage>) => {
	try {
		const { file, CHUNK_SIZE, startIndex, endIndex } = e.data

		// ========== 数据验证 ==========
		// 验证 File 对象
		if (!file || !(file instanceof File)) {
			throw new Error('无效的 File 对象: file 不存在或不是 File 实例')
		}

		// 验证分片大小
		if (typeof CHUNK_SIZE !== 'number' || CHUNK_SIZE <= 0) {
			throw new Error(`无效的分片大小: ${CHUNK_SIZE} (必须是正数)`)
		}

		// 验证索引类型
		if (typeof startIndex !== 'number' || typeof endIndex !== 'number') {
			throw new Error(
				`无效的索引范围: startIndex=${startIndex}, endIndex=${endIndex}`,
			)
		}

		// 验证索引范围有效性
		if (startIndex >= endIndex) {
			throw new Error(
				`无效的索引范围: startIndex (${startIndex}) >= endIndex (${endIndex})`,
			)
		}

		// ========== 并行处理分片 ==========
		// 创建 Promise 数组，用于并行处理指定范围内的所有分片
		const promises: Promise<ChunkInfo>[] = []

		// 遍历指定范围内的所有分片索引，创建处理任务
		for (let i = startIndex; i < endIndex; i++) {
			promises.push(createChunk(file, i, CHUNK_SIZE))
		}

		// 等待所有分片处理完成
		const results = await Promise.all(promises)

		// ========== 返回成功结果 ==========
		// 向主线程发送成功消息，包含所有分片的处理结果
		postMessage({ success: true, data: results })
	} catch (error) {
		// 发送错误信息回主线程
		let uploadError: UploadError

		if (
			error &&
			typeof error === 'object' &&
			'type' in error &&
			'message' in error
		) {
			// 如果已经是 UploadError 对象
			uploadError = error as UploadError
		} else {
			// 创建新的 UploadError
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

// 监听全局错误
self.addEventListener('error', event => {
	console.error('[Worker] 全局错误:', event.message || '未知错误')
})

// 监听未处理的 Promise 拒绝
self.addEventListener('unhandledrejection', event => {
	console.error('[Worker] 未处理的 Promise 拒绝:', event.reason)
})
