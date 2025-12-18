# Chunk Upload Lib 架构文档

## 📐 整体架构

`chunk-upload-lib` 是一个基于 Web Workers 的文件分片上传库，采用模块化设计，核心思想是将文件分片处理任务分配给多个 Worker 并行执行，以充分利用多核 CPU 性能。

### 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                     用户 API 层                               │
│  chunkUpload / chunkUploadStream                            │
│  - 选择器模式（事件监听）                                     │
│  - File/FileList 模式（Promise）                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     业务逻辑层                                 │
│  chunkFile / chunkFileStream                                │
│  - 文件验证                                                   │
│  - 分片策略计算                                               │
│  - 进度跟踪                                                   │
│  - 错误处理                                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Worker 管理层                              │
│  WorkerPool                                                  │
│  - Worker 实例池                                              │
│  - 任务队列管理                                               │
│  - Worker 复用                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Worker 层                                │
│  work.ts                                                     │
│  - 接收分片任务                                               │
│  - 并行处理多个分片                                           │
│  - 返回处理结果                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     核心处理层                                 │
│  createChunk                                                 │
│  - 文件分片读取                                               │
│  - MD5 哈希计算                                               │
│  - LRU 缓存管理                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 核心模块

### 1. API 层 (`chunkUpload.ts` / `chunkUploadStream.ts`)

**职责**：
- 提供用户友好的 API 接口
- 支持多种输入方式（选择器、File、FileList）
- 处理文件验证和重试逻辑
- 管理取消操作

**关键特性**：
- **函数重载**：通过 TypeScript 函数重载支持不同的输入类型
- **模式区分**：
  - `chunkUpload`：批量回调模式，所有分片处理完成后回调
  - `chunkUploadStream`：立即回调模式，每个分片处理完成后立即回调

### 2. 文件分片层 (`chunkFile.ts` / `chunkFileStream.ts`)

**职责**：
- 文件分片策略计算
- Worker 任务分配
- 进度跟踪和更新
- 错误处理和传播

**关键流程**：
1. 验证文件对象
2. 计算最优分片大小和 Worker 数量
3. 将文件分片任务分配给 Worker 池
4. 收集 Worker 返回的分片结果
5. 更新进度并处理错误

### 3. Worker 管理层 (`utils/workerPool.ts`)

**职责**：
- 创建和管理 Worker 实例池
- 任务队列管理
- Worker 复用和负载均衡

**设计模式**：
- **单例模式**：全局唯一的 Worker 池实例
- **对象池模式**：复用 Worker 实例，避免频繁创建和销毁
- **队列模式**：任务队列确保 Worker 按顺序处理任务

**关键方法**：
- `initializeWorkers()`：延迟初始化 Worker 池
- `submitTask()`：提交任务到 Worker 池
- `assignTask()`：将任务分配给空闲 Worker
- `handleWorkerMessage()`：处理 Worker 返回的消息
- `handleWorkerError()`：处理 Worker 错误

### 4. Worker 执行层 (`work.ts`)

**职责**：
- 接收主线程发送的分片任务
- 并行处理多个分片
- 返回处理结果或错误

**工作流程**：
1. 接收消息：`{ file, CHUNK_SIZE, startIndex, endIndex }`
2. 验证输入数据
3. 为每个分片索引创建 `createChunk` Promise
4. 并行执行所有 Promise
5. 返回结果：`{ success: true, data: ChunkInfo[] }` 或 `{ success: false, error: UploadError }`

### 5. 分片处理层 (`createChunk.ts`)

**职责**：
- 读取文件分片数据
- 计算 MD5 哈希值
- 管理哈希缓存（LRU 策略）

**关键优化**：
- **LRU 缓存**：限制缓存大小为 100 个条目，避免内存泄漏
- **FileReader API**：使用 `readAsArrayBuffer` 读取文件分片
- **SparkMD5**：使用优化的 MD5 计算库

### 6. 工具模块

#### `utils/workerUrl.ts`
- 统一处理 Worker 文件路径
- 支持开发和生产环境的不同路径解析
- 使用 Vite 推荐的 Worker 创建方式

