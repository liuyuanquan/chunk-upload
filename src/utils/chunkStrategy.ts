/**
 * 分片策略工具
 * 根据文件大小自动调整分片大小和 Worker 数量
 */

/**
 * 分片策略配置
 */
export interface ChunkStrategy {
	chunkSize: number // 分片大小（字节）
	workerCount: number // Worker 数量
}

/**
 * 根据文件大小计算最优分片策略
 * @param fileSize - 文件大小（字节）
 * @param maxWorkers - 最大 Worker 数量，默认 CPU 核心数
 * @returns 分片策略
 */
export function calculateChunkStrategy(
	fileSize: number,
	maxWorkers?: number,
): ChunkStrategy {
	const defaultMaxWorkers = navigator.hardwareConcurrency || 4
	const maxWorkerCount = maxWorkers || defaultMaxWorkers

	// 小文件（< 10MB）：使用较小分片，较少 Worker
	if (fileSize < 10 * 1024 * 1024) {
		return {
			chunkSize: 1 * 1024 * 1024, // 1MB
			workerCount: Math.min(2, maxWorkerCount),
		}
	}

	// 中等文件（10MB - 100MB）：使用中等分片，中等 Worker
	if (fileSize < 100 * 1024 * 1024) {
		return {
			chunkSize: 5 * 1024 * 1024, // 5MB
			workerCount: Math.min(4, maxWorkerCount),
		}
	}

	// 大文件（100MB - 1GB）：使用较大分片，较多 Worker
	if (fileSize < 1024 * 1024 * 1024) {
		return {
			chunkSize: 10 * 1024 * 1024, // 10MB
			workerCount: Math.min(6, maxWorkerCount),
		}
	}

	// 超大文件（>= 1GB）：使用大分片，最多 Worker
	return {
		chunkSize: 20 * 1024 * 1024, // 20MB
		workerCount: maxWorkerCount,
	}
}

/**
 * 计算最优 Worker 数量
 * @param chunkCount - 分片数量
 * @param maxWorkers - 最大 Worker 数量
 * @returns Worker 数量
 */
export function calculateWorkerCount(
	chunkCount: number,
	maxWorkers?: number,
): number {
	const defaultMaxWorkers = navigator.hardwareConcurrency || 4
	const maxWorkerCount = maxWorkers || defaultMaxWorkers

	// 如果分片数量少于 Worker 数量，使用分片数量
	if (chunkCount < maxWorkerCount) {
		return Math.max(1, chunkCount)
	}

	return maxWorkerCount
}
