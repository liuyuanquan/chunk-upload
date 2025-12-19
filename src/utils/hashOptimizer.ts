/**
 * 哈希计算工具
 * 使用 Web Crypto API 计算 SHA-256 哈希值
 */

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 * @param buffer - ArrayBuffer 对象
 * @returns 十六进制字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	return Array.from(bytes)
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')
}

/**
 * 使用 Web Crypto API 计算 SHA-256 哈希值
 * @param fileBuffer - 文件缓冲区
 * @returns Promise<string> 返回十六进制格式的 SHA-256 哈希值
 */
async function calculateSHA256(fileBuffer: ArrayBuffer): Promise<string> {
	// 检查 Web Crypto API 是否可用
	if (typeof crypto === 'undefined' || !crypto.subtle) {
		throw new Error('Web Crypto API 不可用，无法计算哈希值')
	}

	// 使用 Web Crypto API 计算 SHA-256
	const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
	
	// 转换为十六进制字符串
	return arrayBufferToHex(hashBuffer)
}

/**
 * 计算文件分片的 SHA-256 哈希值
 * @param fileBuffer - 文件缓冲区
 * @param useOptimization - 是否使用优化策略（保留参数以兼容现有代码，当前未使用）
 * @returns Promise<string> 返回十六进制格式的 SHA-256 哈希值
 */
export async function calculateHash(
	fileBuffer: ArrayBuffer,
	useOptimization?: boolean,
): Promise<string> {
	return calculateSHA256(fileBuffer)
}

/**
 * 检查是否应该使用优化的哈希计算
 * @param bufferSize - 缓冲区大小
 * @returns 是否应该使用优化策略（保留函数以兼容现有代码，当前始终返回 false）
 * @deprecated Web Crypto API 已经内部优化，此函数不再需要
 */
export function shouldUseOptimizedHash(bufferSize: number): boolean {
	return false
}

/**
 * 优化的哈希计算（适用于大文件）
 * @param fileBuffer - 文件缓冲区
 * @returns Promise<string> 返回十六进制格式的 SHA-256 哈希值
 * @deprecated 使用 calculateHash 代替，Web Crypto API 已经内部优化
 */
export async function calculateHashOptimized(
	fileBuffer: ArrayBuffer,
): Promise<string> {
	return calculateSHA256(fileBuffer)
}
