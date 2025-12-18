/**
 * Worker 池管理
 * 复用 Worker 实例，提升性能
 */

import { createWorker } from './workerUrl'
import type { ChunkInfo } from '../types'

interface WorkerTask {
  file: File
  CHUNK_SIZE: number
  startIndex: number
  endIndex: number
  resolve: (chunks: ChunkInfo[]) => void
  reject: (error: Error) => void
}

interface WorkerInstance {
  worker: Worker
  isBusy: boolean
  currentTask: WorkerTask | null
}

/**
 * Worker 池类
 */
export class WorkerPool {
  private workers: WorkerInstance[] = []
  private taskQueue: WorkerTask[] = []
  private readonly maxWorkers: number
  private readonly workerFileName: string

  constructor(
    maxWorkers: number = navigator.hardwareConcurrency || 4,
    workerFileName: string = 'work.js',
  ) {
    this.maxWorkers = maxWorkers
    this.workerFileName = workerFileName
  }

  /**
   * 初始化 Worker 池
   */
  private initializeWorkers(): void {
    if (this.workers.length > 0) return

    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = createWorker(this.workerFileName)
        const workerInstance: WorkerInstance = {
          worker,
          isBusy: false,
          currentTask: null,
        }

        // 设置 Worker 消息处理
        worker.onmessage = (e) => {
          this.handleWorkerMessage(workerInstance, e.data)
        }

        // 设置 Worker 错误处理
        worker.onerror = (error) => {
          this.handleWorkerError(workerInstance, error)
        }

        this.workers.push(workerInstance)
      } catch (error) {
        console.warn(`创建 Worker ${i} 失败:`, error)
      }
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(
    workerInstance: WorkerInstance,
    data: any,
  ): void {
    const task = workerInstance.currentTask
    if (!task) return

    try {
      // 检查 Worker 返回的数据格式
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          // Worker 返回错误
          const error = new Error(data.error?.message || 'Worker 处理失败')
          task.reject(error)
        } else {
          // Worker 成功返回数据
          const chunks = data.data as ChunkInfo[]
          task.resolve(chunks)
        }
      } else {
        // 兼容旧格式（直接返回数组）
        const chunks = data as ChunkInfo[]
        task.resolve(chunks)
      }
    } catch (error) {
      task.reject(
        error instanceof Error
          ? error
          : new Error(String(error)),
      )
    } finally {
      // 重置 Worker 状态
      workerInstance.isBusy = false
      workerInstance.currentTask = null

      // 处理队列中的下一个任务
      this.processNextTask(workerInstance)
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(
    workerInstance: WorkerInstance,
    error: ErrorEvent,
  ): void {
    const task = workerInstance.currentTask
    if (task) {
      task.reject(
        new Error(`Worker 错误: ${error.message || '未知错误'}`),
      )
      workerInstance.isBusy = false
      workerInstance.currentTask = null
    }

    // 处理队列中的下一个任务
    this.processNextTask(workerInstance)
  }

  /**
   * 处理队列中的下一个任务
   */
  private processNextTask(workerInstance: WorkerInstance): void {
    if (this.taskQueue.length === 0) return

    const task = this.taskQueue.shift()!
    this.assignTask(workerInstance, task)
  }

  /**
   * 分配任务给 Worker
   */
  private assignTask(
    workerInstance: WorkerInstance,
    task: WorkerTask,
  ): void {
    workerInstance.isBusy = true
    workerInstance.currentTask = task

    workerInstance.worker.postMessage({
      file: task.file,
      CHUNK_SIZE: task.CHUNK_SIZE,
      startIndex: task.startIndex,
      endIndex: task.endIndex,
    })
  }

  /**
   * 提交任务到 Worker 池
   */
  public submitTask(task: WorkerTask): void {
    // 初始化 Worker 池（如果还没有）
    this.initializeWorkers()

    // 查找空闲的 Worker
    const idleWorker = this.workers.find((w) => !w.isBusy)

    if (idleWorker) {
      // 有空闲 Worker，直接分配任务
      this.assignTask(idleWorker, task)
    } else {
      // 没有空闲 Worker，加入队列
      this.taskQueue.push(task)
    }
  }

  /**
   * 终止所有 Worker
   */
  public terminateAll(): void {
    this.workers.forEach((workerInstance) => {
      try {
        workerInstance.worker.terminate()
      } catch (e) {
        // 忽略终止错误
      }
    })
    this.workers = []
    this.taskQueue = []
  }

  /**
   * 获取当前 Worker 数量
   */
  public getWorkerCount(): number {
    return this.workers.length
  }

  /**
   * 获取当前队列长度
   */
  public getQueueLength(): number {
    return this.taskQueue.length
  }

  /**
   * 获取空闲 Worker 数量
   */
  public getIdleWorkerCount(): number {
    return this.workers.filter((w) => !w.isBusy).length
  }
}

// 全局 Worker 池实例（单例模式）
let globalWorkerPool: WorkerPool | null = null

/**
 * 获取全局 Worker 池实例
 */
export function getWorkerPool(
  maxWorkers?: number,
  workerFileName?: string,
): WorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool(maxWorkers, workerFileName)
  }
  return globalWorkerPool
}

/**
 * 重置全局 Worker 池
 */
export function resetWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.terminateAll()
    globalWorkerPool = null
  }
}
