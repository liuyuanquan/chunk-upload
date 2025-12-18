import { fragmentUpload, fragmentUpload1 } from '@xumi/chunk-upload-lib'

// Demo for fragmentUpload
fragmentUpload('#file-input', {
  perCallback: (fileInfo) => {
    console.log('Single file callback:', fileInfo)
    const output = document.getElementById('output')
    if (output) {
      output.innerHTML += `<p>File: ${fileInfo.name}, Chunks: ${fileInfo.chunks.length}, Done: ${fileInfo.isDone}</p>`
    }
  },
  lastCallback: (files) => {
    console.log('All files callback:', files)
    const output = document.getElementById('output')
    if (output) {
      output.innerHTML += `<h2>All files processed: ${files.length}</h2>`
    }
  },
})

// Uncomment to use fragmentUpload1 instead
// fragmentUpload1('#file-input', {
//   callback: (chunk) => {
//     console.log('Chunk callback:', chunk)
//   },
// })
