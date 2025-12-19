/**
 * 文件分片处理模块
 * 
 * 此模块负责将文件分割成多个分片，并为每个分片计算 SHA-256 哈希值。
 * 使用 LRU（最近最少使用）缓存策略来优化重复分片的哈希计算性能。
 * 
 * 主要功能：
 * - 读取文件分片数据
 * - 计算 SHA-256 哈希值（使用 Web Crypto API）
 * - 管理哈希缓存（LRU 策略，限制内存使用）
 */

import type { ChunkInfo, UploadError } from './types'
import { ChunkUploadError } from './types'
import { calculateHash } from './utils/hashOptimizer'

/**
 * 哈希缓存的最大条目数
 * 使用 LRU 策略限制内存使用，避免内存泄漏
 */
const MAX_CACHE_SIZE = 100

/**
 * 哈希缓存映射表
 * Key: ArrayBuffer（文件分片的二进制数据）
 * Value: string（SHA-256 哈希值，十六进制格式）
 */
const hashMap = new Map<ArrayBuffer, string>()

/**
 * 清理缓存（LRU 策略）
 * 当缓存大小超过 MAX_CACHE_SIZE 时，删除最旧的条目
 * Map 保持插入顺序，所以最早插入的条目会被优先删除
 */
function cleanupCache(): void {
	if (hashMap.size > MAX_CACHE_SIZE) {
		// 计算需要删除的条目数量
		const entriesToDelete = hashMap.size - MAX_CACHE_SIZE
		let deleted = 0
		
		// 遍历 Map 的键（按插入顺序），删除最旧的条目
		for (const key of hashMap.keys()) {
			if (deleted >= entriesToDelete) break
			hashMap.delete(key)
			deleted++
		}
	}
}

/**
 * 创建文件分片并计算 SHA-256 哈希值
 * 
 * 此函数将文件分割成指定大小的分片，读取分片数据，并计算 SHA-256 哈希值。
 * 使用 LRU 缓存策略优化重复分片的哈希计算性能。
 * 
 * 工作流程：
 * 1. 计算分片的起始和结束位置
 * 2. 使用 FileReader 读取文件分片数据
 * 3. 检查哈希缓存，如果已缓存则直接返回
 * 4. 如果未缓存，使用 Web Crypto API 计算 SHA-256 哈希值
 * 5. 将哈希值存入缓存并清理旧缓存
 * 6. 返回分片信息（包含起始位置、结束位置、索引和哈希值）
 * 
 * @param file - 要分片的文件对象
 * @param index - 分片索引（从 0 开始）
 * @param chunkSize - 每个分片的大小（字节）
 * @returns Promise<ChunkInfo> 返回包含分片信息和 SHA-256 哈希值的 Promise
 */
export function createChunk(
	file: File,
	index: number,
	chunkSize: number,
): Promise<ChunkInfo> {
	return new Promise((resolve, reject) => {
		// ========== 计算分片范围 ==========
		const start = index * chunkSize
		const end = Math.min(start + chunkSize, file.size)
		
		// 创建 FileReader 实例用于读取文件分片
		const fileReader = new FileReader()

		// ========== 文件读取错误处理 ==========
		fileReader.onerror = () => {
			const error: UploadError = {
				type: ChunkUploadError.FILE_READ_ERROR,
				message: `读取文件分片失败: index=${index}, start=${start}, end=${end}`,
				file,
				chunkIndex: index,
			}
			reject(error)
		}

		// ========== 文件读取成功处理 ==========
		fileReader.onload = e => {
			try {
				// 获取读取的文件分片数据（ArrayBuffer）
				const fileBuffer = e.target?.result as ArrayBuffer
				
				// 验证读取结果
				if (!fileBuffer) {
					const error: UploadError = {
						type: ChunkUploadError.FILE_READ_ERROR,
						message: `文件读取结果为空: index=${index}`,
						file,
						chunkIndex: index,
					}
					reject(error)
					return
				}

				// ========== 哈希缓存检查 ==========
				// 检查该分片数据是否已经计算过哈希值
				if (hashMap.has(fileBuffer)) {
					// 如果已缓存，直接使用缓存的哈希值
					const hash = hashMap.get(fileBuffer)!
					resolve({
						start,
						end,
						index,
						hash,
					})
				} else {
					// ========== 计算哈希值 ==========
					// 如果未缓存，使用 Web Crypto API 计算 SHA-256 哈希值（异步）
					calculateHash(fileBuffer)
						.then(hash => {
							// 将哈希值存入缓存
							hashMap.set(fileBuffer, hash)

							// 清理缓存（如果超过最大大小）
							cleanupCache()

							// 返回分片信息
							resolve({
								start,
								end,
								index,
								hash,
							})
						})
						.catch(error => {
							// 哈希计算失败，返回错误
							const uploadError: UploadError = {
								type: ChunkUploadError.HASH_ERROR,
								message: `计算哈希失败: ${error instanceof Error ? error.message : String(error)}`,
								file,
								chunkIndex: index,
								originalError: error instanceof Error ? error : undefined,
							}
							reject(uploadError)
						})
				}
			} catch (error) {
				// ========== 异常处理 ==========
				// 处理其他可能的错误（如类型转换错误等）
				const uploadError: UploadError = {
					type: ChunkUploadError.FILE_READ_ERROR,
					message: `处理文件分片时出错: ${error instanceof Error ? error.message : String(error)}`,
					file,
					chunkIndex: index,
					originalError: error instanceof Error ? error : undefined,
				}
				reject(uploadError)
			}
		}

		// ========== 开始读取文件分片 ==========
		// 使用 FileReader 异步读取文件分片的二进制数据
		fileReader.readAsArrayBuffer(file.slice(start, end))
	})
}

/**
 * 清理所有哈希缓存
 * 
 * 清空所有已缓存的哈希值，释放内存。
 * 通常在需要重置缓存或释放内存时调用。
 */
export function clearHashCache(): void {
	hashMap.clear()
}

/**
 * 获取当前哈希缓存的大小
 * 
 * @returns 当前缓存中哈希条目的数量
 */
export function getCacheSize(): number {
	return hashMap.size
}
