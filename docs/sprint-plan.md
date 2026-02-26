# ApplyQueue — 2 周 MVP 冲刺计划

## 总览

- **周期**: 14 天（Day 1 – Day 14）
- **目标**: 可部署的端到端 MVP，覆盖核心 apply N 工作流
- **原则**: 先跑通流程，再优化体验；每天有可演示的增量

---

## Week 1: 基础设施 + 核心管线

### Day 1 — 项目脚手架 ✦ Foundation
| 任务 | 交付物 |
|------|--------|
| 初始化 monorepo (pnpm + Turborepo) | `turbo.json`, `pnpm-workspace.yaml` |
| 搭建 `packages/shared` 类型包 | User/Job/Application/Resume 类型 |
| 搭建 `apps/web` (Vite + React + Tailwind + shadcn) | 可运行的空 SPA |
| 搭建 `apps/functions` (Firebase Functions v2) | 可部署的 hello-world function |
| 配置 ESLint + Prettier + TS | 统一代码风格 |
| 编写 `.env.example` + `setup.sh` | 新人 clone → 5 分钟跑起来 |
| 初始化 Firebase 项目 + Firestore Emulator | 本地开发环境 |

### Day 2 — Auth + Profile ✦ Identity
| 任务 | 交付物 |
|------|--------|
| 集成 Firebase Auth (Email + Google) | 登录/注册页面 |
| 实现 `auth/profile` API (创建/更新) | Profile CRUD function |
| 编写 Firestore Security Rules (users) | 数据权限隔离 |
| 前端: Profile 编辑表单 | Education / Experience / Skills 输入 |
| Zustand authStore | 全局 auth 状态 |

### Day 3 — BYOK 密钥管理 ✦ Keys
| 任务 | 交付物 |
|------|--------|
| 实现 AES-256-GCM 加解密工具 | `crypto.ts` |
| Keys API: PUT / GET / DELETE / validate | BYOK 后端 CRUD |
| 前端: KeyVault 组件 | 密钥输入 + 状态显示 + 验证按钮 |
| Firestore Rules: user_keys (server-only) | 客户端无法直读密钥 |

### Day 4 — 职位数据摄取 ✦ Jobs Pipeline
| 任务 | 交付物 |
|------|--------|
| 实现 Greenhouse adapter | 从 Greenhouse boards API 拉取职位 |
| 实现去重引擎 (title+company+location SHA-256) | `dedupeService.ts` |
| Jobs API: GET /jobs + GET /jobs/:id | 分页 + 筛选 |
| Seed 脚本: 导入 50-100 条真实 new-grad 职位 | 测试数据 |
| Firestore 索引配置 | `firestore.indexes.json` |

### Day 5 — 排名引擎 + 列表 UI ✦ Ranking
| 任务 | 交付物 |
|------|--------|
| 实现排名评分算法 (加权多因子) | `rankService.ts` |
| Rankings API: GET /jobs/ranked + POST refresh | 个性化排名 |
| 前端: JobRankList + JobCard 组件 | 排名职位列表页面 |
| 前端: CommandBar (`apply N` 输入框) | 快捷操作入口 |

### Day 6 — JD 抓取 + 解析 ✦ JD Parser
| 任务 | 交付物 |
|------|--------|
| JD 页面抓取服务 (HTTP fetch + HTML parse) | `fetchService.ts` |
| LLM JD 解析 (提取要求/关键词/nice-to-have) | `parseService.ts` + prompts |
| LLM 客户端工厂 (OpenAI / Claude 适配) | `llm.ts` |
| JD Parse API: POST /jd/parse | 独立 JD 解析端点 |
| 前端: Job Detail 页面 (展示解析结果) | 关键词标签 + 要求列表 |

### Day 7 — 集成测试 + 修复 ✦ Stabilize W1
| 任务 | 交付物 |
|------|--------|
| 端到端流程测试: Auth → Keys → Jobs → Rank | 全链路验证 |
| 修复 Week 1 发现的 bug | 稳定的基础链路 |
| 补充关键路径单元测试 | crypto / dedupe / rank 测试 |
| 代码审查 + 重构 | 清理技术债 |

---

## Week 2: 简历生成 + 导出 + 追踪

