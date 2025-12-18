import { describe, it, expect } from 'vitest'
import { createCancelController } from '../src/utils/cancelController'

describe('createCancelController', () => {
	it('应该创建可用的取消控制器', () => {
		const controller = createCancelController()

		expect(controller).toHaveProperty('cancel')
		expect(controller).toHaveProperty('isCancelled')
		expect(typeof controller.cancel).toBe('function')
		expect(typeof controller.isCancelled).toBe('function')
	})

	it('初始状态应该未取消', () => {
		const controller = createCancelController()
		expect(controller.isCancelled()).toBe(false)
	})

	it('调用 cancel 后应该标记为已取消', () => {
		const controller = createCancelController()
		controller.cancel()
		expect(controller.isCancelled()).toBe(true)
	})
})
