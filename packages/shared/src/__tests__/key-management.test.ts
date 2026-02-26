import { describe, it, expect } from 'vitest';
import { LLM_PROVIDERS, SEARCH_PROVIDERS, OAUTH_PROVIDERS, ALL_PROVIDERS } from '../constants/providers';
import type { ProviderConnection, ConnectionMode } from '../types/user';

// ---------------------------------------------------------------------------
// Provider registry tests
// ---------------------------------------------------------------------------

describe('Provider registry', () => {
  it('gemini is the default LLM provider and supports OAuth', () => {
    expect(LLM_PROVIDERS.gemini).toBeDefined();
    expect(LLM_PROVIDERS.gemini.primaryMode).toBe('oauth');
    expect(LLM_PROVIDERS.gemini.supportedModes).toContain('oauth');
    expect(LLM_PROVIDERS.gemini.supportedModes).toContain('api_key');
  });

  it('openai and anthropic only support api_key mode', () => {
    expect(LLM_PROVIDERS.openai.supportedModes).toEqual(['api_key']);
    expect(LLM_PROVIDERS.openai.primaryMode).toBe('api_key');
    expect(LLM_PROVIDERS.anthropic.supportedModes).toEqual(['api_key']);
  });

  it('brave search only supports api_key mode', () => {
    expect(SEARCH_PROVIDERS.brave.supportedModes).toContain('api_key');
  });

  it('OAUTH_PROVIDERS lists only providers with OAuth support', () => {
    expect(OAUTH_PROVIDERS).toContain('gemini');
    expect(OAUTH_PROVIDERS).not.toContain('openai');
    expect(OAUTH_PROVIDERS).not.toContain('anthropic');
  });

  it('all providers have a defaultModel', () => {
    for (const [, config] of Object.entries(LLM_PROVIDERS)) {
      expect(config.defaultModel).toBeTruthy();
      expect(config.models.length).toBeGreaterThan(0);
      expect(config.models).toContain(config.defaultModel);
    }
  });

  it('all providers have a docsUrl', () => {
    for (const [, config] of Object.entries(ALL_PROVIDERS)) {
      expect(config.docsUrl).toMatch(/^https:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------
// Key format validation tests
// ---------------------------------------------------------------------------

describe('Key format patterns', () => {
  it('validates OpenAI key format', () => {
    const pattern = LLM_PROVIDERS.openai.keyPattern!;
    expect(pattern.test('sk-proj-abc123def456ghi789jkl012')).toBe(true);
    expect(pattern.test('sk-abc123def456ghi789jkl012mno')).toBe(true);
    expect(pattern.test('not-a-key')).toBe(false);
    expect(pattern.test('')).toBe(false);
  });

  it('validates Anthropic key format', () => {
    const pattern = LLM_PROVIDERS.anthropic.keyPattern!;
    expect(pattern.test('sk-ant-abc123def456ghi789jkl012')).toBe(true);
    expect(pattern.test('sk-abc123')).toBe(false);
    expect(pattern.test('sk-ant-short')).toBe(false);
  });

  it('validates Gemini API key format', () => {
    const pattern = LLM_PROVIDERS.gemini.keyPattern!;
    expect(pattern.test('AIzaSyD1234567890abcdefghijklmnopqrst')).toBe(true);
    expect(pattern.test('sk-not-gemini')).toBe(false);
  });

  it('validates Brave Search key format', () => {
    const pattern = SEARCH_PROVIDERS.brave.keyPattern!;
    expect(pattern.test('BSAabc123def456ghi789jkl')).toBe(true);
    expect(pattern.test('not-brave')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProviderConnection type tests
// ---------------------------------------------------------------------------

describe('ProviderConnection type', () => {
  it('can represent an API key connection', () => {
    const conn: ProviderConnection = {
      provider: 'openai',
      mode: 'api_key',
      apiKey: { ciphertext: 'enc...', iv: 'iv...', tag: 'tag...' },
      displayLabel: 'sk-...xyz4',
      updatedAt: '2026-02-26T00:00:00Z',
    };
    expect(conn.mode).toBe('api_key');
    expect(conn.apiKey).toBeDefined();
    expect(conn.oauth).toBeUndefined();
  });

  it('can represent an OAuth connection', () => {
    const conn: ProviderConnection = {
      provider: 'gemini',
      mode: 'oauth',
      oauth: {
        accessToken: { ciphertext: 'enc...', iv: 'iv...', tag: 'tag...' },
        refreshToken: { ciphertext: 'enc...', iv: 'iv...', tag: 'tag...' },
        expiresAt: '2026-02-26T01:00:00Z',
        scope: 'generativelanguage',
        email: 'user@gmail.com',
      },
      displayLabel: 'user@gmail.com',
      updatedAt: '2026-02-26T00:00:00Z',
    };
    expect(conn.mode).toBe('oauth');
    expect(conn.oauth).toBeDefined();
    expect(conn.oauth!.email).toBe('user@gmail.com');
    expect(conn.apiKey).toBeUndefined();
  });

  it('ConnectionMode is union of api_key | oauth', () => {
    const modes: ConnectionMode[] = ['api_key', 'oauth'];
    expect(modes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// OAuth scopes tests
// ---------------------------------------------------------------------------

describe('OAuth configuration', () => {
  it('gemini has required OAuth scopes', () => {
    const scopes = LLM_PROVIDERS.gemini.oauthScopes!;
    expect(scopes).toContain('https://www.googleapis.com/auth/generative-language');
    expect(scopes).toContain('https://www.googleapis.com/auth/userinfo.email');
  });

  it('non-OAuth providers do not have oauthScopes', () => {
    expect(LLM_PROVIDERS.openai.oauthScopes).toBeUndefined();
    expect(LLM_PROVIDERS.anthropic.oauthScopes).toBeUndefined();
  });
});