### Day 8 — 简历生成服务 ✦ Resume Gen
| 任务 | 交付物 |
|------|--------|
| Resume 生成 prompt 工程 | `prompts.ts` (系统提示 + few-shot) |
| Resume 生成服务 (profile + JD → tailored resume) | `generateService.ts` |
| "What changed and why" diff 生成 | 变更摘要 + 逐项对比 |
| Resume API: GET /resumes + GET /resumes/:id | 简历 CRUD |

### Day 9 — Apply N 完整流程 ✦ Core Flow
| 任务 | 交付物 |
|------|--------|
| Apply 编排服务 (rank解析 → JD → Resume → Export) | `apply.fn.ts` |
| POST /apply API + GET /apply/:id/status | 异步流程 + 进度轮询 |
| Firestore 实时监听进度更新 | 前端实时状态 |
| 前端: ApplyQueue 组件 (进度条 + 状态) | 申请流程可视化 |

### Day 10 — PDF/DOCX 导出 ✦ Export
| 任务 | 交付物 |
|------|--------|
| PDF 导出 (react-pdf 模板渲染) | `pdfService.ts` |
| DOCX 导出 (docx library 模板渲染) | `docxService.ts` |
| Cloud Storage 上传 + 签名 URL | 安全下载链接 |
| 前端: ResumePreview + ExportPanel | 预览 + 一键下载 |
| 前端: ChangeLog 组件 | 展示 "what changed and why" |

### Day 11 — 申请追踪看板 ✦ Tracker
| 任务 | 交付物 |
|------|--------|
| Tracker API: CRUD applications | 状态流转 |
| 前端: TrackerBoard (Kanban 6 列) | 拖拽式状态看板 |
| 状态流: Saved → Applied → OA → Interview → Offer/Rejected | 完整状态机 |
| 前端: 笔记 + 优先级标记 | 申请备注 |

### Day 12 — 遥测 + 成本 ✦ Usage
| 任务 | 交付物 |
|------|--------|
| Event tracking 中间件 | 每次 API 调用自动记录 |
| Usage API: GET /usage | 费用统计 |
| 前端: Usage Dashboard (Settings 子页面) | Token 用量 + 费用展示 |
| Rate limiting 中间件 | 防滥用 |

### Day 13 — 部署 + 自托管 ✦ Ship
| 任务 | 交付物 |
|------|--------|
| Firebase Hosting + Functions 部署 | 生产环境上线 |
| Cloudflare DNS 配置 → applyqueue.com | 域名生效 |
| Docker Compose 自托管配置 | `docker-compose.yml` |
| `setup.sh` 一键本地启动脚本 | 自托管文档 |
| CI/CD: GitHub Actions (lint + test + deploy) | 自动化流水线 |

### Day 14 — 打磨 + 发布 ✦ Launch
| 任务 | 交付物 |
|------|--------|
| Landing page (未登录首页) | 产品介绍 + CTA |
| README.md (完整文档) | 安装/使用/部署/贡献指南 |
| 全流程 smoke test | 端到端验证 |
| Bug fixes + UX 细节 | 可发布状态 |
| Open source: LICENSE (MIT) + CONTRIBUTING.md | 开源准备 |

---

## 每日节奏

```
09:00  Review yesterday's deliverable, plan today
09:30  Code sprint block 1 (3h, core feature)
12:30  Lunch
13:30  Code sprint block 2 (3h, supporting work)
16:30  Test + fix + commit
17:30  Update docs + prep tomorrow
```

## 风险缓冲

| 风险 | 缓冲策略 |
|------|---------|
| LLM prompt 迭代慢 | Day 8 提前准备多版 prompt，硬编码兜底模板 |
| PDF 渲染复杂 | 先用简单 HTML→PDF (Puppeteer)，后续再优化模板 |
| 外部 ATS API 变动 | Greenhouse 最稳定，先只做一个来源 |
| 部署配置耗时 | Day 1 就初始化 Firebase，保持随时可部署 |

## MVP 完成定义

- [ ] 用户可以注册/登录
- [ ] 用户可以配置 BYOK 密钥
- [ ] 用户可以看到排名职位列表
- [ ] 用户可以输入 `apply 3` 触发完整流程
- [ ] 系统自动 抓取JD → 解析 → 生成简历 → 导出 PDF/DOCX
- [ ] 用户可以下载定制简历
- [ ] 用户可以在看板上追踪申请状态
- [ ] 用户可以查看 API 用量和费用
- [ ] 产品部署在 applyqueue.com
- [ ] Docker Compose 支持自托管
