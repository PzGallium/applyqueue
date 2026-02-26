# Apply N MVP 交付说明

## 一、修改/新增文件列表

### 新增
- `apps/functions/src/services/apply/types.ts` — 流程类型、错误码、ResumeContent Zod schema
- `apps/functions/src/services/apply/resume-generator.ts` — LLM 生成 Resume JSON
- `apps/functions/src/services/apply/pdf-exporter.ts` — HTML 模板 → PDF Buffer
- `apps/functions/src/services/apply/artifact-store.ts` — 上传 Storage + 签名 URL（含 `getResumeDownloadUrl` 供幂等回放）
- `apps/functions/src/puppeteer.d.ts` — Puppeteer 模块类型声明（便于类型检查）
- `apps/functions/src/functions/applications.fn.ts` — GET /api/applications（列表）、GET /api/applications/:applyId（单条，用户隔离）

### 修改
- `packages/shared/src/utils/validate.ts` — 新增 `applyMvpRequestSchema`（rankIndex、可选 idempotencyKey）
- `apps/functions/src/functions/apply.fn.ts` — 重写为 MVP 同步流程；幂等键（userId+rankIndex+1h bucket）；CREDENTIAL_NOT_CONFIGURED
- `apps/functions/package.json` — 新增依赖：puppeteer、zod、@types/node
- `firestore.indexes.json` — applications：`userId`+`createdAt` desc（列表）、`userId`+`idempotencyKey`+`createdAt` desc（幂等查询）

---

## 二、API 契约

### 请求
- **Method**: `POST`
- **Path**: `/api/apply`
- **Headers**: `Authorization: Bearer <Firebase ID Token>`
- **Body**: `{ "rankIndex": number, "idempotencyKey"?: string }`  
  - `rankIndex`：正整数，1-based，对应排名列表中的 rank。  
  - `idempotencyKey`：可选。不传时服务端按 `userId:rankIndex:YYYY-MM-DDTHH`（1 小时桶）去重；同桶内同一 rank 若已有 `done` 则直接返回该次结果，若进行中则 409。

### 成功响应（200）
```json
{
  "applyId": "string",
  "job": {
    "id": "string",
    "title": "string",
    "company": "string",
    "sourceUrl": null
  },
  "status": "done",
  "artifact": {
    "format": "pdf",
    "path": "resumes/{userId}/{applyId}.pdf",
    "downloadUrl": "https://...",
    "expiresAt": "2025-02-26T12:00:00.000Z"
  }
}
```

### 错误响应（4xx/5xx）
```json
{
  "error": {
    "code": "RANKED_LIST_NOT_FOUND",
    "message": "Ranked list not found"
  }
}
```

| 错误码 | HTTP | 说明 |
|--------|------|------|
| INVALID_INPUT | 400 | rankIndex 非法 |
| RANKED_LIST_NOT_FOUND | 404 | 排名列表不存在 |
| RANK_INDEX_OUT_OF_RANGE | 404 | 该 rank 无对应职位 |
| JD_NOT_AVAILABLE | 400 | 职位无 JD 或过短 |
| PROFILE_NOT_FOUND | 404 | 用户 profile 缺失/不完整 |
| CREDENTIAL_NOT_CONFIGURED | 400 | 未配置 Gemini Key（用户配置问题） |
| LLM_GENERATION_FAILED | 502 | LLM 调用或输出校验失败 |
| PDF_EXPORT_FAILED | 500 | PDF 导出失败 |
| STORAGE_UPLOAD_FAILED | 500 | 上传或签名 URL 失败 |
| APPLICATION_IN_PROGRESS | 409 | 同幂等键下已有进行中的申请，可用 GET /api/applications/:id 轮询 |
| INTERNAL_ERROR | 500 | 未分类异常 |

### 读取接口（历史/重试）

- **GET /api/applications** — 当前用户申请列表，按 `createdAt` 倒序，最多 50 条。  
  - 响应：`{ "applications": [ { "id", "userId", "rankIndex", "jobId", "status", "errorCode", "errorMessage", "artifact", "createdAt", "updatedAt" }, ... ] }`
- **GET /api/applications/:applyId** — 单条详情（仅限当前用户）。  
  - 响应：单条同上的对象。用于前端展示历史、重试前查状态或轮询进行中任务。

**Firestore 索引**：`applications` 需复合索引（见 `firestore.indexes.json`）：  
- `userId` ASC + `createdAt` DESC（列表）  
- `userId` ASC + `idempotencyKey` ASC + `createdAt` DESC（幂等查询）

---

## 三、状态流转

```
queued → jd_ready → generated → exported → done
   ↓          ↓           ↓           ↓
   └──────────┴───────────┴───────────┴──→ failed (+ errorCode, errorMessage)
```

