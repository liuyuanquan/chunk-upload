# 文件组织说明

本文档说明 `src` 目录下文件的组织原则，哪些文件应该放在 `utils` 目录，哪些不应该。

## 文件分类原则

### ✅ 应该放在 `utils/` 目录的文件

**工具函数和辅助模块**：可复用的、与核心业务逻辑解耦的工具函数。

- `cancelController.ts` - 取消控制器工具
- `chunkStrategy.ts` - 分片策略计算工具
- `fileValidator.ts` - 文件验证工具
- `hashOptimizer.ts` - 哈希计算工具
- `retry.ts` - 重试机制工具
- `workerPool.ts` - Worker 池管理工具
- `workerUrl.ts` - Worker URL 解析工具

**特点**：
- 提供通用的工具函数
- 可以被多个模块复用
- 不包含核心业务逻辑
- 通常是纯函数或简单的工具类

### ❌ 不应该放在 `utils/` 目录的文件

**核心业务逻辑和公开 API**：包含库的核心功能和对外接口。

#### 1. 核心业务逻辑模块
- `chunkFile.ts` - 文件分片处理核心逻辑（批量模式）
- `chunkFileStream.ts` - 文件分片处理核心逻辑（流式模式）
- `createChunk.ts` - 创建分片并计算哈希的核心逻辑

**原因**：
- 这些是库的核心功能实现
- 包含复杂的业务逻辑
- 是库的主要功能模块，不是工具函数

#### 2. 公开 API 模块
- `chunkUpload.ts` - 用户接口（批量回调模式）
- `chunkUploadStream.ts` - 用户接口（立即回调模式）

**原因**：
- 这些是库对外暴露的主要 API
- 用户直接使用这些函数
- 应该放在根目录便于导入

#### 3. 类型定义
- `types.ts` - 所有类型和接口定义

**原因**：
- 类型定义是库的公共契约
- 应该放在根目录便于导入和使用
- 不是工具函数

#### 4. 入口文件
- `index.ts` - 库的入口文件，统一导出所有公开 API

**原因**：
- 入口文件必须在根目录
- 这是 npm 包的标准结构

#### 5. Worker 文件
- `work.ts` - Web Worker 脚本文件

**原因**：
- Worker 文件是独立的脚本文件
- 需要作为独立的构建入口
- 不是工具函数模块

## 当前文件组织

```
src/
├── utils/                    # 工具函数目录 ✅
│   ├── cancelController.ts   # 取消控制器工具
│   ├── chunkStrategy.ts      # 分片策略计算
│   ├── fileValidator.ts      # 文件验证
│   ├── hashOptimizer.ts      # 哈希计算
│   ├── retry.ts              # 重试机制
│   ├── workerPool.ts         # Worker 池管理
│   └── workerUrl.ts          # Worker URL 解析
│
├── chunkFile.ts              # 核心业务逻辑 ❌
├── chunkFileStream.ts        # 核心业务逻辑 ❌
├── chunkUpload.ts            # 公开 API ❌
├── chunkUploadStream.ts      # 公开 API ❌
├── createChunk.ts            # 核心业务逻辑 ❌
├── index.ts                  # 入口文件 ❌
├── types.ts                  # 类型定义 ❌
└── work.ts                   # Worker 文件 ❌
```

## 总结

当前的文件组织是**合理的**：

- ✅ 所有工具函数都在 `utils/` 目录下
- ✅ 核心业务逻辑和公开 API 都在 `src/` 根目录
- ✅ 类型定义、入口文件和 Worker 文件都在正确的位置

**无需调整**，当前结构符合最佳实践。