#### `utils/chunkStrategy.ts`
- 根据文件大小自动计算最优分片大小和 Worker 数量
- 自适应策略：
  - 小文件（<10MB）：1MB 分片，2 个 Worker
  - 中等文件（10MB-100MB）：5MB 分片，4 个 Worker
  - 大文件（100MB-1GB）：10MB 分片，6 个 Worker
  - 超大文件（>=1GB）：20MB 分片，最多 Worker

#### `utils/fileValidator.ts`
- 文件类型验证（允许/禁止列表）
- 文件大小验证（最大/最小值）
- 自定义验证函数支持

#### `utils/cancelController.ts`
- 提供取消操作的机制
- 简单的状态管理（已取消/未取消）

#### `utils/retry.ts`
- 重试机制实现
- 指数退避策略
- 可配置的重试次数和延迟

#### `utils/hashOptimizer.ts`
- 哈希计算优化
- 大文件优化策略（预留接口）

## 🔄 工作流程

### 批量回调模式 (`chunkUpload`)

```
用户调用 chunkUpload(file, options)
    ↓
文件验证（如果配置了 validation）
    ↓
创建取消控制器
    ↓
遍历文件列表
    ↓
对每个文件调用 chunkFile()
    ↓
计算分片策略（chunkSize, workerCount）
    ↓
获取 Worker 池实例
    ↓
将文件分片任务分配给 Worker
    ├─→ Worker 1: 处理分片 0-10
    ├─→ Worker 2: 处理分片 11-20
    └─→ Worker 3: 处理分片 21-30
    ↓
每个 Worker 并行处理
    ├─→ 读取文件分片
    ├─→ 计算 MD5 哈希
    └─→ 返回 ChunkInfo
    ↓
收集所有分片结果
    ↓
更新进度（onProgress）
    ↓
调用 perCallback（单个文件完成）
    ↓
所有文件处理完成
    ↓
调用 lastCallback（所有文件完成）
    ↓
返回 FileInfo[]
```

### 立即回调模式 (`chunkUploadStream`)

```
用户调用 chunkUploadStream(file, options)
    ↓
文件验证
    ↓
创建取消控制器
    ↓
调用 chunkFileStream()
    ↓
计算分片策略
    ↓
获取 Worker 池实例
    ↓
为每个分片创建 Promise
    ↓
并行处理所有分片
    ├─→ 分片 0 完成 → 立即调用 callback(chunk0)
    ├─→ 分片 1 完成 → 立即调用 callback(chunk1)
    └─→ 分片 2 完成 → 立即调用 callback(chunk2)
    ↓
更新进度
    ↓
所有分片处理完成
    ↓
返回 void
```

### Worker 处理流程

```
Worker 收到消息
    ↓
验证输入数据（file, CHUNK_SIZE, startIndex, endIndex）
    ↓
创建 Promise 数组
    for (i = startIndex; i < endIndex; i++) {
        promises.push(createChunk(file, i, CHUNK_SIZE))
    }
    ↓
并行执行所有 Promise
    ↓
每个 createChunk 执行：
    1. 计算分片范围（start, end）
    2. 使用 FileReader 读取文件分片
    3. 检查哈希缓存
    4. 如果未缓存，计算 MD5 哈希
    5. 缓存哈希值（LRU）
    6. 返回 ChunkInfo
    ↓
等待所有 Promise 完成
    ↓
返回结果数组
    postMessage({ success: true, data: ChunkInfo[] })
```

## 📊 数据流

### 输入数据

```typescript
// 用户输入
File | FileList | File[] | string (selector)

// 配置选项
{
  chunkSize?: number
  workerCount?: number
  adaptiveChunkSize?: boolean
  onProgress?: (progress: ProgressInfo) => void
  onError?: (error: UploadError) => void
  validation?: FileValidationConfig
  retry?: RetryConfig
}
```

### 中间数据

```typescript
// Worker 任务
{
  file: File
  CHUNK_SIZE: number
  startIndex: number
  endIndex: number
}

// 分片信息
{
  start: number
  end: number
  index: number
  hash: string
}
```

### 输出数据

```typescript
// 文件信息
{
  name: string
  type: string
  size: number
  lastModified: number
  chunks: ChunkInfo[]
}

// 进度信息
{
  file: File
  loaded: number
  total: number
  percentage: number
  processedChunks?: number
  totalChunks?: number
}
```

