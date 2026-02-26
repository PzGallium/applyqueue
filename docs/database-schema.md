# ApplyQueue — 数据库 Schema (Firestore)

## 总览

Firestore 是文档型 NoSQL 数据库，以 Collection → Document 结构组织。
以下 Schema 同时适用于 Firebase Firestore 和自托管模式。

---

## Collections

### 1. `users`

用户基本信息和偏好。

```
users/{userId}
├── email: string
├── displayName: string
├── photoURL: string | null
├── createdAt: timestamp
├── updatedAt: timestamp
├── profile: {
│   ├── headline: string              // e.g. "CS New Grad 2026"
│   ├── summary: string               // 个人简介
│   ├── location: string              // 期望工作地
│   ├── education: [{
│   │   ├── school: string
│   │   ├── degree: string
│   │   ├── major: string
│   │   ├── gpa: number | null
│   │   ├── startDate: string
│   │   └── endDate: string
│   │}]
│   ├── experience: [{
│   │   ├── company: string
│   │   ├── title: string
│   │   ├── description: string
│   │   ├── startDate: string
│   │   ├── endDate: string | null
│   │   └── highlights: string[]
│   │}]
│   ├── skills: string[]
│   ├── projects: [{
│   │   ├── name: string
│   │   ├── description: string
│   │   ├── url: string | null
│   │   └── highlights: string[]
│   │}]
│   └── links: {
│       ├── github: string | null
│       ├── linkedin: string | null
│       ├── portfolio: string | null
│       └── other: string[]
│   }
│}
└── preferences: {
    ├── targetRoles: string[]          // ["Software Engineer", "Frontend Developer"]
    ├── targetLocations: string[]      // ["San Francisco, CA", "Remote"]
    ├── minSalary: number | null
    ├── companySize: string[]          // ["startup", "mid", "large"]
    ├── industries: string[]
    ├── excludeCompanies: string[]
    └── autoRankWeights: {
        ├── roleMatch: number          // 0-1
        ├── locationMatch: number
        ├── companyRating: number
        ├── salaryMatch: number
        └── recency: number
    }
}
```

### 2. `user_keys`

用户的 BYOK API 密钥（加密存储）。**仅服务端可读。**

```
user_keys/{userId}
├── keys: {
│   ├── openai: {
│   │   ├── encryptedKey: string       // AES-256-GCM 加密
│   │   ├── iv: string                 // 初始化向量
│   │   ├── tag: string                // 认证标签
│   │   └── updatedAt: timestamp
│   │}
│   ├── anthropic: {
│   │   ├── encryptedKey: string
│   │   ├── iv: string
│   │   ├── tag: string
│   │   └── updatedAt: timestamp
│   │}
│   ├── brave: {
│   │   ├── encryptedKey: string
│   │   ├── iv: string
│   │   ├── tag: string
│   │   └── updatedAt: timestamp
│   │}
│   └── custom: [{
│       ├── provider: string
│       ├── encryptedKey: string
│       ├── iv: string
│       ├── tag: string
│       └── updatedAt: timestamp
│   }]
│}
└── updatedAt: timestamp
```

### 3. `jobs`

全局职位池（所有用户共享）。

```
jobs/{jobId}
├── title: string
├── company: string
├── companyLogo: string | null
├── location: string
├── locationType: "remote" | "hybrid" | "onsite"
├── url: string                        // 原始 JD 链接
├── source: string                     // "greenhouse" | "lever" | "ashby" | "rss" | "manual"
├── sourceId: string                   // 来源平台的原始 ID
├── dedupeHash: string                 // SHA-256(title + company + location)
├── salary: {
│   ├── min: number | null
│   ├── max: number | null
│   └── currency: string
│}
├── tags: string[]                     // ["new-grad", "frontend", "backend", "fullstack"]
├── level: string                      // "entry" | "mid" | "senior" | "staff"
├── postedAt: timestamp
├── scrapedAt: timestamp
├── expiresAt: timestamp | null
├── isActive: boolean
└── rawDescription: string             // 原始 JD 文本（截断保存）
```

**索引：**
- `isActive` + `postedAt` (降序) — 按时间列出活跃职位
- `dedupeHash` — 去重查询
- `tags` (array-contains) — 按标签筛选
- `company` — 按公司筛选

### 4. `job_sources`

职位数据来源配置。

```
job_sources/{sourceId}
├── name: string                       // "Greenhouse - Stripe"
├── type: "greenhouse" | "lever" | "ashby" | "rss" | "custom"
├── config: {
│   ├── baseUrl: string
│   ├── filters: map                   // 来源特定的筛选参数
│   └── schedule: string               // cron 表达式
│}
├── isEnabled: boolean
├── lastRunAt: timestamp | null
├── lastRunStatus: "success" | "error" | null
├── jobCount: number                   // 该来源导入的职位数
├── createdAt: timestamp
└── updatedAt: timestamp
```

