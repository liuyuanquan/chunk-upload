# Chunk Upload Lib 重构计划

## 📋 重构目标

1. **提升代码质量**：改进代码结构、类型安全、错误处理
2. **优化性能**：Worker 复用、内存管理、并发控制
3. **增强功能**：进度回调、取消功能、重试机制
4. **改善开发体验**：更好的 API 设计、文档、测试

---

## 🎯 阶段一：核心功能优化（优先级：高）

### 1.1 Worker 路径问题修复
**问题**：当前 Worker 路径处理复杂，开发和生产环境不一致

**解决方案**：
- [ ] 使用统一的 Worker 路径解析策略
- [ ] 支持自定义 Worker URL 配置
- [ ] 添加 Worker 加载失败的错误处理
- [ ] 考虑使用内联 Worker 或 Blob URL 作为备选方案

**文件**：`src/fragmentFile.ts`, `src/work.ts`

---

### 1.2 错误处理机制
**问题**：缺少完善的错误处理

**改进**：
- [ ] 添加文件读取错误处理
- [ ] 添加 Worker 通信错误处理
- [ ] 添加哈希计算错误处理
- [ ] 提供错误回调选项
- [ ] 定义错误类型枚举

**文件**：`src/types.ts`, `src/createChunk.ts`, `src/fragmentFile.ts`

**新增类型**：
```typescript
export enum ChunkUploadError {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  WORKER_ERROR = 'WORKER_ERROR',
  HASH_ERROR = 'HASH_ERROR',
  INVALID_FILE = 'INVALID_FILE',
}

export interface UploadError {
  type: ChunkUploadError
  message: string
  file?: File
  chunkIndex?: number
}
```

---

### 1.3 内存管理优化
**问题**：`hashMap` 可能导致内存泄漏

**改进**：
- [ ] 使用 WeakMap 替代 Map（如果可能）
- [ ] 添加缓存大小限制
- [ ] 实现 LRU 缓存策略
- [ ] 提供清理缓存的 API

**文件**：`src/createChunk.ts`

---

### 1.4 Worker 复用优化
**问题**：每次调用都创建新的 Worker，没有复用

**改进**：
- [ ] 实现 Worker 池（Worker Pool）
- [ ] 支持 Worker 复用
- [ ] 添加 Worker 生命周期管理
- [ ] 支持 Worker 数量配置

**文件**：`src/fragmentFile.ts`, 新增 `src/workerPool.ts`

---

## 🎯 阶段二：功能增强（优先级：中）

### 2.1 进度回调
**功能**：添加分片进度回调

**实现**：
- [ ] 添加 `onProgress` 回调选项
- [ ] 计算并返回进度百分比
- [ ] 支持文件级别和总体进度

**文件**：`src/types.ts`, `src/fragmentUpload.ts`, `src/fragmentUpload1.ts`

**新增类型**：
```typescript
export interface ProgressInfo {
  file: File
  loaded: number  // 已处理的字节数
  total: number   // 总字节数
  percentage: number  // 百分比 0-100
  chunkIndex?: number
  totalChunks?: number
}
```

---

### 2.2 取消功能
**功能**：支持取消正在进行的文件分片

**实现**：
- [ ] 返回取消函数（AbortController）
- [ ] 支持取消单个文件或所有文件
- [ ] 清理 Worker 和资源

**文件**：`src/fragmentUpload.ts`, `src/fragmentUpload1.ts`, `src/fragmentFile.ts`

**API 设计**：
```typescript
const { cancel } = fragmentUpload(selector, options)
// 取消所有文件处理
cancel()
```

---

### 2.3 重试机制
**功能**：支持失败重试

**实现**：
- [ ] 添加重试配置选项
- [ ] 实现指数退避策略
- [ ] 记录重试次数

**文件**：`src/types.ts`, `src/fragmentFile.ts`

---

### 2.4 文件验证
**功能**：添加文件类型和大小验证

**实现**：
- [ ] 支持文件类型白名单/黑名单
- [ ] 支持文件大小限制
- [ ] 提供验证回调

**文件**：`src/types.ts`, `src/fragmentUpload.ts`

---

## 🎯 阶段三：API 设计优化（优先级：中）

### 3.1 统一 API 设计
**问题**：两个函数 API 不一致

**改进**：
- [ ] 统一回调命名规范
- [ ] 提供更灵活的配置选项
- [ ] 支持链式调用或 Promise 返回

