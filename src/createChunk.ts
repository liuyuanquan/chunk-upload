/**
 * 文件分片处理模块
 * 将文件分割成多个分片，并为每个分片计算 SHA-256 哈希值
 * 使用 LRU 缓存策略优化重复分片的哈希计算性能
 */

import type { ChunkInfo, UploadError } from "./types";
import { ChunkUploadError } from "./types";
import { calculateHash } from "./utils/hashOptimizer";

const MAX_CACHE_SIZE = 100;
const hashMap = new Map<ArrayBuffer, string>();

/**
 * 清理缓存（LRU 策略）
 */
function cleanupCache(): void {
  if (hashMap.size > MAX_CACHE_SIZE) {
    const entriesToDelete = hashMap.size - MAX_CACHE_SIZE;
    let deleted = 0;
    for (const key of hashMap.keys()) {
      if (deleted >= entriesToDelete) break;
      hashMap.delete(key);
      deleted++;
    }
  }
}

/**
 * 创建文件分片并计算 SHA-256 哈希值
 * @param file - 要分片的文件对象
 * @param index - 分片索引（从 0 开始）
 * @param chunkSize - 分片大小（字节）
 * @returns Promise<ChunkInfo> 分片信息
 */
export async function createChunk(
  file: File,
  index: number,
  chunkSize: number
): Promise<ChunkInfo> {
  const start = index * chunkSize;
  const end = Math.min(start + chunkSize, file.size);

  try {
    const blob = file.slice(start, end);
    const fileBuffer = await blob.arrayBuffer();

    if (hashMap.has(fileBuffer)) {
      const hash = hashMap.get(fileBuffer)!;
      return {
        start,
        end,
        index,
        hash,
      };
    }

    const hash = await calculateHash(fileBuffer);
    hashMap.set(fileBuffer, hash);
    cleanupCache();

    return {
      start,
      end,
      index,
      hash,
    };
  } catch (error) {
    const uploadError: UploadError = {
      type:
        error instanceof Error && error.message.includes("哈希")
          ? ChunkUploadError.HASH_ERROR
          : ChunkUploadError.FILE_READ_ERROR,
      message: `处理文件分片失败: ${error instanceof Error ? error.message : String(error)}`,
      file,
      chunkIndex: index,
      originalError: error instanceof Error ? error : undefined,
    };
    throw uploadError;
  }
}
