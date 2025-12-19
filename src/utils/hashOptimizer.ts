/**
 * 哈希计算工具
 * 使用 Web Crypto API 计算 SHA-256 哈希值
 */

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 使用 Web Crypto API 计算 SHA-256 哈希值（内部函数）
 */
async function calculateSHA256(fileBuffer: ArrayBuffer): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API 不可用，无法计算哈希值");
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * 计算文件分片的 SHA-256 哈希值
 * @param fileBuffer - 文件分片的二进制数据（ArrayBuffer）
 * @returns Promise<string> 返回 64 位十六进制字符串格式的 SHA-256 哈希值
 */
export async function calculateHash(fileBuffer: ArrayBuffer): Promise<string> {
  return calculateSHA256(fileBuffer);
}
