# 代码格式化指南

## 自动格式化（推荐）

### 方法 1: 使用 Prettier 扩展（Cursor/VS Code）

1. 安装 Prettier 扩展：
   - 打开扩展面板（`Cmd+Shift+X`）
   - 搜索 "Prettier - Code formatter"
   - 安装并启用

2. 配置保存时自动格式化：
   - 已配置在 `.vscode/settings.json` 中
   - 保存文件时会自动格式化

### 方法 2: 使用命令行格式化

```bash
# 格式化所有代码
pnpm format

# 检查代码格式（不修改）
pnpm format:check
```

### 方法 3: 手动格式化（Cursor）

1. 打开文件
2. 按 `Shift+Option+F` (Mac) 或 `Shift+Alt+F` (Windows)
3. 选择 "Prettier" 作为格式化器

## 格式化配置

- 配置文件：`.prettierrc.json`
- 忽略文件：`.prettierignore`
- 编辑器配置：`.editorconfig`

## 格式化规则

- 使用制表符（tabs）缩进
- 不使用分号
- 使用单引号
- 尾随逗号
- 行宽 80 字符
