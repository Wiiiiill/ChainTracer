# ChainTracer（中文说明）

**语言:** [English](README.md) | 中文

ChainTracer 是一个轻量的 **Electron + Vue 3** 桌面应用，用于同时监控多个 **TRON** 地址，并把 **USDT（TRC20）** 转账汇总成一张可筛选的表格。

## 功能

- 监控多个 TRON 地址（支持备注 label）
- 汇总展示 **USDT（TRC20）** 转账（按时间倒序）
- 筛选
  - 按被监控地址筛选
  - 按方向筛选：`IN` / `OUT` / `INTERNAL`
- 分页（Load more）
- 地址点击复制（From / To + watched list）
- 显示每个被监控地址的 **USDT 余额**
- 多数据源（可在 App 内切换）
  - **Tronscan**（默认、无需 Key）
  - **TronGrid**（可选 API Key）

## 快速开始

### 1）安装依赖

```bash
npm install
```

### 2）开发模式运行

```bash
npm run dev
```

### 3）在应用内选择数据源

打开左侧栏，点击 **Source**：

- **Tronscan**：默认，无需 Key
- **TronGrid**：可以粘贴你的 API Key（可留空）

说明：

- TronGrid API Key 会保存在本机的 Electron `userData` 目录下（只在你的电脑上，不会提交到仓库）。
- UI 不会回显保存后的明文 key，只显示“已设置 / 未设置”。

### 4）代码检查 / 类型检查

```bash
npm run lint
npm run typecheck
```

### 5）构建

```bash
npm run build
```

### 6）本地打包安装包（可选）

```bash
# Windows 安装包（NSIS）
npm run build:win

# macOS dmg
npm run build:mac
```


