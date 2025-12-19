/**
 * 分片策略工具
 * 根据文件大小自动计算最优的分片大小和 Worker 数量
 */

/**
 * 分片策略配置
 */
export interface ChunkStrategy {
  /** 分片大小（字节） */
  chunkSize: number;
  /** Worker 数量 */
  workerCount: number;
}

/**
 * 根据文件大小计算最优分片策略
 * @param fileSize - 文件大小（字节）
 * @param maxWorkers - 最大 Worker 数量，默认 CPU 核心数
 * @returns 分片策略配置
 */
export function calculateChunkStrategy(
  fileSize: number,
  maxWorkers?: number
): ChunkStrategy {
  const defaultMaxWorkers = navigator.hardwareConcurrency || 4;
  const maxWorkerCount = maxWorkers || defaultMaxWorkers;

  // 小文件（< 10MB）：1MB 分片，最多 2 个 Worker
  if (fileSize < 10 * 1024 * 1024) {
    return {
      chunkSize: 1 * 1024 * 1024,
      workerCount: Math.min(2, maxWorkerCount),
    };
  }

  // 中等文件（10MB - 100MB）：5MB 分片，最多 4 个 Worker
  if (fileSize < 100 * 1024 * 1024) {
    return {
      chunkSize: 5 * 1024 * 1024,
      workerCount: Math.min(4, maxWorkerCount),
    };
  }

  // 大文件（100MB - 1GB）：10MB 分片，最多 6 个 Worker
  if (fileSize < 1024 * 1024 * 1024) {
    return {
      chunkSize: 10 * 1024 * 1024,
      workerCount: Math.min(6, maxWorkerCount),
    };
  }

  // 超大文件（>= 1GB）：20MB 分片，使用所有可用 Worker
  return {
    chunkSize: 20 * 1024 * 1024,
    workerCount: maxWorkerCount,
  };
}

/**
 * 计算最优 Worker 数量
 * @param chunkCount - 分片总数
 * @param maxWorkers - 最大 Worker 数量，默认 CPU 核心数
 * @returns Worker 数量（1 到 maxWorkers 之间）
 */
export function calculateWorkerCount(
  chunkCount: number,
  maxWorkers?: number
): number {
  const defaultMaxWorkers = navigator.hardwareConcurrency || 4;
  const maxWorkerCount = maxWorkers || defaultMaxWorkers;

  if (chunkCount < maxWorkerCount) {
    return Math.max(1, chunkCount);
  }

  return maxWorkerCount;
}
