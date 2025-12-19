/**
 * 取消控制器工具
 * 提供取消操作的机制，使用状态标志实现
 */

import type { CancelController } from '../types'

/**
 * 创建取消控制器
 * @returns CancelController 包含 cancel() 和 isCancelled() 方法
 */
export function createCancelController(): CancelController {
	let cancelled = false

	return {
		cancel: () => {
			cancelled = true
		},
		isCancelled: () => cancelled,
	}
}
