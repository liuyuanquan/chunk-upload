import { describe, it, expect } from 'vitest'
import {
  calculateChunkStrategy,
  calculateWorkerCount,
} from '../src/utils/chunkStrategy'

describe('calculateChunkStrategy', () => {
  it('应该为小文件返回较小的分片和较少的 Worker', () => {
    const strategy = calculateChunkStrategy(5 * 1024 * 1024) // 5MB

    expect(strategy.chunkSize).toBe(1 * 1024 * 1024) // 1MB
    expect(strategy.workerCount).toBeLessThanOrEqual(2)
  })

  it('应该为中等文件返回中等分片和中等 Worker', () => {
    const strategy = calculateChunkStrategy(50 * 1024 * 1024) // 50MB

    expect(strategy.chunkSize).toBe(5 * 1024 * 1024) // 5MB
    expect(strategy.workerCount).toBeLessThanOrEqual(4)
  })

  it('应该为大文件返回较大分片和较多 Worker', () => {
    const strategy = calculateChunkStrategy(500 * 1024 * 1024) // 500MB

    expect(strategy.chunkSize).toBe(10 * 1024 * 1024) // 10MB
    expect(strategy.workerCount).toBeLessThanOrEqual(6)
  })

  it('应该为超大文件返回大分片和最多 Worker', () => {
    const strategy = calculateChunkStrategy(2 * 1024 * 1024 * 1024) // 2GB

    expect(strategy.chunkSize).toBe(20 * 1024 * 1024) // 20MB
    expect(strategy.workerCount).toBeGreaterThanOrEqual(4)
  })
})

describe('calculateWorkerCount', () => {
  it('应该返回不超过最大 Worker 数量的值', () => {
    const count = calculateWorkerCount(100, 4)
    expect(count).toBeLessThanOrEqual(4)
  })

  it('应该返回至少 1 个 Worker', () => {
    const count = calculateWorkerCount(1, 4)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('当分片数量少于 Worker 数量时，应该返回分片数量', () => {
    const count = calculateWorkerCount(2, 4)
    expect(count).toBe(2)
  })
})
