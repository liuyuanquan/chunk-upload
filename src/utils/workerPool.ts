/**
 * Worker 池管理
 * 手动管理 Web Workers，通过 postMessage 传递消息
 * 注意：由于 File 对象无法通过 workerpool.exec 序列化，我们直接使用 Worker API
 */

import type { ChunkInfo } from "../types";

interface WorkerTask {
  // 文件对象
  file: File;
  // 分片大小
  CHUNK_SIZE: number;
  // 分片起始索引
  startIndex: number;
  // 分片结束索引
  endIndex: number;
  // 分片结果
  resolve: (chunks: ChunkInfo[]) => void;
  // 分片错误
  reject: (error: Error) => void;
}

/**
 * Worker 池类
 */
class WorkerPool {
  private readonly maxWorkers: number;
  private workerUrl: string;
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private workerStatus: Map<Worker, boolean> = new Map();
  private workerTaskMap: Map<Worker, WorkerTask> = new Map();

  constructor(
    maxWorkers: number = navigator.hardwareConcurrency || 4,
    workerFileName: string = "work.js"
  ) {
    this.maxWorkers = maxWorkers;
    this.workerUrl = this.getWorkerUrl(workerFileName);

    // 初始化 Workers
    this.initializeWorkers();
  }

  /**
   * 获取 Worker URL
   */
  private getWorkerUrl(workerFileName: string): string {
    if (typeof import.meta === "undefined" || !import.meta.url) {
      throw new Error("无法获取 Worker URL");
    }

    const baseUrl = new URL(".", import.meta.url).href;

    // 开发环境：使用 .ts 文件，生产环境：使用 .js 文件
    const isDev = typeof import.meta.env !== "undefined" && import.meta.env.DEV;
    const sourceFileName = isDev
      ? workerFileName.replace(/\.js$/, ".ts")
      : workerFileName;

    // 构建 Worker URL
    const workerUrl = new URL(`../${sourceFileName}`, baseUrl).href;

    // 在 Vite 开发环境中，可能需要添加 ?worker 查询参数
    // 但为了兼容性，我们先尝试不使用查询参数
    return workerUrl;
  }

