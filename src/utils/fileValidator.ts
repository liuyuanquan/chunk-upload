import type { FileValidationConfig, UploadError } from '../types'
import { ChunkUploadError } from '../types'

/**
 * 验证文件
 * @param file - 要验证的文件
 * @param config - 验证配置
 * @returns 验证通过返回 null，否则返回错误信息
 */
export function validateFile(
  file: File,
  config?: FileValidationConfig,
): UploadError | null {
  if (!config) return null

  // 验证文件类型
  if (config.allowedTypes && config.allowedTypes.length > 0) {
    const isAllowed = config.allowedTypes.some((type) => {
      if (type.includes('*')) {
        // 支持通配符，如 'image/*'
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

  // 验证禁止的文件类型
  if (config.blockedTypes && config.blockedTypes.length > 0) {
    const isBlocked = config.blockedTypes.some((type) => {
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

  // 验证文件大小
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
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
