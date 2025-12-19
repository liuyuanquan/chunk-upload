/**
 * 文件验证工具
 * 提供文件类型和大小验证功能，支持白名单、黑名单和自定义验证规则
 */

import type { FileValidationConfig, UploadError } from '../types'
import { ChunkUploadError } from '../types'

/**
 * 验证文件是否符合配置要求
 * 支持文件类型白名单/黑名单、大小限制和自定义验证
 * @param file - 要验证的文件对象
 * @param config - 验证配置（可选）
 * @returns 验证失败返回错误对象，验证通过返回 null
 */
export function validateFile(
	file: File,
	config?: FileValidationConfig,
): UploadError | null {
	if (!config) return null

	// 文件类型白名单验证
	if (config.allowedTypes && config.allowedTypes.length > 0) {
		const isAllowed = config.allowedTypes.some(type => {
			if (type.includes('*')) {
				const baseType = type.split('/')[0]
				return file.type.startsWith(`${baseType}/`)
			}
			return file.type === type
		})

		if (!isAllowed) {
			return {
				type: ChunkUploadError.INVALID_FILE,
				message: `文件类型不允许。允许的类型: ${config.allowedTypes.join(', ')}`,
				file,
			}
		}
	}

	// 文件类型黑名单验证
	if (config.blockedTypes && config.blockedTypes.length > 0) {
		const isBlocked = config.blockedTypes.some(type => {
			if (type.includes('*')) {
				const baseType = type.split('/')[0]
				return file.type.startsWith(`${baseType}/`)
			}
			return file.type === type
		})

		if (isBlocked) {
			return {
				type: ChunkUploadError.INVALID_FILE,
				message: `文件类型被禁止。禁止的类型: ${config.blockedTypes.join(', ')}`,
				file,
			}
		}
	}

	// 文件大小验证
	if (config.maxSize !== undefined && file.size > config.maxSize) {
		return {
			type: ChunkUploadError.INVALID_FILE,
			message: `文件大小超过限制。最大大小: ${formatFileSize(config.maxSize)}, 实际大小: ${formatFileSize(file.size)}`,
			file,
		}
	}

	if (config.minSize !== undefined && file.size < config.minSize) {
		return {
			type: ChunkUploadError.INVALID_FILE,
			message: `文件大小小于限制。最小大小: ${formatFileSize(config.minSize)}, 实际大小: ${formatFileSize(file.size)}`,
			file,
		}
	}

	// 自定义验证
	if (config.validate) {
		const result = config.validate(file)
		if (result !== true) {
			return {
				type: ChunkUploadError.INVALID_FILE,
				message: typeof result === 'string' ? result : '文件验证失败',
				file,
			}
		}
	}

	return null
}

/**
 * 格式化文件大小为可读字符串
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串，例如 "1.5 MB"
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
