import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth, type User } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

/** 初始化失败或未配置时为 null，页面可正常渲染 */
let _auth: Auth | null = null;
if (config.apiKey && config.projectId) {
  try {
    const app = initializeApp(config);
    _auth = getAuth(app);
    // 与 Functions 模拟器同时使用 Auth 模拟器时，需在 .env 设 VITE_USE_AUTH_EMULATOR=true，并重新登录（不要用生产 Token 调带 Auth 模拟器的后端）
    if (import.meta.env.DEV && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true') {
      const host = import.meta.env.VITE_AUTH_EMULATOR_HOST ?? 'http://127.0.0.1:9099';
      connectAuthEmulator(_auth, host, { disableWarnings: true });
    }
  } catch {
    _auth = null;
  }
}

export const auth: Auth | null = _auth;
export const googleProvider = new GoogleAuthProvider();

export async function getIdToken(user: User, forceRefresh = false): Promise<string> {
  return user.getIdToken(forceRefresh);
}
