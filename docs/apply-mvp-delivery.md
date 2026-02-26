# Apply N MVP 交付说明

## 一、修改/新增文件列表

### 新增
- `apps/functions/src/services/apply/types.ts` — 流程类型、错误码、ResumeContent Zod schema
- `apps/functions/src/services/apply/resume-generator.ts` — LLM 生成 Resume JSON
- `apps/functions/src/services/apply/pdf-exporter.ts` — HTML 模板 → PDF Buffer
- `apps/functions/src/services/apply/artifact-store.ts` — 上传 Storage + 签名 URL
- `apps/functions/src/puppeteer.d.ts` — Puppeteer 模块类型声明（便于类型检查）

### 修改
- `packages/shared/src/utils/validate.ts` — 新增 `applyMvpRequestSchema`（rankIndex）
- `apps/functions/src/functions/apply.fn.ts` — 重写为 MVP 同步流程（rankIndex、仅 PDF、统一错误码）
- `apps/functions/package.json` — 新增依赖：puppeteer、zod、@types/node

---

## 二、API 契约

### 请求
- **Method**: `POST`
- **Path**: `/api/apply`
- **Headers**: `Authorization: Bearer <Firebase ID Token>`
- **Body**: `{ "rankIndex": number }`（正整数，1-based，对应排名列表中的 rank）

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
| LLM_GENERATION_FAILED | 502 | LLM 调用或输出校验失败 |
| PDF_EXPORT_FAILED | 500 | PDF 导出失败 |
| STORAGE_UPLOAD_FAILED | 500 | 上传或签名 URL 失败 |
| INTERNAL_ERROR | 500 | 未分类异常 |

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
- **Puppeteer**：在 Cloud Functions 上需考虑内存与 Chromium 体积，后续可用 Layer 或 Cloud Run。
- **文件名**：PDF 建议名称为 `{displayName}_{company}_{role}_{YYYYMMDD}.pdf`，displayName 来自 `users/{userId}.displayName`，缺省为 `"Resume"`。
- **签名 URL**：有效期 1 小时（代码中常量化）。
