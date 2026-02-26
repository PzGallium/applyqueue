# ApplyQueue — BYOK 安全清单

## 1. 密钥存储安全

### 1.1 加密方案
- [ ] **算法**: AES-256-GCM（认证加密，防篡改）
- [ ] **加密主密钥**: 256-bit 随机密钥，存于 Firebase Secrets Manager
- [ ] **每个用户密钥独立 IV**: 每次加密生成随机 96-bit IV
- [ ] **认证标签 (Auth Tag)**: 128-bit，存储在密钥记录中
- [ ] **永不存储明文密钥**: Firestore 中只有 `encryptedKey` + `iv` + `tag`

### 1.2 加密流程
```
User Input (plaintext key)
    │
    ▼
HTTPS (TLS 1.3) → Cloud Function
    │
    ▼
crypto.randomBytes(12) → iv
    │
    ▼
AES-256-GCM encrypt(masterKey, iv, plaintext) → { ciphertext, authTag }
    │
    ▼
Firestore: user_keys/{userId} = { encryptedKey, iv, tag }
    │
    ▼
plaintext 从内存中清除（不缓存、不日志）
```

### 1.3 解密流程
```
Cloud Function 需要调用外部 API
    │
    ▼
读取 Firestore: user_keys/{userId}
    │
    ▼
AES-256-GCM decrypt(masterKey, iv, ciphertext, authTag) → plaintext
    │
    ▼
使用 plaintext key 调用外部 API
    │
    ▼
API 调用完成后，plaintext 不再引用（GC 回收）
    │
    ▼
响应中不包含任何 key 信息
```

### 1.4 密钥管理检查
- [ ] 加密主密钥通过 `firebase functions:secrets:set` 管理
- [ ] 加密主密钥不出现在代码、日志、环境变量文件中
- [ ] `.env.example` 只有占位符，不含真实密钥
- [ ] `.gitignore` 包含 `.env`, `.env.local`, `*.key`
- [ ] 密钥轮换方案文档化（重新加密所有用户密钥的脚本）

---

## 2. 数据访问控制