- 创建 `applications/{applyId}` 后为 `queued`
- 通过 JD / profile 校验后更新为 `jd_ready`
- LLM 生成 Resume JSON 成功后为 `generated`
- PDF 导出成功后为 `exported`
- 上传并拿到签名 URL 后为 `done`，并写入 `artifact.path`
- 任一步失败则更新为 `failed`，并写入 `errorCode`、`errorMessage`

---

## 四、本地验证命令及结果

```bash
# 在仓库根目录
pnpm install
pnpm build
```

**结果**：`Tasks: 3 successful, 3 total`（@applyqueue/shared、@applyqueue/functions、@applyqueue/web 均通过）。

### Functions 本地调用示例
```bash
# 需先获取 Firebase ID Token（如从 Web 登录后取）
curl -X POST http://localhost:5001/<project>/us-central1/applyApi \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rankIndex": 1}'
```

（实际部署时路径以 Firebase 配置为准。）

---

## 五、已知限制（MVP 阶段）

- **仅 PDF**：不支持 DOCX。
- **JD 来源**：仅使用 `job.rawDescription`，无则报错，不做回源抓取。
- **LLM**：固定使用 Gemini；密钥来自 `user_keys`（先 `resolveCredential`，再回退 `decryptUserKey`）。
- **Puppeteer**：在 Cloud Functions 上存在部署风险（见下文「六、Puppeteer 部署风险」）。
- **文件名**：PDF 建议名称为 `{displayName}_{company}_{role}_{YYYYMMDD}.pdf`，displayName 来自 `users/{userId}.displayName`，缺省为 `"Resume"`。
- **签名 URL**：有效期 1 小时（代码中常量化）。

---

## 六、Puppeteer 在 Firebase Functions 的部署风险

当前 PDF 导出使用 **Puppeteer + 自带 Chromium**，在 Firebase Cloud Functions 上可能踩坑：

| 风险 | 说明 |
|------|------|
| **体积** | Chromium 约 300MB+，与 function 代码一起打包易超出 Cloud Functions 部署包限制（解压后约 1GB 限制，但上传包也有上限）。 |
| **冷启动** | 首次调用需启动浏览器进程，延迟可达 10–30 秒，影响首请求体验。 |
| **内存** | 默认 256MB 常不足，Chromium 建议至少 512MB–1GB，需在 `firebase.json` 或部署时设置 `memory`。 |
| **超时** | 生成 PDF 可能需 10–60 秒，需保证 function 的 `timeoutSeconds` 足够（当前 apply 已设 300s）。 |

### 推荐应对（生产部署时）

1. **puppeteer-core + Chromium Layer**  
   使用 `puppeteer-core` 不捆绑 Chromium，将 Chromium 放在 [Google Cloud Build Layer](https://github.com/Sparticuz/chromium) 或社区 Layer，减小部署包、复用同一 Layer 多 function。

2. **迁移到 Cloud Run**  
   将「Apply / PDF 导出」单独部署为 Cloud Run 服务：容器内装 Chromium，内存与 CPU 可配、无 1GB 包限制，冷启动可通过 min instances 缓解。

3. **外部 PDF 服务**  
   用第三方 HTML→PDF API（如 DocRaptor、html2pdf.app）或自建小服务，Functions 只调 HTTP，无 Chromium 依赖。

4. **短期可做**  
   - 已在 `applyApi` 的 `onRequest` 中配置 `memory: '1GiB'`、`cpu: 1`（见 [apply.fn.ts](apps/functions/src/functions/apply.fn.ts)）。  
   - 监控下述观测指标，用数据决定是否迁 Cloud Run；必要时先切到 `puppeteer-core` + 单独 Chromium 路径（如 Layer 再迁）。

### 观测指标（用数据判断是否迁 Cloud Run）

在 Cloud Console / Cloud Monitoring 中关注 apply function 的以下指标，避免凭感觉做迁移决策：

| 指标 | 说明 | 参考 |
|------|------|------|
| **P95 延迟** | 单次请求从进入到返回的 P95 耗时（含 LLM + PDF + 上传） | 若 P95 持续 &gt; 60s 或用户不可接受，可考虑 Cloud Run 或异步化 |
| **OOM 次数** | 实例因内存超限被 kill 的次数 | 若 &gt; 0 且复现，优先加 memory 或迁 Cloud Run |
| **PDF 导出失败率** | 以 `errorCode === 'PDF_EXPORT_FAILED'` 或 application 状态 failed 且 errorCode 为该类的请求占比 | 若明显高于其他错误，多为 Chromium 启动/内存/超时问题 |
| **冷启动占比** | 冷启动请求数 / 总请求数（可从请求延迟分布或 Cloud Run/Functions 的「冷启动」相关指标看） | 若占比高且 P95 被冷启动拉高，可考虑 min instances 或迁 Cloud Run 设 min instances |

建议：先跑 1–2 周真实流量，看 P95、OOM、失败率、冷启动占比；再决定是否迁 Cloud Run 或加 Layer。
