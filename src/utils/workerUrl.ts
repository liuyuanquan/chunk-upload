/**
 * Worker URL 解析工具
 * 统一处理开发和生产环境下的 Worker 路径
 */

/**
 * 获取 Worker 文件的 URL
 * @param workerFileName - Worker 文件名（如 'work.js'）
 * @returns Worker 文件的 URL
 */
export function getWorkerUrl(workerFileName: string = 'work.js'): URL {
  try {
    // 开发环境（Vite）：使用源文件
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
      // 将 .js 替换为 .ts
      const sourceFileName = workerFileName.replace(/\.js$/, '.ts')
      // workerUrl.ts 在 src/utils/ 目录下，work.ts 在 src/ 目录下
      // 所以需要向上两级到项目根目录，然后进入 src/
      const url = new URL(`../${sourceFileName}`, import.meta.url)
      console.log('[Worker URL] 开发模式:', {
        href: url.href,
        sourceFileName,
        importMetaUrl: import.meta.url,
      })
      return url
    }

    // 生产环境：使用构建后的文件
    const url = new URL(`../${workerFileName}`, import.meta.url)
    console.log('[Worker URL] 生产模式:', {
      href: url.href,
      workerFileName,
      importMetaUrl: import.meta.url,
    })
    return url
  } catch (error) {
    console.error('[Worker URL] 解析失败:', {
      error,
      workerFileName,
      importMetaUrl: import.meta.url,
    })
    // 如果 URL 解析失败，尝试使用字符串路径
    const fallbackUrl = workerFileName.replace(/\.js$/, '.ts')
    throw new Error(`无法解析 Worker URL: ${fallbackUrl}. 错误: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 创建 Worker 实例
 * @param workerFileName - Worker 文件名
 * @param options - Worker 选项
 * @returns Worker 实例
 */
export function createWorker(
  workerFileName: string = 'work.js',
  options?: WorkerOptions,
): Worker {
  const workerUrl = getWorkerUrl(workerFileName)
  
  try {
    const worker = new Worker(workerUrl, {
      type: 'module',
      ...options,
    })
    
    // 添加 Worker 加载错误监听
    worker.addEventListener('error', (event) => {
      console.error('Worker 加载错误:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        workerUrl: workerUrl.href,
      })
    })
    
    return worker
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('创建 Worker 失败:', {
      workerUrl: workerUrl.href,
      error: errorMessage,
      errorObj: error,
    })
    throw new Error(
      `无法创建 Worker: ${workerUrl.href}. 错误: ${errorMessage}`,
    )
  }
}
