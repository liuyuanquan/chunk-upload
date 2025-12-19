/**
 * 哈希计算工具模块
 * 
 * 此模块使用浏览器原生的 Web Crypto API 计算文件的 SHA-256 哈希值。
 * 
 * 优势：
 * - 无需第三方库依赖，使用浏览器原生 API
 * - SHA-256 比 MD5 更安全，符合现代安全标准
 * - Web Crypto API 通常有硬件加速支持，性能优异
 * - 浏览器内部已优化，无需手动优化策略
 * 
 * 注意：
 * - Web Crypto API 是异步的，所有哈希计算函数都返回 Promise
 * - 哈希值以十六进制字符串格式返回（64 个字符）
 */

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 * 
 * 将二进制数据转换为可读的十六进制字符串格式。
 * 每个字节转换为两位十六进制字符（0-9, a-f），不足两位的前面补 0。
 * 
 * 示例：
 * - 输入：Uint8Array([0x12, 0x34, 0xAB])
 * - 输出："1234ab"
 * 
 * @param buffer - ArrayBuffer 对象（包含二进制数据）
 * @returns 十六进制字符串（小写）
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
	// 将 ArrayBuffer 转换为 Uint8Array 以便遍历字节
	const bytes = new Uint8Array(buffer)
	
	// 将每个字节转换为两位十六进制字符，然后拼接成字符串
	return Array.from(bytes)
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')
}

/**
 * 使用 Web Crypto API 计算 SHA-256 哈希值（内部函数）
 * 
 * 这是实际的哈希计算实现，使用浏览器原生的 Web Crypto API。
 * SHA-256 算法会产生 256 位（32 字节）的哈希值。
 * 
 * 工作流程：
 * 1. 检查 Web Crypto API 是否可用
 * 2. 调用 crypto.subtle.digest() 计算 SHA-256 哈希
 * 3. 将返回的 ArrayBuffer 转换为十六进制字符串
 * 
 * @param fileBuffer - 文件分片的二进制数据（ArrayBuffer）
 * @returns Promise<string> 返回 64 位十六进制字符串格式的 SHA-256 哈希值
 * @throws 如果 Web Crypto API 不可用，抛出错误
 */
async function calculateSHA256(fileBuffer: ArrayBuffer): Promise<string> {
	// ========== 检查 Web Crypto API 可用性 ==========
	// 确保在支持的环境中运行（现代浏览器都支持）
	if (typeof crypto === 'undefined' || !crypto.subtle) {
		throw new Error('Web Crypto API 不可用，无法计算哈希值')
	}

	// ========== 计算 SHA-256 哈希 ==========
	// crypto.subtle.digest() 是异步的，返回 Promise<ArrayBuffer>
	// SHA-256 算法会产生 32 字节（256 位）的哈希值
	const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
	
	// ========== 转换为十六进制字符串 ==========
	// 将 32 字节的二进制数据转换为 64 个字符的十六进制字符串
	return arrayBufferToHex(hashBuffer)
}

/**
 * 计算文件分片的 SHA-256 哈希值（公开 API）
 * 
 * 这是对外暴露的主要哈希计算函数，供其他模块调用。
 * 使用 Web Crypto API 计算 SHA-256 哈希值，返回十六进制字符串。
 * 
 * 特点：
 * - 异步执行，不阻塞主线程
 * - 使用浏览器原生 API，性能优异
 * - 返回标准的 SHA-256 哈希值（64 个十六进制字符）
 * 
 * @param fileBuffer - 文件分片的二进制数据（ArrayBuffer）
 * @returns Promise<string> 返回 64 位十六进制字符串格式的 SHA-256 哈希值
 * 
 * @example
 * ```typescript
 * const fileBuffer = await file.slice(0, 1024).arrayBuffer()
 * const hash = await calculateHash(fileBuffer)
 * console.log(hash) // 输出: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 * ```
 */
export async function calculateHash(
	fileBuffer: ArrayBuffer,
): Promise<string> {
	// Web Crypto API 已经内部优化，直接调用计算函数即可
	return calculateSHA256(fileBuffer)
}
