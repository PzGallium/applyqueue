import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Firebase Functions 模拟器上的 HTTP 函数地址为：
 *   http://127.0.0.1:5001/<projectId>/us-central1/<exportName>
 * 不能直接把 /api/xxx 打到 5001 根路径（会 404 或连错）。
 */
const EMULATOR_FUNCTIONS = 'http://127.0.0.1:5001';
const REGION = 'us-central1';

export default defineConfig(({ mode }) => {
  const repoRoot = path.join(__dirname, '..', '..');
  const envWeb = loadEnv(mode, __dirname, 'VITE_');
  const envRoot = loadEnv(mode, repoRoot, 'VITE_');
  const projectId =
    envWeb.VITE_FIREBASE_PROJECT_ID ||
    envRoot.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    'applyqueue';

  const toFn = (exportName: string, originalPathWithQuery: string) =>
    `/${projectId}/${REGION}/${exportName}${originalPathWithQuery}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
        // 使用源码 ESM：Rollup 无法从 shared 的 CJS `__exportStar` 静态解析命名导出（如 LLM_PROVIDERS）
        '@applyqueue/shared': path.join(repoRoot, 'packages/shared/src/index.ts'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // 更长路径在前，避免被 /api/keys 吃掉
        '/api/resume/refine': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('resumeRefineApi', p),
        },
        '/api/keys/oauth/callback': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('oauthCallbackApi', p),
        },
        '/api/keys/oauth/authorize': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('oauthAuthorizeApi', p),
        },
        '/api/keys': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq, req) => {
              const url = req.url || '';
              const fn =
                req.method === 'PUT'
                  ? 'keyPutApi'
                  : req.method === 'DELETE'
                    ? 'keyDeleteApi'
                    : 'keyListApi';
              proxyReq.path = toFn(fn, url);
            });
          },
        },
        '/api/identity-pool': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('identityPoolApi', p),
        },
        '/api/preferences': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('preferencesApi', p),
        },
        '/api/projects': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('projectsApi', p),
        },
        '/api/ranked-list': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('rankedListApi', p),
        },
        '/api/job-sources': {
          target: EMULATOR_FUNCTIONS,
          changeOrigin: true,
          rewrite: (p) => toFn('jobSourcesApi', p),
        },
      },
    },
  };
});