**文件**：`src/fragmentUpload.ts`, `src/fragmentUpload1.ts`

**建议的 API**：
```typescript
// 方案1：统一函数，通过选项区分模式
fragmentUpload(selector, {
  mode: 'batch' | 'immediate',
  // ...其他选项
})

// 方案2：保持两个函数，但统一选项结构
```

---

### 3.2 支持直接传入 File 对象
**功能**：不仅支持选择器，还支持直接传入 File 对象

**实现**：
- [ ] 重载函数签名
- [ ] 支持 File 和 FileList
- [ ] 支持拖拽文件

**文件**：`src/fragmentUpload.ts`, `src/fragmentUpload1.ts`

---

### 3.3 返回 Promise
**功能**：支持 Promise 风格的 API

**实现**：
- [ ] 返回 Promise<FileInfo[]>
- [ ] 支持 async/await
- [ ] 保持回调方式兼容

**文件**：`src/fragmentUpload.ts`

---

## 🎯 阶段四：性能优化（优先级：中低）

### 4.1 并发控制
**功能**：优化并发处理策略

**改进**：
- [ ] 动态调整 Worker 数量
- [ ] 根据文件大小调整分片策略
- [ ] 支持并发数量限制

**文件**：`src/fragmentFile.ts`, `src/workerPool.ts`

---

### 4.2 哈希计算优化
**功能**：优化哈希计算性能

**改进**：
- [ ] 考虑使用 Web Crypto API（如果可用）
- [ ] 优化大文件哈希计算
- [ ] 支持增量哈希

**文件**：`src/createChunk.ts`

---

### 4.3 分片大小自适应
**功能**：根据文件大小自动调整分片大小

**实现**：
- [ ] 小文件使用较小分片
- [ ] 大文件使用较大分片
- [ ] 可配置分片大小策略

**文件**：`src/fragmentFile.ts`

---

## 🎯 阶段五：开发体验（优先级：低）

### 5.1 TypeScript 类型完善
**改进**：
- [ ] 添加更详细的 JSDoc 注释
- [ ] 完善类型定义
- [ ] 导出所有类型

**文件**：所有 `.ts` 文件

---

### 5.2 单元测试
**功能**：添加完整的测试覆盖

**实现**：
- [ ] 使用 Vitest 编写单元测试
- [ ] 测试核心功能
- [ ] 测试错误处理
- [ ] 测试边界情况

**文件**：新增 `test/` 目录

---

### 5.3 文档完善
**改进**：
- [ ] 完善 README
- [ ] 添加 API 文档
- [ ] 添加使用示例
- [ ] 添加常见问题

**文件**：`README.md`, 新增 `docs/` 目录

---

### 5.4 Demo 增强
**功能**：改进 demo 页面

**实现**：
- [ ] 添加进度条显示
- [ ] 添加错误提示
- [ ] 添加性能统计
- [ ] 支持拖拽上传

**文件**：`demo/`

---

## 📝 重构检查清单

### 代码质量
- [ ] 所有函数都有完整的类型定义
- [ ] 所有公共 API 都有 JSDoc 注释
- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 严格模式检查

### 功能完整性
- [ ] 错误处理覆盖所有场景
- [ ] 支持取消功能
- [ ] 支持进度回调
- [ ] 支持文件验证

### 性能
- [ ] Worker 复用机制
- [ ] 内存管理优化
- [ ] 大文件处理优化

### 测试
- [ ] 核心功能测试覆盖 > 80%
- [ ] 错误场景测试
- [ ] 边界情况测试

---

## 🚀 实施建议

### 第一步：核心功能优化（1-2 天）
1. 修复 Worker 路径问题
2. 添加错误处理
3. 优化内存管理

### 第二步：功能增强（2-3 天）
1. 添加进度回调
2. 实现取消功能
3. 添加文件验证

### 第三步：API 优化（1-2 天）
1. 统一 API 设计
2. 支持 Promise
3. 支持直接传入 File

### 第四步：测试和文档（1-2 天）
1. 编写单元测试
2. 完善文档
3. 改进 demo

---

## 📚 参考资源

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [SparkMD5](https://github.com/satazor/SparkMD5)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)

---

## 💡 注意事项

1. **向后兼容**：重构时保持 API 向后兼容，或提供迁移指南
2. **性能测试**：每次优化后都要进行性能测试
3. **渐进式重构**：分阶段进行，每个阶段完成后测试
4. **文档同步**：代码变更时同步更新文档
