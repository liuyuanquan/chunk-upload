/**
 * 重试工具
 * 提供带指数退避的重试机制，用于处理可能失败的异步操作
 */

import type { RetryConfig } from "../types";

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
};

/**
 * 执行带重试的异步函数
 * 使用指数退避策略：每次重试延迟 = 上次延迟 × 倍数
 * @param fn - 要执行的异步函数
 * @param config - 重试配置（可选）
 * @returns Promise 成功返回结果，失败抛出错误
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | unknown;
  let delay = retryConfig.retryDelay;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retryConfig.maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= retryConfig.retryDelayMultiplier;
    }
  }

  throw lastError;
}
