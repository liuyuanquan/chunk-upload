import {
  fragmentUpload,
  fragmentUpload1,
  type FileInfo,
  type ProgressInfo,
  type UploadError,
} from '@xumi/chunk-upload-lib'

// DOM 元素
const fileInput = document.getElementById('file-input') as HTMLInputElement
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const progressSection = document.getElementById('progress-section')!
const progressList = document.getElementById('progress-list')!
const fileList = document.getElementById('file-list')!
const errorContainer = document.getElementById('error-container')!
const stats = document.getElementById('stats')!

// 状态
let cancelController: ReturnType<typeof fragmentUpload> | null = null
let currentFiles: File[] = []
let fileProgressMap = new Map<string, ProgressInfo>()
let fileResultsMap = new Map<string, FileInfo>()

// 模式选择
const modeRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="mode"]',
)
let currentMode: 'batch' | 'immediate' = 'batch'

modeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    currentMode = radio.value as 'batch' | 'immediate'
  })
})

// 更新统计信息
function updateStats() {
  const totalFiles = currentFiles.length
  const processedFiles = fileResultsMap.size
  const totalChunks = Array.from(fileResultsMap.values()).reduce(
    (sum, file) => sum + file.chunks.length,
    0,
  )
  const totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0)

  document.getElementById('total-files')!.textContent = String(totalFiles)
  document.getElementById('processed-files')!.textContent = String(processedFiles)
  document.getElementById('total-chunks')!.textContent = String(totalChunks)
  document.getElementById('total-size')!.textContent =
    (totalSize / 1024 / 1024).toFixed(2) + ' MB'

  if (totalFiles > 0) {
    stats.style.display = 'grid'
  }
}

// 更新进度显示
function updateProgress(file: File, progress: ProgressInfo) {
  fileProgressMap.set(file.name, progress)

  const progressItem = document.getElementById(`progress-${file.name}`) || createProgressItem(file)
  const progressBar = progressItem.querySelector('.progress-bar') as HTMLElement
  const progressText = progressItem.querySelector('.progress-text') as HTMLElement

  progressBar.style.width = `${progress.percentage}%`
  progressBar.textContent = `${progress.percentage}%`
  progressText.textContent = `已处理: ${formatBytes(progress.loaded)} / ${formatBytes(progress.total)} (${progress.processedChunks || 0}/${progress.totalChunks || 0} 分片)`

  progressSection.style.display = 'block'
}

// 创建进度项
function createProgressItem(file: File): HTMLElement {
  const item = document.createElement('div')
  item.className = 'progress-item'
  item.id = `progress-${file.name}`
  item.innerHTML = `
    <h3>${file.name}</h3>
    <div class="progress-bar-wrapper">
      <div class="progress-bar" style="width: 0%">0%</div>
    </div>
    <div class="progress-text">准备中...</div>
  `
  progressList.appendChild(item)
  return item
}

// 显示文件结果
function displayFileResult(fileInfo: FileInfo) {
  fileResultsMap.set(fileInfo.name, fileInfo)

  const item = document.createElement('div')
  item.className = 'file-item'
  item.innerHTML = `
    <h3>✅ ${fileInfo.name}</h3>
    <div class="meta">
      大小: ${formatBytes(fileInfo.size)} | 
      类型: ${fileInfo.type || '未知'} | 
      修改时间: ${new Date(fileInfo.lastModified).toLocaleString()}
    </div>
    <div class="chunks">
      分片数: ${fileInfo.chunks.length} | 
      第一个分片哈希: ${fileInfo.chunks[0]?.hash.substring(0, 16)}...
    </div>
  `
  fileList.appendChild(item)
  updateStats()
}

// 显示错误
function displayError(error: UploadError) {
  const errorDiv = document.createElement('div')
  errorDiv.className = 'error'
  errorDiv.innerHTML = `
    <strong>错误:</strong> ${error.message}
    ${error.file ? `<br><small>文件: ${error.file.name}</small>` : ''}
    ${error.chunkIndex !== undefined ? `<br><small>分片索引: ${error.chunkIndex}</small>` : ''}
  `
  errorContainer.appendChild(errorDiv)

  // 3秒后自动移除
  setTimeout(() => {
    errorDiv.remove()
  }, 5000)
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 清空所有
function clearAll() {
  fileProgressMap.clear()
  fileResultsMap.clear()
  currentFiles = []
  progressList.innerHTML = ''
  fileList.innerHTML = ''
  errorContainer.innerHTML = ''
  progressSection.style.display = 'none'
  stats.style.display = 'none'
  fileInput.value = ''
  cancelBtn.disabled = true
}

// 开始处理
function startProcessing() {
  const files = Array.from(fileInput.files || [])
  if (files.length === 0) {
    alert('请选择文件')
    return
  }

  clearAll()
  currentFiles = files
  cancelBtn.disabled = false

  const options = {
    validation: {
      maxSize: 500 * 1024 * 1024, // 500MB
    },
    onProgress: (progress: ProgressInfo) => {
      updateProgress(progress.file, progress)
    },
    onError: (error: UploadError) => {
      displayError(error)
    },
  }

  if (currentMode === 'batch') {
    // 批量回调模式
    cancelController = fragmentUpload(files, {
      ...options,
      perCallback: (fileInfo) => {
        displayFileResult(fileInfo)
      },
      lastCallback: (files) => {
        console.log('所有文件处理完成:', files)
        cancelBtn.disabled = true
      },
    }) as any
  } else {
    // 立即回调模式
    cancelController = fragmentUpload1(files, {
      ...options,
      callback: (chunk) => {
        console.log('分片完成:', chunk)
      },
    }) as any
  }
}

// 取消处理
function cancelProcessing() {
  if (cancelController) {
    cancelController.cancel()
    cancelBtn.disabled = true
    console.log('操作已取消')
  }
}

// 事件监听
startBtn.addEventListener('click', startProcessing)
cancelBtn.addEventListener('click', cancelProcessing)
clearBtn.addEventListener('click', clearAll)

// 文件选择变化时自动开始处理
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    startProcessing()
  }
})

console.log('Demo 已加载')
