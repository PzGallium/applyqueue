# ApplyQueue

Execution-first job application workflow tool. See ranked jobs, type `apply N`, get a JD-aligned resume + PDF/DOCX export in seconds.

**Website**: [applyqueue.com](https://applyqueue.com)

## What it does

1. **Job Discovery** — Ingests jobs from ATS platforms (Greenhouse, Lever, Ashby), deduplicates, and ranks by your preferences
2. **Apply N** — Select a ranked job by number, system fetches JD, parses requirements, generates a tailored resume
3. **Export** — Download ATS-friendly PDF and DOCX files
4. **Track** — Kanban board: Saved → Applied → OA → Interview → Offer / Rejected

## BYOK (Bring Your Own Key)

ApplyQueue never stores or proxies API keys in plaintext. You provide your own:
- **LLM**: OpenAI or Anthropic API key (for resume generation + JD parsing)
- **Search**: Brave Search API key (for job discovery)

Keys are encrypted with AES-256-GCM and only decrypted server-side at call time.

## Quick Start (Local Dev)

```bash
# Prerequisites: Node.js 20+, pnpm 9+, Firebase CLI
npm install -g firebase-tools pnpm

# Clone and install
git clone https://github.com/applyqueue/applyqueue.git
cd applyqueue
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Firebase config

# Build shared (required: Functions / emulator load @applyqueue/shared from dist/)
pnpm build --filter @applyqueue/shared

# Start Firebase emulators + dev server（默认方案 A：不启 Auth 模拟器，可与线上 Google 登录共用 ID Token）
pnpm emulators &
pnpm dev
# 若需完整套件含 Auth 模拟器：pnpm emulators:all，且须在 apps/web 设 VITE_USE_AUTH_EMULATOR=true 并重新登录
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
applyqueue/
├── apps/
│   ├── web/          # React SPA (Vite + Tailwind + shadcn/ui)
│   └── functions/    # Firebase Cloud Functions (Node.js)
├── packages/
│   └── shared/       # Shared types, constants, utilities
├── docs/             # Architecture, API, schema docs
├── docker/           # Self-host Docker setup
└── scripts/          # Dev utilities
```

## Tech Stack

| Layer      | Choice                        |
|------------|-------------------------------|
| Frontend   | React 18, TypeScript, Vite    |
| UI         | Tailwind CSS, shadcn/ui       |
| State      | Zustand                       |
| Backend    | Firebase Cloud Functions v2   |
| Database   | Firestore                     |
| Auth       | Firebase Auth                 |
| Storage    | Cloud Storage for Firebase    |
| Monorepo   | pnpm workspaces + Turborepo   |
| Deploy     | Firebase Hosting + Cloudflare |

## Self-Host (Docker)

```bash
cp .env.example .env
# Edit .env with your ENCRYPTION_MASTER_KEY and Firebase config
docker compose -f docker/docker-compose.yml up
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript check |
| `firebase deploy` | Deploy to production |
| `pnpm emulators` | Local Firebase（无 Auth 模拟器，适合线上账号联调） |
| `pnpm emulators:all` | 完整模拟器（含 Auth；需配合 `VITE_USE_AUTH_EMULATOR`） |

## Contributing

PRs welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

## License

MIT
# applyqueue
