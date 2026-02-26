# ApplyQueue — 技术架构文档

## 1. 系统总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare DNS                           │
│                     applyqueue.com → Firebase                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     Firebase Hosting (SPA)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js / React SPA (Static Export)          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │  │
│  │  │ Auth UI │ │ Queue UI │ │ Tracker │ │ Settings/BYOK│  │  │
│  │  └─────────┘ └──────────┘ └─────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                    Firebase Cloud Functions (v2)                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │  Auth API  │ │  Jobs API  │ │ Resume API │ │ Export API │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ JD Parser  │ │ Ingest Svc │ │ Track API  │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
└──────────────────────────────┬──────────────────────────────────┘
           │                   │                    │
     ┌─────▼─────┐   ┌────────▼────────┐   ┌──────▼──────┐
     │ Firestore  │   │ Firebase Auth   │   │ Cloud Storage│
     │  (NoSQL)   │   │ (Google/Email)  │   │  (exports)   │
     └────────────┘   └─────────────────┘   └──────────────┘
           │
     ┌─────▼─────────────────────────────────────┐
     │         External APIs (User's Keys)        │
     │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │
     │  │ Brave    │ │ OpenAI   │ │ Other LLM │  │
     │  │ Search   │ │ / Claude │ │ Providers  │  │
     │  └──────────┘ └──────────┘ └───────────┘  │
     └────────────────────────────────────────────┘
```

## 2. 技术栈选型

| 层          | 选型                          | 理由                                                  |
|-------------|-------------------------------|-------------------------------------------------------|
| 前端        | React 18 + TypeScript         | 生态成熟，组件丰富，TS 保证类型安全                    |
| UI 框架     | Tailwind CSS + shadcn/ui      | 快速出界面，设计一致性好，bundle 小                     |
| 状态管理    | Zustand                       | 轻量，API 简洁，适合中小型 SPA                         |
| 构建工具    | Vite                          | 极速 HMR，配置简单                                     |
| 后端        | Firebase Cloud Functions (v2) | Serverless，按需计费，零运维                           |
| 运行时      | Node.js 20 + TypeScript       | 与前端共享类型，BYOK 调用外部 API 方便                 |
| 数据库      | Firestore                     | 实时同步，Serverless，与 Firebase 生态无缝集成          |
| 认证        | Firebase Auth                 | 支持 Google/Email/GitHub 登录，开箱即用                |
| 文件存储    | Cloud Storage for Firebase    | 存储导出的 PDF/DOCX                                    |
| Monorepo    | pnpm workspaces + Turborepo   | 快速安装，增量构建，共享类型包                          |
| 部署        | Firebase Hosting + Functions  | 一键部署，CDN 加速                                     |
| DNS         | Cloudflare                    | 免费 DNS，DDoS 防护，SSL                               |

## 3. 前端架构

### 3.1 页面结构

```
/                     → Landing (未登录) / Dashboard (已登录)
/auth/login           → 登录页
/auth/signup          → 注册页
/dashboard            → 职位排名列表 + Apply N 操作
/dashboard/queue      → 当前申请队列
/jobs/:id             → 职位详情 + JD 解析结果
/resume/:id           → 生成的简历预览 + 导出
/tracker              → 申请追踪看板
/settings             → 用户偏好 + BYOK 密钥管理
```

### 3.2 核心组件

- **JobRankList** — 排名后的职位列表，支持 `apply N` 快捷操作
- **ApplyQueue** — 当前选中待申请的职位队列
- **ResumePreview** — 实时预览生成的简历
- **ExportPanel** — PDF/DOCX 导出按钮 + 下载
- **TrackerBoard** — Kanban 风格的申请状态追踪
- **KeyVault** — BYOK 密钥输入/管理界面
- **CommandBar** — 支持 `apply 3` 这类快捷命令输入

### 3.3 前端数据流

```
User Action → Zustand Store → Firebase SDK → Firestore (realtime listener)
                    ↕
            Cloud Functions API (resume gen, JD parse, export)
```

## 4. 后端服务架构

### 4.1 Cloud Functions 服务划分

| 服务          | 函数前缀       | 职责                                          |
|---------------|----------------|-----------------------------------------------|
| Auth Service  | `auth-*`       | 用户创建后初始化 profile，密钥加密存储          |
| Jobs Service  | `jobs-*`       | 职位数据摄取、去重、排名                       |
| JD Service    | `jd-*`         | 抓取 JD 页面，提取关键词/要求                  |
| Resume Service| `resume-*`     | 基于 JD + 用户 profile 生成定制简历            |
| Export Service| `export-*`     | 简历转 PDF/DOCX，上传 Cloud Storage            |
| Track Service | `track-*`      | 申请状态流转 CRUD                              |
| Ingest Worker | `ingest-*`     | 定时触发，从多来源拉取新职位                    |

### 4.2 BYOK 调用流程

```
1. 用户在 Settings 页面输入 API Key
2. 前端通过 HTTPS 发送到 Cloud Function
3. Cloud Function 用 Firebase 服务端密钥 AES-256-GCM 加密后存入 Firestore
4. 需要调用外部 API 时:
   a. Cloud Function 读取用户的加密 key
   b. 解密
   c. 使用用户的 key 调用 Brave/OpenAI/etc
   d. 返回结果，不缓存 key 在内存中
```

### 4.3 Job Ingestion Pipeline

```
Scheduler (Cloud Scheduler / cron)
    │
    ▼
ingest-trigger (Cloud Function)
    │
    ├── Source: Greenhouse API
    ├── Source: Lever API
    ├── Source: Ashby API
    ├── Source: RSS Feeds
    └── Source: Custom scraper configs
    │
    ▼
Dedup Engine (title + company + location hash)
    │
    ▼
Firestore: jobs collection
    │
    ▼
Ranking Engine (user prefs × job signals)
    │
    ▼
Firestore: ranked_lists/{userId}
```

### 4.4 Resume Generation Pipeline

```
apply N command
    │
    ▼
Resolve Nth ranked job → get job_id
    │
    ▼
jd-fetch: HTTP GET job URL → raw HTML
    │
    ▼
jd-parse: LLM extract (requirements, keywords, nice-to-haves)
    │        ↑ uses user's LLM API key
    ▼
resume-generate:
    Input: user_profile + parsed_jd + resume_template
    Output: tailored resume JSON + "what changed & why" summary
    ↑ uses user's LLM API key
    │
    ▼
export-render:
    resume JSON → PDF (via Puppeteer/react-pdf)
    resume JSON → DOCX (via docx library)
    │
    ▼
Cloud Storage: exports/{userId}/{resumeId}.{pdf,docx}
    │
    ▼
Return download URLs to frontend
```

## 5. 安全架构

### 5.1 密钥管理

- 用户 API Key 全程加密存储（AES-256-GCM）
- 加密主密钥存放在 Firebase 环境变量（不进入代码仓库）
- 解密仅在 Cloud Function 运行时进行，解密后的 key 不持久化
- Firestore Security Rules 确保用户只能读写自己的数据

### 5.2 数据访问控制

```
Firestore Rules:
  users/{userId}          → owner read/write only
  user_keys/{userId}      → owner write only, no client read (server-side only)
  jobs/{jobId}            → authenticated read, admin write
  applications/{appId}    → owner read/write only
  resumes/{resumeId}      → owner read/write only
```

### 5.3 Rate Limiting

- Cloud Functions 自带并发控制
- 用户级别：每分钟最多 10 次 resume 生成请求
- IP 级别：Firebase App Check 防刷

## 6. 自托管架构

自托管版本使用 Docker Compose 一键启动：

```
docker-compose.yml
├── web          (Vite build → nginx serve)
├── api          (Express server, same Cloud Function code)
├── firestore    (Firebase Emulator or standalone Firestore)
└── storage      (MinIO, S3-compatible)
```

环境变量通过 `.env` 文件配置，包含：
- `ENCRYPTION_MASTER_KEY` — 用户密钥加密主密钥
- `FIREBASE_*` — Firebase 配置（自托管可留空）
- 用户自行在 UI 中输入 BYOK 密钥

## 7. 可观测性

| 维度     | 工具                        |
|----------|----------------------------|
| 日志     | Cloud Logging (Firebase)   |
| 错误追踪 | Sentry (free tier)         |
| 性能     | Firebase Performance SDK   |
| 分析     | Plausible (privacy-first)  |
| 成本     | 自建 cost tracker 中间件    |