## 🎯 关键设计决策

### 1. Worker 池复用

**问题**：频繁创建和销毁 Worker 会带来性能开销。

**解决方案**：使用 Worker 池模式，复用 Worker 实例。

**优势**：
- 减少 Worker 创建开销
- 更好的资源管理
- 支持任务队列，避免 Worker 过载

### 2. 自适应分片策略

**问题**：不同大小的文件需要不同的分片大小和 Worker 数量。

**解决方案**：根据文件大小自动计算最优策略。

**优势**：
- 小文件：快速处理，减少开销
- 大文件：充分利用多核 CPU
- 用户无需手动配置

### 3. LRU 缓存

**问题**：相同内容的文件分片会重复计算哈希，浪费 CPU。

**解决方案**：使用 LRU 缓存存储哈希值。

**优势**：
- 避免重复计算
- 限制内存使用（最多 100 个条目）
- 自动清理旧缓存

### 4. 两种回调模式

**问题**：不同场景需要不同的回调时机。

**解决方案**：
- `chunkUpload`：批量回调，适合需要完整文件信息
- `chunkUploadStream`：立即回调，适合实时上传场景

**优势**：
- 灵活性高
- 满足不同使用场景
- API 清晰明确

### 5. 错误处理机制

**问题**：需要统一的错误处理和错误类型。

**解决方案**：
- 定义 `UploadError` 接口
- 使用 `ChunkUploadError` 枚举
- 提供错误回调选项

**优势**：
- 错误信息结构化
- 便于错误处理和调试
- 支持错误传播

### 6. 取消机制

**问题**：用户可能需要取消正在进行的操作。

**解决方案**：使用 `CancelController` 管理取消状态。

**优势**：
- 简单易用
- 支持资源清理
- 避免不必要的计算

## 🔧 性能优化

### 1. 并行处理

- 使用多个 Worker 并行处理分片
- 充分利用多核 CPU
- 减少总处理时间

### 2. Worker 复用

- 避免频繁创建 Worker
- 减少内存开销
- 提升响应速度

### 3. 哈希缓存

- LRU 缓存策略
- 避免重复计算
- 限制内存使用

### 4. 自适应策略

- 根据文件大小调整参数
- 优化资源使用
- 平衡性能和开销

## 🧪 测试策略

### 单元测试

- `test/createChunk.test.ts`：测试分片创建和哈希计算
- `test/fileValidator.test.ts`：测试文件验证逻辑
- `test/chunkStrategy.test.ts`：测试分片策略计算
- `test/cancelController.test.ts`：测试取消机制

### 集成测试

- 测试完整的文件处理流程
- 测试 Worker 通信
- 测试错误处理

### 性能测试

- 测试不同文件大小的处理时间
- 测试 Worker 池的性能
- 测试内存使用情况

## 📝 扩展性

### 添加新的哈希算法

1. 在 `utils/hashOptimizer.ts` 中添加新算法
2. 更新 `createChunk.ts` 使用新算法
3. 添加配置选项

### 添加新的验证规则

1. 在 `utils/fileValidator.ts` 中添加验证逻辑
2. 更新 `FileValidationConfig` 类型
3. 在 API 层集成验证

### 添加新的 Worker 策略

1. 在 `utils/chunkStrategy.ts` 中添加策略
2. 更新 `calculateChunkStrategy` 函数
3. 添加配置选项

## 🔍 调试建议

### 1. 启用详细日志

在开发环境中，可以添加 `console.log` 来跟踪：
- Worker 创建和销毁
- 任务分配和执行
- 进度更新
- 错误信息

### 2. 使用浏览器 DevTools

- **Performance**：分析性能瓶颈
- **Memory**：检查内存泄漏
- **Network**：查看 Worker 文件加载
- **Sources**：调试 Worker 代码

### 3. 监控指标

- Worker 数量和使用率
- 任务队列长度
- 哈希缓存命中率
- 处理时间和吞吐量

## 📚 相关资源

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [SparkMD5](https://github.com/satazor/SparkMD5)
- [Vite Worker 文档](https://vitejs.dev/guide/features.html#web-workers)
