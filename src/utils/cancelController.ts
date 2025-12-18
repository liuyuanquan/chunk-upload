import type { CancelController } from '../types'

/**
 * 创建取消控制器
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