### 2.1 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 用户数据：仅本人可读写
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 用户密钥：客户端完全不可访问（仅 Admin SDK 服务端）
    match /user_keys/{userId} {
      allow read, write: if false;
    }

    // 职位数据：已认证用户可读，不可写（仅服务端写入）
    match /jobs/{jobId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // 职位来源：不可客户端访问
    match /job_sources/{sourceId} {
      allow read, write: if false;
    }

    // 排名列表：仅本人可读，不可客户端写
    match /ranked_lists/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // 申请记录：仅本人可读写
    match /applications/{appId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // 简历：仅本人可读，不可客户端写
    match /resumes/{resumeId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    // 导出记录：仅本人可读
    match /exports/{exportId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    // 事件日志：仅本人可读
    match /events/{eventId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

### 2.2 Cloud Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 导出文件：仅文件所属用户可读
    match /exports/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // 仅服务端写入
    }

    // 模板：所有已认证用户可读
    match /templates/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 3. API 安全

### 3.1 认证
- [ ] 所有 API 端点要求 Firebase ID Token（`Authorization: Bearer <token>`）
- [ ] Cloud Function 使用 `firebase-admin` 验证 token
- [ ] Token 验证失败返回 401，不泄露详细错误信息
- [ ] Token 过期自动刷新（前端 Firebase SDK 处理）

### 3.2 Rate Limiting
- [ ] 用户级别限制：
  - Resume 生成：10 次/分钟，100 次/天
  - JD 解析：20 次/分钟
  - 导出：30 次/分钟
  - API Key 验证：5 次/分钟
- [ ] Rate limit 使用 Firestore 计数器实现（或 Cloud Tasks）
- [ ] 超限返回 429 + `Retry-After` header

### 3.3 输入验证
- [ ] 所有 API 输入使用 Zod schema 验证
- [ ] 字符串长度限制（防止超大 payload）
- [ ] API Key 格式预校验（正则匹配 provider 格式）
- [ ] URL 参数白名单验证

### 3.4 输出安全
- [ ] API 响应永不包含加密密钥或明文密钥
- [ ] 错误响应不泄露内部堆栈或系统信息
- [ ] 日志中脱敏处理（mask API key 前后缀）

---

## 4. 传输安全

- [ ] **HTTPS Only**: Firebase Hosting 默认强制 HTTPS
- [ ] **TLS 1.2+**: Firebase/Google 基础设施保证
- [ ] **HSTS Header**: Firebase Hosting 自动设置
- [ ] **CORS 白名单**: 仅允许 `applyqueue.com` 域名
- [ ] **Content-Security-Policy**: 限制外部资源加载

### CSP 推荐配置
```
default-src 'self';
script-src 'self' https://apis.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' https: data:;
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
font-src 'self' https://fonts.gstatic.com;
frame-src https://accounts.google.com;
```

---

## 5. BYOK 特定安全考虑

### 5.1 密钥生命周期
| 阶段 | 安全措施 |
|------|---------|
| 输入 | HTTPS 传输，前端不持久化，仅提交到服务端 |
| 验证 | 在服务端用密钥做一次最低消耗 API 调用测试 |
| 存储 | AES-256-GCM 加密后存入 Firestore |
| 使用 | 运行时解密，调用完立即释放引用 |
| 更新 | 新密钥覆盖加密，旧密文被覆盖 |
| 删除 | 删除 Firestore 文档，密文不可恢复 |
| 泄露 | 用户自行在 provider 处 revoke，平台提供操作指引 |

### 5.2 前端安全
- [ ] API Key 输入框使用 `type="password"`
- [ ] API Key 不存储在 localStorage/sessionStorage
- [ ] API Key 不出现在 URL 参数中
- [ ] 提交后前端立即清空输入框
- [ ] 展示配置状态时只显示 `sk-...xxxx`（掩码）

### 5.3 服务端安全
- [ ] 日志中不打印 API Key（即使是 debug 日志）
- [ ] 错误堆栈中不包含 API Key 值
- [ ] Cloud Function 内存中不长期持有解密后的密钥
- [ ] 不将用户密钥传递给第三方（除用户指定的 provider）

### 5.4 密钥泄露应急
- [ ] 文档化应急流程：
  1. 用户发现泄露 → 在 provider 处 revoke key
  2. 在 ApplyQueue Settings 中删除旧 key
  3. 生成新 key 并重新配置
- [ ] 平台不承担用户密钥被滥用的责任（ToS 中声明）
- [ ] 提供「一键删除所有密钥」功能

---

## 6. 依赖安全

- [ ] `pnpm audit` 定期运行（CI 中集成）
- [ ] Dependabot / Renovate 自动更新依赖
- [ ] 锁定 `pnpm-lock.yaml` 确保可复现构建
- [ ] 不使用已知有安全漏洞的 npm 包

---

## 7. 自托管安全注意事项

### 对自托管用户的指引
- [ ] **ENCRYPTION_MASTER_KEY**: 用户必须自行生成强随机密钥
  ```bash
  openssl rand -hex 32
  ```
- [ ] **Docker 网络隔离**: API 容器不直接暴露到公网，通过 nginx 反代
- [ ] **HTTPS**: 自托管用户需自行配置 SSL（Let's Encrypt / Caddy）
- [ ] **备份**: Firestore Emulator 数据需用户自行备份
- [ ] **更新**: 提供清晰的版本升级路径

---

## 8. 审计和合规

- [ ] 记录所有密钥操作事件（创建/更新/删除/使用）
- [ ] 记录所有外部 API 调用（provider, model, tokens, success/fail）
- [ ] 不收集用户简历内容到平台侧分析
- [ ] 简历内容仅在生成时通过用户的 LLM key 处理
- [ ] 隐私政策文档化（数据收集/存储/处理范围）

---

## 安全实施优先级

| 优先级 | 项目 | 天数 |
|--------|------|------|
| P0 | AES-256-GCM 加密 + Firestore Rules | Day 3 |
| P0 | Firebase Auth token 验证 | Day 2 |
| P0 | HTTPS + CORS | Day 1 (默认) |
| P1 | Rate limiting | Day 12 |
| P1 | 输入验证 (Zod) | Day 2-3 |
| P1 | 日志脱敏 | Day 3 |
| P2 | CSP headers | Day 13 |
| P2 | pnpm audit in CI | Day 13 |
| P2 | 自托管安全文档 | Day 14 |
