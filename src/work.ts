/**
 * Web Worker 文件
 * 在后台线程中并行处理文件分片，计算 SHA-256 哈希值
 * 支持两种模式：workerpool exec 和 postMessage
 */

import { createChunk } from "./createChunk";
import type { ChunkInfo } from "./types";

/**
 * 处理文件分片（供 workerpool exec 使用）
 * @param file - 文件对象
 * @param CHUNK_SIZE - 分片大小（字节）
 * @param startIndex - 分片起始索引
 * @param endIndex - 分片结束索引
 * @returns 分片信息数组
 */
export async function processChunks(
  file: File,
  CHUNK_SIZE: number,
  startIndex: number,
  endIndex: number
): Promise<ChunkInfo[]> {
  return processChunksInternal(file, CHUNK_SIZE, startIndex, endIndex);
}

/**
 * 内部处理函数
 */
async function processChunksInternal(
  file: File,
  CHUNK_SIZE: number,
  startIndex: number,
  endIndex: number
): Promise<ChunkInfo[]> {
  // 数据验证
  if (!file || !(file instanceof File)) {
    throw new Error("无效的 File 对象: file 不存在或不是 File 实例");
  }

  if (typeof CHUNK_SIZE !== "number" || CHUNK_SIZE <= 0) {
    throw new Error(`无效的分片大小: ${CHUNK_SIZE} (必须是正数)`);
  }

  if (typeof startIndex !== "number" || typeof endIndex !== "number") {
    throw new Error(
      `无效的索引范围: startIndex=${startIndex}, endIndex=${endIndex}`
    );
  }

  if (startIndex >= endIndex) {
    throw new Error(
      `无效的索引范围: startIndex (${startIndex}) >= endIndex (${endIndex})`
    );
  }

  // 并行处理分片
  const promises: Promise<ChunkInfo>[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    promises.push(createChunk(file, i, CHUNK_SIZE));
  }

  return Promise.all(promises);
}

/**
 * 消息处理器（供 postMessage 使用）
 */
onmessage = async (e: MessageEvent) => {
  try {
    const { file, CHUNK_SIZE, startIndex, endIndex } = e.data;

    // 验证数据
    if (!file) {
      throw new Error("缺少 file 参数");
    }
    if (typeof CHUNK_SIZE !== "number" || CHUNK_SIZE <= 0) {
      throw new Error(`无效的 CHUNK_SIZE: ${CHUNK_SIZE}`);
    }
    if (typeof startIndex !== "number" || typeof endIndex !== "number") {
      throw new Error(
        `无效的索引: startIndex=${startIndex}, endIndex=${endIndex}`
      );
    }

    const results = await processChunksInternal(
      file,
      CHUNK_SIZE,
      startIndex,
      endIndex
    );

    postMessage({ success: true, data: results });
  } catch (error) {
    let errorMessage = "Worker 处理失败";
    let errorStack: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      errorStack = error.stack;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    // 发送详细的错误信息
    postMessage({
      success: false,
      error: {
        message: errorMessage,
        stack: errorStack,
        originalError: error instanceof Error ? error.message : String(error),
      },
    });
  }
};

// 全局错误处理
self.addEventListener("error", (event) => {
  console.error("[Worker] 全局错误:", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("[Worker] 未处理的 Promise 拒绝:", event.reason);
  // 发送错误消息到主线程
  postMessage({
    success: false,
    error: {
      message: `未处理的 Promise 拒绝: ${
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason)
      }`,
      originalError:
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason),
    },
  });
});
