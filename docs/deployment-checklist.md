# ApplyQueue — Firebase + Cloudflare 部署清单

## Part 1: Firebase 项目初始化

### 1.1 创建 Firebase 项目
- [ ] 前往 [Firebase Console](https://console.firebase.google.com/)
- [ ] 创建新项目 `applyqueue` (或 `applyqueue-prod`)
- [ ] 启用 Google Analytics（可选，推荐）
- [ ] 选择 Blaze (Pay-as-you-go) 计费方案（Cloud Functions 需要）

### 1.2 启用服务
- [ ] **Authentication**: 启用 Email/Password + Google Sign-In
- [ ] **Firestore**: 创建数据库，选择 `us-central1` 区域
- [ ] **Cloud Storage**: 创建默认 bucket
- [ ] **Cloud Functions**: 自动随 Blaze 计划启用
- [ ] **Hosting**: 启用 Firebase Hosting

### 1.3 本地 CLI 配置
```bash
npm install -g firebase-tools
firebase login
firebase init
# 选择: Firestore, Functions, Hosting, Storage, Emulators
# Functions 语言: TypeScript
# Hosting 目录: apps/web/dist
# 单页应用: Yes
```

### 1.4 环境变量
```bash
# 设置 Cloud Functions 环境变量
firebase functions:secrets:set ENCRYPTION_MASTER_KEY
# 输入一个 256-bit 随机密钥 (32 bytes hex)

# 验证
firebase functions:secrets:access ENCRYPTION_MASTER_KEY
```

### 1.5 Firestore 配置
- [ ] 部署 Security Rules: `firebase deploy --only firestore:rules`
- [ ] 部署 Indexes: `firebase deploy --only firestore:indexes`
- [ ] 验证 Rules 在 Console 中生效

### 1.6 Cloud Storage 配置
- [ ] 部署 Storage Rules: `firebase deploy --only storage`
- [ ] 配置 CORS（允许 applyqueue.com）:

```json
[
  {
    "origin": ["https://applyqueue.com"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gsutil cors set cors.json gs://applyqueue.appspot.com
```

---

## Part 2: Firebase Hosting 部署

### 2.1 构建前端
```bash
cd apps/web
pnpm build
# 输出目录: dist/
```

### 2.2 firebase.json 配置
```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  },
  "functions": [
    {
      "source": "apps/functions",
      "codebase": "default",
      "runtime": "nodejs20",
      "ignore": ["node_modules", ".git"]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true }
  }
}
```

### 2.3 部署
```bash
# 全量部署
firebase deploy

# 分别部署
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only storage
```

### 2.4 验证部署
- [ ] 访问 `https://applyqueue.web.app` 确认 SPA 加载
- [ ] 测试 API 端点 `https://applyqueue.web.app/api/...`
- [ ] 检查 Functions 日志: `firebase functions:log`

---

## Part 3: 自定义域名 (Firebase Hosting)

### 3.1 添加自定义域名
```bash
firebase hosting:channel:deploy live
```

在 Firebase Console → Hosting → Custom domains:
- [ ] 添加 `applyqueue.com`
- [ ] 添加 `www.applyqueue.com`
- [ ] Firebase 会提供需要设置的 DNS 记录（A 记录 + TXT 记录）

### 3.2 Firebase 提供的 DNS 记录（示例）
| 类型 | 名称 | 值 |
|------|------|---|
| A | @ | 151.101.1.195 |
| A | @ | 151.101.65.195 |
| TXT | @ | hosting-site=applyqueue |
| CNAME | www | applyqueue.web.app |

> 实际值以 Firebase Console 显示为准。

---

## Part 4: Cloudflare DNS 配置

### 4.1 Cloudflare 账户设置
- [ ] 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [ ] 添加站点 `applyqueue.com`
- [ ] 选择 Free 计划

### 4.2 域名注册商设置
- [ ] 在域名注册商处将 nameserver 改为 Cloudflare 提供的:
  - `ns1.cloudflare.com` (示例)
  - `ns2.cloudflare.com` (示例)
- [ ] 等待 DNS 传播（最多 24-48 小时，通常几分钟）

### 4.3 DNS 记录配置
在 Cloudflare Dashboard → DNS → Records:

| 类型 | 名称 | 内容 | Proxy | TTL |
|------|------|------|-------|-----|
| A | @ | 151.101.1.195 | **DNS only (灰色云)** | Auto |
| A | @ | 151.101.65.195 | **DNS only (灰色云)** | Auto |
| TXT | @ | hosting-site=applyqueue | - | Auto |
| CNAME | www | applyqueue.web.app | **DNS only (灰色云)** | Auto |

> **重要**: Firebase Hosting 自定义域名需要 DNS-only 模式（灰色云图标），不能开启 Cloudflare Proxy（橙色云）。Firebase 自己管理 SSL 证书，Cloudflare Proxy 会干扰证书验证。

### 4.4 SSL/TLS 设置
- [ ] Cloudflare SSL → 设置为 **Full (strict)**（如果用 DNS-only 则不影响）
- [ ] 如果不 proxy，SSL 由 Firebase 管理，无需额外配置

### 4.5 Cloudflare 其他推荐设置
- [ ] **Always Use HTTPS**: 开启
- [ ] **HSTS**: 开启（如果使用 proxy 模式）
- [ ] **Brotli 压缩**: 开启
- [ ] **Auto Minify**: 关闭（Vite build 已处理）
- [ ] **Security Level**: Medium

### 4.6 验证
- [ ] `dig applyqueue.com` 确认 A 记录正确
- [ ] `dig www.applyqueue.com` 确认 CNAME 正确
- [ ] `curl -I https://applyqueue.com` 确认 HTTPS + 200
- [ ] Firebase Console → Hosting 显示域名 "Connected"
- [ ] SSL 证书由 Firebase 自动签发（Let's Encrypt）

---

## Part 5: CI/CD (GitHub Actions)

### 5.1 GitHub Secrets
在 repo Settings → Secrets 添加:
- [ ] `FIREBASE_TOKEN` — `firebase login:ci` 获取
  - 或使用 `FIREBASE_SERVICE_ACCOUNT` (推荐，更安全)

### 5.2 部署工作流
`.github/workflows/deploy-prod.yml`:
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - run: pnpm turbo test
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
```

---

## Part 6: 上线前检查清单

### 功能
- [ ] 登录/注册正常工作
- [ ] BYOK 密钥保存和验证正常
- [ ] 职位列表加载正常
- [ ] Apply N 流程端到端通过
- [ ] PDF/DOCX 下载正常
- [ ] Tracker 看板状态流转正常

### 安全
- [ ] Firestore Rules 部署并验证
- [ ] Storage Rules 部署并验证
- [ ] ENCRYPTION_MASTER_KEY 已设置为 Secret
- [ ] 无密钥硬编码在代码中
- [ ] CORS 配置正确

### 性能
- [ ] 前端 build 体积 < 500KB (gzipped)
- [ ] Cloud Functions cold start < 3s
- [ ] API 响应时间 < 500ms (非 LLM 调用)

### 监控
- [ ] Firebase Console 可看到 Functions 日志
- [ ] Error Reporting 启用
- [ ] 设置 budget alert (Firebase Billing)

---

## 快速参考命令

```bash
# 本地开发
firebase emulators:start
pnpm dev                    # apps/web dev server

# 部署
firebase deploy             # 全量
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules

# 调试
firebase functions:log
firebase hosting:channel:list

# 域名
firebase hosting:sites:list
```
