# ApplyQueue — API 接口契约

## 基础约定

- **Base URL**: `https://applyqueue.com/api` (生产) / `http://localhost:5001/applyqueue/us-central1` (本地)
- **认证**: Bearer Token (Firebase ID Token) in `Authorization` header
- **格式**: JSON, Content-Type: `application/json`
- **错误格式**:

```json
{
  "error": {
    "code": "INVALID_KEY",
    "message": "The provided API key is invalid",
    "details": {}
  }
}
```

- **通用 HTTP 状态码**: 200 成功 / 201 创建 / 400 参数错误 / 401 未认证 / 403 无权限 / 404 不存在 / 429 频率限制 / 500 服务器错误

---

## 1. Auth & Profile

### POST `/auth/profile`
初始化或更新用户 profile。

**Request:**
```json
{
  "displayName": "Jane Doe",
  "profile": {
    "headline": "CS New Grad 2026",
    "summary": "...",
    "location": "San Francisco, CA",
    "education": [...],
    "experience": [...],
    "skills": ["TypeScript", "React", "Python"],
    "projects": [...],
    "links": { "github": "https://github.com/jane", ... }
  },
  "preferences": {
    "targetRoles": ["Software Engineer"],
    "targetLocations": ["San Francisco, CA", "Remote"],
    "companySize": ["startup", "mid"],
    "autoRankWeights": {
      "roleMatch": 0.3,
      "locationMatch": 0.2,
      "companyRating": 0.2,
      "salaryMatch": 0.15,
      "recency": 0.15
    }
  }
}
```

**Response:** `200`
```json
{
  "userId": "abc123",
  "updatedAt": "2026-02-26T12:00:00Z"
}
```

### GET `/auth/profile`
获取当前用户 profile。

**Response:** `200` — 完整 user 对象

---

## 2. BYOK Keys

### PUT `/keys`
保存/更新 API 密钥（服务端加密后存储）。

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

**Response:** `200`
```json
{
  "provider": "openai",
  "status": "saved",
  "updatedAt": "2026-02-26T12:00:00Z"
}
```

### GET `/keys`
列出已配置的 provider（不返回密钥明文）。

**Response:** `200`
```json
{
  "keys": [
    { "provider": "openai", "configured": true, "updatedAt": "..." },
    { "provider": "brave", "configured": false, "updatedAt": null }
  ]
}
```

### DELETE `/keys/:provider`
删除指定 provider 的密钥。

**Response:** `200`
```json
{ "provider": "openai", "deleted": true }
```

### POST `/keys/validate`
验证密钥是否有效（做一次最低开销的 API 调用测试）。

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

**Response:** `200`
```json
{
  "provider": "openai",
  "valid": true,
  "model": "gpt-4o-mini",
  "message": "Key is valid"
}
```

---

## 3. Jobs

### GET `/jobs`
获取职位列表（支持分页和筛选）。

**Query Params:**
| 参数       | 类型     | 默认值 | 说明              |
|-----------|---------|-------|-------------------|
| page      | number  | 1     | 页码               |
| limit     | number  | 20    | 每页数量（max 50）  |
| roles     | string  | -     | 逗号分隔，角色筛选   |
| locations | string  | -     | 逗号分隔，地点筛选   |
| level     | string  | -     | entry/mid/senior   |
| source    | string  | -     | 来源筛选            |
| search    | string  | -     | 关键词搜索          |

