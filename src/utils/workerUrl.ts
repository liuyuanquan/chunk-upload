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
  // 开发环境（Vite）：使用源文件
  if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
    // 将 .js 替换为 .ts
    const sourceFileName = workerFileName.replace(/\.js$/, '.ts')
    const url = new URL(`./${sourceFileName}`, import.meta.url)
    console.log('[Worker URL] 开发模式:', url.href)
    return url
  }

  // 生产环境：使用构建后的文件
  // 对于 npm 包用户，worker 文件应该在 dist 目录下
  // 这里使用相对路径，假设 worker 文件和主文件在同一目录
  const url = new URL(`./${workerFileName}`, import.meta.url)
  console.log('[Worker URL] 生产模式:', url.href)
  return url
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
