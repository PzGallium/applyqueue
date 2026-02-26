"use strict";
/**
 * LLM client abstraction — OAuth-first, BYOK-ready.
 * Supports Gemini (OAuth/API Key), OpenAI, and Anthropic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLlmClient = getLlmClient;
// ---------------------------------------------------------------------------
// Google Gemini — primary OAuth provider
// ---------------------------------------------------------------------------
class GeminiClient {
    credential;
    mode;
    constructor(credential, mode = 'oauth') {
        this.credential = credential;
        this.mode = mode;
    }
    async complete(prompt, model = 'gemini-2.0-flash') {
        const url = this.mode === 'api_key'
            ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.credential}`
            : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.mode === 'oauth') {
            headers['Authorization'] = `Bearer ${this.credential}`;
        }
        const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 },
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Gemini API error ${resp.status}: ${body}`);
        }
        const data = await resp.json();
        const totalTokens = data.usageMetadata?.totalTokenCount ?? 0;
        const costPer1k = model.includes('pro') ? 0.00125 : 0.0001;
        return {
            text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
            tokensUsed: totalTokens,
            estimatedCost: (totalTokens / 1000) * costPer1k,
        };
    }
}
// ---------------------------------------------------------------------------
// OpenAI — BYOK API Key
// ---------------------------------------------------------------------------
class OpenAIClient {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async complete(prompt, model = 'gpt-4o-mini') {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`OpenAI API error ${resp.status}: ${body}`);
        }
        const data = await resp.json();
        const totalTokens = data.usage?.total_tokens ?? 0;
        const costPer1k = model.includes('mini') ? 0.00015 : 0.005;
        return {
            text: data.choices[0]?.message?.content ?? '',
            tokensUsed: totalTokens,
            estimatedCost: (totalTokens / 1000) * costPer1k,
        };
    }
}
// ---------------------------------------------------------------------------
// Anthropic — BYOK API Key
// ---------------------------------------------------------------------------
class AnthropicClient {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async complete(prompt, model = 'claude-sonnet-4-20250514') {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Anthropic API error ${resp.status}: ${body}`);
        }
        const data = await resp.json();
        const totalTokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
        return {
            text: data.content.find((c) => c.type === 'text')?.text ?? '',
            tokensUsed: totalTokens,
            estimatedCost: (totalTokens / 1000) * 0.003,
        };
    }
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Create an LLM client for a given provider.
 * `credential` is either an API key or an OAuth access token.
 * `mode` distinguishes how Gemini authenticates (OAuth token vs API key).
 */
function getLlmClient(provider, credential, mode = 'api_key') {
    switch (provider) {
        case 'gemini':
            return new GeminiClient(credential, mode);
        case 'openai':
            return new OpenAIClient(credential);
        case 'anthropic':
            return new AnthropicClient(credential);
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}
//# sourceMappingURL=llm.js.map