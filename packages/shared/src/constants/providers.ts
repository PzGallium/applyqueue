export const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    keyPrefix: 'sk-',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    keyPrefix: 'sk-ant-',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
} as const;

export const SEARCH_PROVIDERS = {
  brave: {
    name: 'Brave Search',
    keyPrefix: 'BSA',
    docsUrl: 'https://brave.com/search/api/',
  },
} as const;

export type LLMProvider = keyof typeof LLM_PROVIDERS;
export type SearchProvider = keyof typeof SEARCH_PROVIDERS;

export const DEFAULT_LLM_PROVIDER: LLMProvider = 'openai';
export const DEFAULT_SEARCH_PROVIDER: SearchProvider = 'brave';

export const RATE_LIMITS = {
  resumeGen: { perMinute: 10, perDay: 100 },
  jdParse: { perMinute: 20 },
  export: { perMinute: 30 },
  keyValidate: { perMinute: 5 },
} as const;
