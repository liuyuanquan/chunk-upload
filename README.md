# Chunk Upload Lib

> A simple and fast file chunk upload library using Web Workers

## Features

- 🚀 Fast file chunking using Web Workers
- 📦 Multiple files support
- ⚙️ Configurable chunk size (default: 5MB)
- 🔄 Two upload modes: batch callback and immediate callback
- 🧮 MD5 hash calculation for each chunk

## Install

```bash
npm install @xumi/chunk-upload-lib
```

## Usage

### fragmentUpload

```typescript
import { fragmentUpload } from '@xumi/chunk-upload-lib'

fragmentUpload('input[type="file"]', {
  perCallback: (fileInfo) => {
    console.log('Single file callback', fileInfo)
  },
  lastCallback: (files) => {
    console.log('All files callback', files)
  },
})
```

### fragmentUpload1

```typescript
import { fragmentUpload1 } from '@xumi/chunk-upload-lib'

fragmentUpload1('input[type="file"]', {
  callback: (chunk) => {
    // Immediate callback for each chunk
    console.log(chunk)
  },
})
```

## License

MIT
