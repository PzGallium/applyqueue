import type { ConnectionMode } from '../types/user';

// ---------------------------------------------------------------------------
// Provider registry — OAuth-first, BYOK-ready
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  name: string;
  supportedModes: ConnectionMode[];
  primaryMode: ConnectionMode;
  keyPattern?: RegExp;
  keyPrefix?: string;
  defaultModel: string;
  models: string[];
  docsUrl: string;
  oauthScopes?: string[];
}

export const LLM_PROVIDERS: Record<string, ProviderConfig> = {
  gemini: {
    name: 'Google Gemini',
    supportedModes: ['oauth', 'api_key'],
    primaryMode: 'oauth',
    keyPattern: /^AIza[a-zA-Z0-9_-]{30,}$/,
    keyPrefix: 'AIza',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    oauthScopes: [
      'https://www.googleapis.com/auth/generative-language',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  openai: {
    name: 'OpenAI',
    supportedModes: ['api_key'],
    primaryMode: 'api_key',
    keyPattern: /^sk-(proj-)?[a-zA-Z0-9_-]{20,}$/,
    keyPrefix: 'sk-',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    supportedModes: ['api_key'],
    primaryMode: 'api_key',
    keyPattern: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
    keyPrefix: 'sk-ant-',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
};

export const SEARCH_PROVIDERS = {
  brave: {
    name: 'Brave Search',
    supportedModes: ['api_key'] as ConnectionMode[],
    primaryMode: 'api_key' as ConnectionMode,
    keyPattern: /^BSA[a-zA-Z0-9_-]{20,}$/,
    keyPrefix: 'BSA',
    docsUrl: 'https://brave.com/search/api/',
  },
} as const;

export type LLMProvider = keyof typeof LLM_PROVIDERS;
export type SearchProvider = keyof typeof SEARCH_PROVIDERS;

export const DEFAULT_LLM_PROVIDER: LLMProvider = 'gemini';
export const DEFAULT_SEARCH_PROVIDER: SearchProvider = 'brave';

/** Providers that support OAuth connection. */
export const OAUTH_PROVIDERS = Object.entries(LLM_PROVIDERS)
  .filter(([, c]) => c.supportedModes.includes('oauth'))
  .map(([k]) => k);

export const ALL_PROVIDERS = { ...LLM_PROVIDERS, ...SEARCH_PROVIDERS };

export const RATE_LIMITS = {
  resumeGen: { perMinute: 10, perDay: 100 },
  jdParse: { perMinute: 20 },
  export: { perMinute: 30 },
  keyValidate: { perMinute: 5 },
} as const;