### 5. `ranked_lists`

每个用户的个性化排名列表。

```
ranked_lists/{userId}
├── rankings: [{
│   ├── jobId: string
│   ├── rank: number
│   ├── score: number                  // 综合匹配分 0-100
│   ├── scoreBreakdown: {
│   │   ├── roleMatch: number
│   │   ├── locationMatch: number
│   │   ├── companyRating: number
│   │   ├── salaryMatch: number
│   │   └── recency: number
│   │}
│   └── addedAt: timestamp
│}]
├── generatedAt: timestamp
├── totalJobs: number
└── filters: {                         // 生成时使用的筛选条件快照
    ├── targetRoles: string[]
    ├── targetLocations: string[]
    └── level: string[]
}
```

### 6. `applications`

用户的申请记录和状态追踪。

```
applications/{applicationId}
├── userId: string
├── jobId: string
├── status: "saved" | "applied" | "oa" | "interview" | "offer" | "rejected"
├── statusHistory: [{
│   ├── status: string
│   ├── changedAt: timestamp
│   └── note: string | null
│}]
├── resumeId: string | null            // 关联的定制简历
├── appliedAt: timestamp | null
├── notes: string
├── priority: "high" | "medium" | "low"
├── createdAt: timestamp
└── updatedAt: timestamp
```

**索引：**
- `userId` + `status` — 用户按状态查询申请
- `userId` + `updatedAt` (降序) — 用户最近更新
- `userId` + `jobId` — 防止重复申请

### 7. `resumes`

生成的定制简历。

```
resumes/{resumeId}
├── userId: string
├── jobId: string
├── applicationId: string | null
├── templateId: string                 // 使用的模板
├── content: {
│   ├── headline: string
│   ├── summary: string
│   ├── experience: [{
│   │   ├── company: string
│   │   ├── title: string
│   │   ├── date: string
│   │   └── bullets: string[]          // JD 对齐后的 bullet points
│   │}]
│   ├── education: [{...}]
│   ├── skills: string[]               // JD 关键词优先排序
│   └── projects: [{...}]
│}
├── changeSummary: string              // "what changed and why" 摘要
├── changes: [{
│   ├── section: string
│   ├── field: string
│   ├── original: string
│   ├── tailored: string
│   └── reason: string
│}]
├── jdKeywords: string[]               // 从 JD 提取的关键词
├── atsScore: number | null            // 预估 ATS 匹配分
├── llmModel: string                   // 使用的 LLM 模型
├── llmTokensUsed: number
├── generatedAt: timestamp
└── createdAt: timestamp
```

### 8. `exports`

导出文件记录。

```
exports/{exportId}
├── userId: string
├── resumeId: string
├── format: "pdf" | "docx"
├── storagePath: string                // Cloud Storage 路径
├── downloadUrl: string                // 带签名的下载 URL
├── urlExpiresAt: timestamp
├── fileSize: number                   // bytes
├── createdAt: timestamp
└── metadata: {
    ├── templateId: string
    ├── pageCount: number
    └── version: number
}
```

### 9. `events`

遥测和成本追踪事件。

```
events/{eventId}
├── userId: string
├── type: "api_call" | "resume_gen" | "export" | "jd_parse" | "job_ingest"
├── provider: string                   // "openai" | "anthropic" | "brave"
├── details: {
│   ├── model: string | null
│   ├── tokensIn: number | null
│   ├── tokensOut: number | null
│   ├── estimatedCost: number | null   // USD
│   ├── latencyMs: number
│   └── success: boolean
│}
├── relatedId: string | null           // resumeId / applicationId
├── createdAt: timestamp
└── sessionId: string | null
```

**索引：**
- `userId` + `createdAt` (降序) — 用户查看自己的用量
- `userId` + `type` + `createdAt` — 按类型筛选
- `type` + `createdAt` — 全局统计（管理员）

---

## 数据关系图

```
users ──1:1──> user_keys
  │
  ├──1:1──> ranked_lists
  │
  ├──1:N──> applications ──N:1──> jobs
  │              │
  │              └──1:1──> resumes
  │                           │
  │                           └──1:N──> exports
  │
  └──1:N──> events

jobs ──N:1──> job_sources
```

## Cloud Storage 结构

```
exports/
  {userId}/
    {resumeId}/
      resume-v1.pdf
      resume-v1.docx
templates/
  default/
    template.html
  modern/
    template.html
```
