import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createChunk, clearHashCache, getCacheSize } from '../src/createChunk'

describe('createChunk', () => {
	beforeEach(() => {
		clearHashCache()
	})

	it('应该正确创建分片', async () => {
		const file = new File(['test content'], 'test.txt', {
			type: 'text/plain',
		})

		const chunk = await createChunk(file, 0, 5)

		expect(chunk).toHaveProperty('start', 0)
		expect(chunk).toHaveProperty('end', 5)
		expect(chunk).toHaveProperty('index', 0)
		expect(chunk).toHaveProperty('hash')
		expect(typeof chunk.hash).toBe('string')
	})

	it('应该正确处理文件边界', async () => {
		const file = new File(['test'], 'test.txt', { type: 'text/plain' })

		const chunk = await createChunk(file, 0, 10)

		expect(chunk.end).toBeLessThanOrEqual(file.size)
	})

	it('应该缓存相同内容的哈希值', async () => {
		const file = new File(['test content'], 'test.txt', {
			type: 'text/plain',
		})

		const chunk1 = await createChunk(file, 0, 5)
		const chunk2 = await createChunk(file, 0, 5)

		expect(chunk1.hash).toBe(chunk2.hash)
	})

	it('应该清理缓存', () => {
		clearHashCache()
		expect(getCacheSize()).toBe(0)
	})
})
