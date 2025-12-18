/**
 * 重试工具函数
 */

import type { RetryConfig } from '../types'

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
	maxRetries: 3,
	retryDelay: 1000,
	retryDelayMultiplier: 2,
}

/**
 * 执行带重试的函数
 * @param fn - 要执行的函数
 * @param config - 重试配置
 * @returns Promise
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config?: RetryConfig,
): Promise<T> {
	const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
	let lastError: Error | unknown
	let delay = retryConfig.retryDelay

	for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error

			// 如果是最后一次尝试，直接抛出错误
			if (attempt === retryConfig.maxRetries) {
				throw error
			}

			// 等待后重试
			await new Promise(resolve => setTimeout(resolve, delay))
			delay *= retryConfig.retryDelayMultiplier
		}
	}

	throw lastError
}
