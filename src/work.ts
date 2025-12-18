import { createChunk } from './createChunk'
import type { ChunkInfo } from './types'

interface WorkerMessage {
  file: File
  CHUNK_SIZE: number
  startIndex: number
  endIndex: number
}

/**
 * Web Worker for parallel chunk processing
 */
onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file, CHUNK_SIZE, startIndex, endIndex } = e.data
  const promises: Promise<ChunkInfo>[] = []

  for (let i = startIndex; i < endIndex; i++) {
    promises.push(createChunk(file, i, CHUNK_SIZE))
  }

  const results = await Promise.all(promises)
  postMessage(results)
}
