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

## Data source

This app uses **TronGrid**.

- Base URL: `https://api.trongrid.io`
- API key header: `TRON-PRO-API-KEY`

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Create local config (NOT committed)

Create `chain-tracer.config.json` in the project root (same level as `package.json`).

> This file is **ignored by git** to prevent secret leakage.

You can copy from the example:

```bash
cp chain-tracer.config.example.json chain-tracer.config.json
```

Then edit `chain-tracer.config.json` and fill your key.

### 3) Run in development

```bash
npm run dev
```

### 4) Lint / typecheck

```bash
npm run lint
npm run typecheck
```

### 5) Build

```bash
npm run build
```

## Configuration

- `chain-tracer.config.json` (local only, ignored)
- `chain-tracer.config.example.json` (committed template)

Example:

```json
{
  "trongrid": {
    "apiBase": "https://api.trongrid.io",
    "apiKey": "YOUR_TRONGRID_API_KEY"
  }
}
```

## Privacy / security

- Never commit API keys.
- `chain-tracer.config.json` is in `.gitignore`.
- If you ever accidentally publish a key, rotate it immediately.

## Project structure

- `src/main/` — Electron main process (IPC + TronGrid client)
- `src/preload/` — `window.api` bridge (IPC invoke)
- `src/renderer/` — Vue UI

## License

TBD
