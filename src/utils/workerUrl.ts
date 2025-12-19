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
	if (typeof import.meta === 'undefined' || !import.meta.url) {
		throw new Error('import.meta.url 不可用，无法解析 Worker URL')
	}

	const importMetaUrl = import.meta.url

	try {
		// 开发环境：使用 .ts 源文件
		if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
			const sourceFileName = workerFileName.replace(/\.js$/, '.ts')
			return new URL(`../${sourceFileName}`, importMetaUrl)
		}

		// 生产环境：使用构建后的 .js 文件
		return new URL(`../${workerFileName}`, importMetaUrl)
	} catch (error) {
		console.error('[Worker URL] 解析失败:', {
			error: error instanceof Error ? error.message : String(error),
			workerFileName,
			importMetaUrl,
			errorStack: error instanceof Error ? error.stack : undefined,
		})
		throw new Error(
			`无法解析 Worker URL: ${workerFileName}. 错误: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

/**
 * 创建 Worker 实例
 * 使用 Vite 推荐的方式：在 new Worker() 中直接使用 new URL()
 * @param workerFileName - Worker 文件名，默认 'work.js'
 * @param options - Worker 选项（可选）
 * @returns Worker 实例
 */
export function createWorker(
	workerFileName: string = 'work.js',
	options?: WorkerOptions,
): Worker {
	if (typeof import.meta === 'undefined' || !import.meta.url) {
		throw new Error('import.meta.url 不可用，无法创建 Worker')
	}

	const importMetaUrl = import.meta.url

	try {
		// 开发环境：使用 .ts 文件，生产环境：使用 .js 文件
		const isDev = typeof import.meta.env !== 'undefined' && import.meta.env.DEV
		const sourceFileName = isDev
			? workerFileName.replace(/\.js$/, '.ts')
			: workerFileName

		const worker = new Worker(new URL(`../${sourceFileName}`, importMetaUrl), {
			type: 'module',
			...options,
		})

		// 添加错误监听
		worker.addEventListener('error', event => {
			console.error('[Worker] 加载错误:', {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				error: event.error,
			})
		})

		return worker
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error('[Worker] 创建失败:', errorMessage)
		throw new Error(`无法创建 Worker: ${workerFileName}. 错误: ${errorMessage}`)
	}
}
