# 重构执行清单

## ✅ 阶段一：核心功能优化

### Worker 路径问题修复
- [ ] 创建 `src/utils/workerUrl.ts` 统一处理 Worker URL
- [ ] 更新 `src/fragmentFile.ts` 使用新的 Worker URL 解析
- [ ] 添加 Worker 加载失败的错误处理
- [ ] 测试开发和生产环境

### 错误处理机制
- [ ] 在 `src/types.ts` 添加错误类型定义
- [ ] 更新 `src/createChunk.ts` 添加错误处理
- [ ] 更新 `src/fragmentFile.ts` 添加错误处理
- [ ] 更新 `src/fragmentUpload.ts` 添加错误回调选项
- [ ] 更新 `src/fragmentUpload1.ts` 添加错误回调选项

### 内存管理优化
- [ ] 重构 `src/createChunk.ts` 中的 hashMap
- [ ] 添加缓存大小限制
- [ ] 实现清理缓存的函数
- [ ] 测试内存泄漏

### Worker 复用优化
- [ ] 创建 `src/utils/workerPool.ts`
- [ ] 实现 Worker 池管理
- [ ] 更新 `src/fragmentFile.ts` 使用 Worker 池
- [ ] 测试 Worker 复用效果

---

## ✅ 阶段二：功能增强

### 进度回调
- [ ] 在 `src/types.ts` 添加 `ProgressInfo` 类型
- [ ] 更新 `FragmentUploadOptions` 添加 `onProgress`
- [ ] 更新 `FragmentUpload1Options` 添加 `onProgress`
- [ ] 在 `src/fragmentFile.ts` 实现进度计算
- [ ] 在 `src/fragmentFile1.ts` 实现进度计算
- [ ] 更新 `src/fragmentUpload.ts` 调用进度回调
- [ ] 更新 `src/fragmentUpload1.ts` 调用进度回调

### 取消功能
- [ ] 在 `src/types.ts` 添加取消相关类型
- [ ] 更新 `fragmentUpload` 返回取消函数
- [ ] 更新 `fragmentUpload1` 返回取消函数
- [ ] 实现 Worker 终止逻辑
- [ ] 实现资源清理逻辑

### 重试机制
- [ ] 在 `src/types.ts` 添加重试配置
- [ ] 在 `src/fragmentFile.ts` 实现重试逻辑
- [ ] 实现指数退避策略
- [ ] 测试重试功能

### 文件验证
- [ ] 在 `src/types.ts` 添加验证选项
- [ ] 创建 `src/utils/fileValidator.ts`
- [ ] 实现文件类型验证
- [ ] 实现文件大小验证
- [ ] 在 `fragmentUpload` 中集成验证

---

## ✅ 阶段三：API 设计优化

### 统一 API 设计
- [ ] 决定 API 设计方案（统一函数 vs 保持两个函数）
- [ ] 统一回调命名规范
- [ ] 更新所有函数签名
- [ ] 更新文档

### 支持直接传入 File 对象
- [ ] 添加函数重载
- [ ] 实现 File 对象处理逻辑
- [ ] 实现 FileList 处理逻辑
- [ ] 更新类型定义
- [ ] 更新文档和示例

### 返回 Promise
- [ ] 更新 `fragmentUpload` 返回 Promise
- [ ] 更新 `fragmentUpload1` 返回 Promise
- [ ] 保持回调方式兼容
- [ ] 更新文档和示例

---

## ✅ 阶段四：性能优化

### 并发控制
- [ ] 实现动态 Worker 数量调整
- [ ] 实现分片策略优化
- [ ] 添加并发数量限制配置
- [ ] 性能测试

### 哈希计算优化
- [ ] 研究 Web Crypto API 可行性
- [ ] 优化大文件哈希计算
- [ ] 性能测试

### 分片大小自适应
- [ ] 实现分片大小策略
- [ ] 添加配置选项
- [ ] 测试不同文件大小

---

## ✅ 阶段五：开发体验

### TypeScript 类型完善
- [ ] 为所有函数添加 JSDoc
- [ ] 完善类型定义
- [ ] 导出所有类型
- [ ] 检查类型覆盖率

### 单元测试
- [ ] 配置 Vitest
- [ ] 测试 `createChunk`
- [ ] 测试 `fragmentFile`
- [ ] 测试 `fragmentFile1`
- [ ] 测试 `fragmentUpload`
- [ ] 测试 `fragmentUpload1`
- [ ] 测试错误处理
- [ ] 测试边界情况

### 文档完善
- [ ] 更新 README.md
- [ ] 创建 API 文档
- [ ] 添加使用示例
- [ ] 添加常见问题

### Demo 增强
- [ ] 添加进度条
- [ ] 添加错误提示
- [ ] 添加性能统计
- [ ] 支持拖拽上传
- [ ] 美化 UI

---

## 📊 进度统计

- 阶段一：0/4 完成
- 阶段二：0/4 完成
- 阶段三：0/3 完成
- 阶段四：0/3 完成
- 阶段五：0/4 完成

**总体进度：0/18 阶段完成**

---

## 🎯 建议执行顺序

1. **先做阶段一**：核心功能优化是基础，必须先完成
2. **再做阶段二**：功能增强提升用户体验
3. **然后阶段三**：API 优化改善开发体验
4. **最后阶段四和五**：性能优化和文档完善

---

## 💡 快速开始

### 第一步：Worker 路径修复（推荐先做）

创建 `src/utils/workerUrl.ts`：
```typescript
export function getWorkerUrl(): URL {
  // 实现统一的 Worker URL 解析逻辑
}
```

### 第二步：错误处理（推荐先做）

在 `src/types.ts` 添加：
```typescript
export enum ChunkUploadError {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  WORKER_ERROR = 'WORKER_ERROR',
  // ...
}
```

### 第三步：进度回调（快速提升体验）

在 `src/types.ts` 添加：
```typescript
export interface ProgressInfo {
  // ...
}
```