**Response:** `200`
```json
{
  "jobs": [
    {
      "id": "job_001",
      "title": "Software Engineer, New Grad",
      "company": "Stripe",
      "location": "San Francisco, CA",
      "locationType": "hybrid",
      "url": "https://...",
      "source": "greenhouse",
      "tags": ["new-grad", "fullstack"],
      "level": "entry",
      "postedAt": "2026-02-20T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### GET `/jobs/:id`
获取单个职位详情（含完整 JD 文本）。

### GET `/jobs/ranked`
获取当前用户的个性化排名列表。

**Response:** `200`
```json
{
  "rankings": [
    {
      "rank": 1,
      "job": { "id": "job_001", "title": "...", ... },
      "score": 92,
      "scoreBreakdown": {
        "roleMatch": 28,
        "locationMatch": 20,
        "companyRating": 18,
        "salaryMatch": 14,
        "recency": 12
      }
    }
  ],
  "generatedAt": "2026-02-26T10:00:00Z",
  "totalJobs": 50
}
```

### POST `/jobs/ranked/refresh`
重新计算排名（根据最新偏好和职位池）。

**Response:** `200`
```json
{
  "totalJobs": 55,
  "generatedAt": "2026-02-26T12:30:00Z"
}
```

---

## 4. Apply Queue

### POST `/apply`
**核心操作**：Apply N — 申请排名第 N 的职位。触发完整的 JD 解析 → 简历生成 → 导出流程。

**Request:**
```json
{
  "rank": 3,
  "options": {
    "exportFormats": ["pdf", "docx"],
    "templateId": "default",
    "llmProvider": "openai",
    "llmModel": "gpt-4o"
  }
}
```

**Response:** `202 Accepted`（异步处理）
```json
{
  "applicationId": "app_001",
  "jobId": "job_003",
  "status": "processing",
  "steps": [
    { "step": "jd_fetch", "status": "pending" },
    { "step": "jd_parse", "status": "pending" },
    { "step": "resume_generate", "status": "pending" },
    { "step": "export_pdf", "status": "pending" },
    { "step": "export_docx", "status": "pending" }
  ],
  "trackUrl": "/apply/app_001/status"
}
```

### GET `/apply/:applicationId/status`
轮询申请处理进度。

**Response:** `200`
```json
{
  "applicationId": "app_001",
  "status": "completed",
  "steps": [
    { "step": "jd_fetch", "status": "completed", "durationMs": 1200 },
    { "step": "jd_parse", "status": "completed", "durationMs": 3400 },
    { "step": "resume_generate", "status": "completed", "durationMs": 8500 },
    { "step": "export_pdf", "status": "completed", "durationMs": 2100 },
    { "step": "export_docx", "status": "completed", "durationMs": 1800 }
  ],
  "result": {
    "resumeId": "res_001",
    "exports": [
      { "format": "pdf", "downloadUrl": "https://..." },
      { "format": "docx", "downloadUrl": "https://..." }
    ],
    "changeSummary": "Emphasized React and TypeScript experience to match JD requirements...",
    "atsScore": 87,
    "cost": {
      "provider": "openai",
      "tokensUsed": 4200,
      "estimatedCost": 0.012
    }
  }
}
```

---

## 5. JD Parse

### POST `/jd/parse`
手动触发 JD 解析（不走 apply 流程）。

**Request:**
```json
{
  "jobId": "job_001",
  "llmProvider": "openai"
}
```

**Response:** `200`
```json
{
  "jobId": "job_001",
  "parsed": {
    "requirements": ["3+ years TypeScript", "React experience", ...],
    "niceToHaves": ["GraphQL", "AWS"],
    "keywords": ["TypeScript", "React", "Node.js", "PostgreSQL"],
    "responsibilities": [...],
    "teamInfo": "Payments Infrastructure team",
    "level": "entry"
  },
  "cost": {
    "tokensUsed": 1500,
    "estimatedCost": 0.004
  }
}
```

---

## 6. Resume

### GET `/resumes`
列出用户的所有简历。

**Query Params:** `page`, `limit`, `jobId`

### GET `/resumes/:id`
获取简历详情（含 content 和 changeSummary）。

### POST `/resumes/:id/export`
为已有简历生成新的导出格式。

**Request:**
```json
{
  "format": "pdf",
  "templateId": "modern"
}
```

**Response:** `200`
```json
{
  "exportId": "exp_001",
  "format": "pdf",
  "downloadUrl": "https://...",
  "expiresAt": "2026-02-27T12:00:00Z"
}
```

---

## 7. Application Tracker

### GET `/applications`
获取用户的所有申请记录。

**Query Params:** `status`, `page`, `limit`, `sort`

**Response:** `200`
```json
{
  "applications": [
    {
      "id": "app_001",
      "job": { "id": "job_003", "title": "...", "company": "..." },
      "status": "applied",
      "resumeId": "res_001",
      "appliedAt": "2026-02-26T12:00:00Z",
      "updatedAt": "2026-02-26T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### PATCH `/applications/:id`
更新申请状态。

**Request:**
```json
{
  "status": "interview",
  "note": "Phone screen scheduled for March 5"
}
```

### DELETE `/applications/:id`
删除申请记录。

---

## 8. Cost & Usage

### GET `/usage`
获取用户 API 使用量和费用估算。

**Query Params:** `period` (`day` | `week` | `month`)

**Response:** `200`
```json
{
  "period": "week",
  "startDate": "2026-02-19",
  "endDate": "2026-02-26",
  "summary": {
    "totalCalls": 24,
    "totalTokens": 52000,
    "estimatedCost": 0.156,
    "byProvider": {
      "openai": { "calls": 20, "tokens": 48000, "cost": 0.144 },
      "brave": { "calls": 4, "tokens": 0, "cost": 0.012 }
    },
    "byType": {
      "resume_gen": { "count": 8, "cost": 0.096 },
      "jd_parse": { "count": 12, "cost": 0.048 },
      "export": { "count": 4, "cost": 0.0 }
    }
  }
}
```

---

## WebSocket / Realtime

简历生成等耗时操作通过 **Firestore 实时监听** 推送进度更新，而非 WebSocket。

```
前端订阅: onSnapshot(doc(db, 'applications', applicationId))
```

状态变更时 Cloud Function 更新 Firestore 文档，前端自动收到更新。
