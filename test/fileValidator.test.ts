import { describe, it, expect } from 'vitest'
import { validateFile } from '../src/utils/fileValidator'
import { ChunkUploadError } from '../src/types'

describe('validateFile', () => {
	it('应该通过有效的文件验证', () => {
		const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
		const result = validateFile(file, {
			allowedTypes: ['image/*'],
			maxSize: 10 * 1024 * 1024,
		})

		expect(result).toBeNull()
	})

	it('应该拒绝不允许的文件类型', () => {
		const file = new File(['content'], 'test.txt', { type: 'text/plain' })
		const result = validateFile(file, {
			allowedTypes: ['image/*'],
		})

		expect(result).not.toBeNull()
		expect(result?.type).toBe(ChunkUploadError.INVALID_FILE)
	})

	it('应该拒绝超过最大大小的文件', () => {
		const file = new File(['x'.repeat(1024 * 1024)], 'test.txt', {
			type: 'text/plain',
		})
		const result = validateFile(file, {
			maxSize: 100, // 100 bytes
		})

		expect(result).not.toBeNull()
		expect(result?.type).toBe(ChunkUploadError.INVALID_FILE)
	})

	it('应该拒绝小于最小大小的文件', () => {
		const file = new File(['x'], 'test.txt', { type: 'text/plain' })
		const result = validateFile(file, {
			minSize: 100, // 100 bytes
		})

		expect(result).not.toBeNull()
		expect(result?.type).toBe(ChunkUploadError.INVALID_FILE)
	})

	it('应该支持自定义验证函数', () => {
		const file = new File(['content'], 'test.txt', { type: 'text/plain' })

		// 验证通过
		const result1 = validateFile(file, {
			validate: () => true,
		})
		expect(result1).toBeNull()

		// 验证失败
		const result2 = validateFile(file, {
			validate: () => '自定义错误消息',
		})
		expect(result2).not.toBeNull()
		expect(result2?.message).toBe('自定义错误消息')
	})
})
