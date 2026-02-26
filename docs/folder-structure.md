# ApplyQueue — Monorepo 项目结构

```
applyqueue/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # lint + test + typecheck
│   │   ├── deploy-preview.yml         # PR preview deploy
│   │   └── deploy-prod.yml            # main branch → production
│   └── ISSUE_TEMPLATE/
│       └── bug_report.md
│
├── packages/
│   ├── shared/                        # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts            # User, Profile, Preferences
│   │   │   │   ├── job.ts             # Job, JobSource, RankedJob
│   │   │   │   ├── application.ts     # Application, StatusHistory
│   │   │   │   ├── resume.ts          # Resume, ResumeContent, Change
│   │   │   │   ├── export.ts          # Export record
│   │   │   │   ├── event.ts           # Telemetry event
│   │   │   │   ├── api.ts             # API request/response types
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── status.ts          # Application status enum
│   │   │   │   ├── providers.ts       # LLM/search provider configs
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── dedupe.ts          # Dedup hash generation
│   │   │   │   ├── score.ts           # Ranking score calculation
│   │   │   │   ├── validate.ts        # Zod schemas for validation
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                            # 可复用 UI 组件（如需拆包）
│       ├── src/
│       │   └── components/
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── web/                           # 前端 SPA
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   └── robots.txt
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx         # Root layout
│   │   │   │   ├── page.tsx           # Landing / Dashboard
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── signup/page.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── page.tsx       # Ranked job list
│   │   │   │   │   └── queue/page.tsx # Apply queue
│   │   │   │   ├── jobs/
│   │   │   │   │   └── [id]/page.tsx  # Job detail
│   │   │   │   ├── resume/
│   │   │   │   │   └── [id]/page.tsx  # Resume preview
│   │   │   │   ├── tracker/
│   │   │   │   │   └── page.tsx       # Application tracker
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx       # Preferences + BYOK
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── Footer.tsx
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── JobRankList.tsx
│   │   │   │   │   ├── JobCard.tsx
│   │   │   │   │   └── JobDetail.tsx
│   │   │   │   ├── queue/
│   │   │   │   │   ├── ApplyQueue.tsx
│   │   │   │   │   ├── CommandBar.tsx
│   │   │   │   │   └── QueueItem.tsx
│   │   │   │   ├── resume/
│   │   │   │   │   ├── ResumePreview.tsx
│   │   │   │   │   ├── ChangeLog.tsx
│   │   │   │   │   └── ExportPanel.tsx
│   │   │   │   ├── tracker/
│   │   │   │   │   ├── TrackerBoard.tsx
│   │   │   │   │   ├── TrackerColumn.tsx
│   │   │   │   │   └── TrackerCard.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── KeyVault.tsx
│   │   │   │   │   ├── ProfileForm.tsx
│   │   │   │   │   └── PreferencesForm.tsx
│   │   │   │   └── ui/               # shadcn/ui components
│   │   │   │       ├── button.tsx
│   │   │   │       ├── card.tsx
│   │   │   │       ├── dialog.tsx
│   │   │   │       ├── input.tsx
│   │   │   │       └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useApply.ts
│   │   │   │   ├── useResume.ts
│   │   │   │   ├── useTracker.ts
│   │   │   │   └── useKeys.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── jobStore.ts
│   │   │   │   ├── queueStore.ts
│   │   │   │   └── trackerStore.ts
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts        # Firebase client init
│   │   │   │   ├── api.ts             # API client wrapper
│   │   │   │   └── utils.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── functions/                     # Firebase Cloud Functions
│       ├── src/
│       │   ├── index.ts               # Function exports entry
│       │   ├── config/
│       │   │   ├── firebase.ts        # Admin SDK init
│       │   │   └── env.ts             # Environment config
│       │   ├── middleware/
│       │   │   ├── auth.ts            # Token verification
│       │   │   ├── rateLimit.ts       # Rate limiting
│       │   │   └── validate.ts        # Request validation
│       │   ├── services/
│       │   │   ├── auth/
│       │   │   │   └── profileService.ts
│       │   │   ├── keys/
│       │   │   │   ├── keyService.ts   # Encrypt/decrypt/validate
│       │   │   │   └── crypto.ts       # AES-256-GCM helpers
│       │   │   ├── jobs/
│       │   │   │   ├── ingestService.ts
│       │   │   │   ├── dedupeService.ts
│       │   │   │   ├── rankService.ts
│       │   │   │   └── sources/
│       │   │   │       ├── greenhouse.ts
│       │   │   │       ├── lever.ts
│       │   │   │       ├── ashby.ts
│       │   │   │       └── rss.ts
│       │   │   ├── jd/
│       │   │   │   ├── fetchService.ts  # HTTP fetch JD page
│       │   │   │   └── parseService.ts  # LLM-based JD parsing
│       │   │   ├── resume/
│       │   │   │   ├── generateService.ts
│       │   │   │   ├── templateService.ts
│       │   │   │   └── prompts.ts       # LLM prompt templates
│       │   │   ├── export/
│       │   │   │   ├── pdfService.ts    # react-pdf / Puppeteer
│       │   │   │   └── docxService.ts   # docx library
│       │   │   ├── tracker/
│       │   │   │   └── trackerService.ts
│       │   │   └── telemetry/
│       │   │       └── eventService.ts
│       │   ├── functions/
│       │   │   ├── auth.fn.ts          # Auth trigger functions
│       │   │   ├── keys.fn.ts          # BYOK CRUD functions
│       │   │   ├── jobs.fn.ts          # Jobs API functions
│       │   │   ├── apply.fn.ts         # Apply N orchestration
│       │   │   ├── jd.fn.ts            # JD parse functions
│       │   │   ├── resume.fn.ts        # Resume CRUD functions
│       │   │   ├── export.fn.ts        # Export functions
│       │   │   ├── tracker.fn.ts       # Tracker CRUD functions
│       │   │   ├── usage.fn.ts         # Cost/usage functions
│       │   │   └── ingest.fn.ts        # Scheduled ingest
│       │   └── utils/
│       │       ├── llm.ts              # LLM client factory (OpenAI/Claude)
│       │       ├── brave.ts            # Brave Search client
│       │       └── response.ts         # Standard response helpers
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
│
├── firebase.json                      # Firebase project config
├── firestore.rules                    # Firestore security rules
├── firestore.indexes.json             # Firestore composite indexes
├── storage.rules                      # Cloud Storage security rules
├── .firebaserc                        # Firebase project aliases
│
├── docker/
│   ├── docker-compose.yml             # Self-host compose
│   ├── docker-compose.dev.yml         # Local dev compose
│   ├── web/
│   │   └── Dockerfile
│   ├── api/
│   │   └── Dockerfile
│   └── nginx/
│       └── nginx.conf
│
├── scripts/
│   ├── setup.sh                       # One-click local setup
│   ├── seed-jobs.ts                   # Seed test job data
│   └── generate-env.sh               # Generate .env from template
│
├── .env.example                       # Root env template
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── turbo.json                         # Turborepo config
├── pnpm-workspace.yaml
├── package.json                       # Root package.json
├── tsconfig.base.json                 # Shared TS config
├── LICENSE                            # MIT
└── README.md
```
