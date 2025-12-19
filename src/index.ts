/**
 * 分片上传库
 * 使用 Web Workers 实现的文件分片上传库
 */

export * from "./types";

/** 文件分片上传函数（批量处理模式） */
export { chunkUpload } from "./chunkUpload";

/** 文件分片上传函数（流式回调模式） */
export { chunkUploadStream } from "./chunkUploadStream";
