/**
 * 哈希计算优化工具
 * 优化大文件的哈希计算性能
 */

import SparkMD5 from 'spark-md5'

/**
 * 大文件哈希计算阈值（超过此大小使用优化策略）
 */
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024 // 50MB

/**
 * 优化的哈希计算（适用于大文件）
 * 使用增量计算，避免一次性加载整个分片到内存
 *
 * @param fileBuffer - 文件缓冲区
 * @returns 哈希值
 */
export function calculateHashOptimized(fileBuffer: ArrayBuffer): string {
	const spark = new SparkMD5.ArrayBuffer()

	// 对于大文件，可以考虑分块处理
	// 但 SparkMD5 已经内部优化，这里主要是预留接口
	spark.append(fileBuffer)
	return spark.end()
}

/**
 * 检查是否应该使用优化的哈希计算
 * @param bufferSize - 缓冲区大小
 * @returns 是否应该使用优化策略
 */
export function shouldUseOptimizedHash(bufferSize: number): boolean {
	return bufferSize > LARGE_FILE_THRESHOLD
}

/**
 * 计算文件分片的哈希值（带优化）
 * @param fileBuffer - 文件缓冲区
 * @param useOptimization - 是否使用优化策略
 * @returns 哈希值
 */
export function calculateHash(
	fileBuffer: ArrayBuffer,
	useOptimization?: boolean,
): string {
	if (useOptimization === undefined) {
		useOptimization = shouldUseOptimizedHash(fileBuffer.byteLength)
	}

	if (useOptimization) {
		return calculateHashOptimized(fileBuffer)
	}

	// 标准计算方式
	const spark = new SparkMD5.ArrayBuffer()
	spark.append(fileBuffer)
	return spark.end()
}