  /**
   * 初始化 Workers
   */
  private initializeWorkers(): void {
    // 手动创建 Worker 实例
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        // 使用 new URL 方式创建 Worker（Vite 推荐的方式）
        // workerPool.ts 在 utils/ 目录下，work.ts 在 src/ 目录下
        // 所以相对路径是 ../work.ts
        const isDev =
          typeof import.meta.env !== "undefined" && import.meta.env.DEV;
        const workerFileName = isDev ? "../work.ts" : "../work.js";

        const worker = new Worker(new URL(workerFileName, import.meta.url), {
          type: "module",
        });
        this.workers.push(worker);
        this.workerStatus.set(worker, false);

        // 设置消息处理
        worker.onmessage = (e) => {
          this.handleWorkerMessage(worker, e.data);
        };

        // 设置错误处理
        worker.onerror = (error) => {
          console.error(`[WorkerPool] Worker ${i} 错误:`, {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            error: error.error,
            workerUrl: this.workerUrl,
          });
          this.handleWorkerError(worker, error);
        };

        // 监听 Worker 加载错误
        worker.addEventListener("error", (event) => {
          console.error(`[WorkerPool] Worker ${i} 加载错误:`, {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            workerUrl: this.workerUrl,
          });
        });
      } catch (error) {
        console.error(`[WorkerPool] 创建 Worker ${i} 失败:`, {
          error,
          workerUrl: this.workerUrl,
          importMetaUrl: import.meta.url,
        });
      }
    }

    if (this.workers.length === 0) {
      throw new Error(
        `无法创建任何 Worker。Worker URL: ${this.workerUrl}。请检查文件路径是否正确。`
      );
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(worker: Worker, data: any): void {
    // 查找对应的任务
    const task = this.findTaskForWorker(worker);
    if (!task) return;

    try {
      // 检查 Worker 返回的数据格式
      if (data && typeof data === "object" && "success" in data) {
        if (!data.success) {
          // Worker 返回错误
          const errorData = data.error;
          let errorMessage = "Worker 处理失败";

          if (errorData) {
            if (typeof errorData === "string") {
              errorMessage = errorData;
            } else if (
              typeof errorData === "object" &&
              "message" in errorData
            ) {
              errorMessage = String(errorData.message || "Worker 处理失败");
            } else {
              errorMessage = JSON.stringify(errorData);
            }
          }

          task.reject(new Error(errorMessage));
        } else {
          // Worker 成功返回数据
          const chunks = data.data as ChunkInfo[];
          task.resolve(chunks);
        }
      } else {
        // 兼容旧格式（直接返回数组）
        const chunks = data as ChunkInfo[];
        task.resolve(chunks);
      }
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      // 重置 Worker 状态
      this.workerStatus.set(worker, false);
      this.workerTaskMap.delete(worker);
      this.processNextTask();
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = this.findTaskForWorker(worker);

    let errorMessage = "Worker 错误";
    const errorParts: string[] = [];

    // 收集所有可用的错误信息
    if (error.message) {
      errorParts.push(`消息: ${error.message}`);
    }
    if (error.filename) {
      errorParts.push(`文件: ${error.filename}`);
    }
    if (error.lineno !== undefined) {
      errorParts.push(`行号: ${error.lineno}`);
    }
    if (error.colno !== undefined) {
      errorParts.push(`列号: ${error.colno}`);
    }

    // 检查 error.error 属性
    if (error.error) {
      const errorObj = error.error;
      if (errorObj instanceof Error) {
        errorParts.push(`错误类型: ${errorObj.name}`);
        errorParts.push(`错误消息: ${errorObj.message}`);
        if (errorObj.stack) {
          errorParts.push(
            `堆栈: ${errorObj.stack.split("\n").slice(0, 3).join("\n")}`
          );
        }
      } else if (typeof errorObj === "string") {
        errorParts.push(`错误内容: ${errorObj}`);
      } else {
        try {
          errorParts.push(`错误对象: ${JSON.stringify(errorObj)}`);
        } catch {
          errorParts.push(`错误对象: [无法序列化]`);
        }
      }
    }

    // 添加 Worker URL 信息
    errorParts.push(`Worker URL: ${this.workerUrl}`);

    if (errorParts.length > 0) {
      errorMessage += ": " + errorParts.join(", ");
    } else {
      errorMessage +=
        ": 未知错误（无错误详情）。请检查 Worker 文件是否正确加载。";
    }

    if (task) {
      task.reject(new Error(errorMessage));
      this.workerStatus.set(worker, false);
      this.workerTaskMap.delete(worker);
    }

    this.processNextTask();
  }

  /**
   * 查找 Worker 对应的任务
   */
  private findTaskForWorker(worker: Worker): WorkerTask | null {
    return this.workerTaskMap.get(worker) || null;
  }

  /**
   * 处理队列中的下一个任务
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // 查找空闲的 Worker
    const idleWorker = this.workers.find((w) => !this.workerStatus.get(w));

    if (!idleWorker) return;

    const task = this.taskQueue.shift()!;
    this.assignTask(idleWorker, task);
  }

  /**
   * 分配任务给 Worker
   */
  private assignTask(worker: Worker, task: WorkerTask): void {
    this.workerStatus.set(worker, true);
    this.workerTaskMap.set(worker, task);

    try {
      // 验证 File 对象
      if (!task.file || !(task.file instanceof File)) {
        throw new Error("无效的 File 对象");
      }

      // 发送消息到 Worker（File 对象可以通过结构化克隆传递）
      worker.postMessage({
        file: task.file,
        CHUNK_SIZE: task.CHUNK_SIZE,
        startIndex: task.startIndex,
        endIndex: task.endIndex,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error("[WorkerPool] 发送消息失败:", errorMessage);

      task.reject(
        new Error(
          `无法发送消息到 Worker: ${errorMessage}。可能是 File 对象无法序列化或 Worker 未正确加载。`
        )
      );

      this.workerStatus.set(worker, false);
      this.workerTaskMap.delete(worker);
      this.processNextTask();
    }
  }

  /**
   * 提交任务到 Worker 池
   */
  public submitTask(task: WorkerTask): void {
    // 查找空闲的 Worker
    const idleWorker = this.workers.find((w) => !this.workerStatus.get(w));

    if (idleWorker) {
      // 有空闲 Worker，直接分配任务
      this.assignTask(idleWorker, task);
    } else {
      // 没有空闲 Worker，加入队列
      this.taskQueue.push(task);
    }
  }
}

// 全局 Worker 池实例（单例模式）
let globalWorkerPool: WorkerPool | null = null;

/**
 * 获取全局 Worker 池实例
 */
export function getWorkerPool(
  maxWorkers?: number,
  workerFileName?: string
): WorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool(maxWorkers, workerFileName);
  }
  return globalWorkerPool;
}
