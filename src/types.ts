/**
 * Chunk information
 */
export interface ChunkInfo {
  start: number
  end: number
  index: number
  hash: string
}

/**
 * File information
 */
export interface FileInfo {
  name: string
  type: string
  size: number
  lastModified: number
  chunks: ChunkInfo[]
}

/**
 * Options for fragmentUpload
 */
export interface FragmentUploadOptions {
  perCallback?: (fileInfo: FileInfo & { isDone: boolean }) => void
  lastCallback?: (filesInfo: FileInfo[]) => void
  splitCallback?: (fileInfo: FileInfo) => void
  chunkSize?: number
}

/**
 * Options for fragmentUpload1
 */
export interface FragmentUpload1Options {
  chunkSize?: number
  callback?: (chunk: ChunkInfo & { isDone: boolean }) => void
}
