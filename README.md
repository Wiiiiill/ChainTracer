# ChainTracer

ChainTracer is a lightweight **Electron + Vue 3** desktop app for monitoring multiple **TRON** wallet addresses and viewing **USDT (TRC20)** transfers in one aggregated, filterable table.

## Features

- Watch multiple TRON addresses (with optional labels)
- Aggregated **USDT (TRC20)** transfer table (sorted by time desc)
- Filters
  - by watched address
  - by direction: `IN` / `OUT` / `INTERNAL`
- Pagination (“Load more”)
- Click addresses (From/To + watched list) to **copy** to clipboard
- Show each watched address **current USDT balance**
- Multiple data sources (switchable in the app)
  - **Tronscan** (default)
  - **TronGrid** (optional API key)

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Run in development

```bash
npm run dev
```

### 3) Select data source (in-app)

Open the sidebar and click **Source**:

- **Tronscan**: no key required (default)
- **TronGrid**: optionally paste your API key

Notes:
- The TronGrid API key is stored **locally** under Electron `userData` (on your machine only).
- The app UI will not display your key after saving (only “set / not set”).

### 4) Lint / typecheck

```bash
npm run lint
npm run typecheck
```

### 5) Build

```bash
npm run build
```

## Privacy / security

- Never commit API keys.
- The app stores settings in Electron `userData` (outside this repo).
- If you ever accidentally publish a key, rotate it immediately.

## Project structure

- `src/main/` — Electron main process (IPC + data sources)
- `src/preload/` — `window.api` bridge (IPC invoke)
- `src/renderer/` — Vue UI

## License

TBD
