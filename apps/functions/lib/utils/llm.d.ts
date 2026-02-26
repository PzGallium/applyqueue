/**
 * LLM client abstraction — OAuth-first, BYOK-ready.
 * Supports Gemini (OAuth/API Key), OpenAI, and Anthropic.
 */
export interface LlmResponse {
    text: string;
    tokensUsed: number;
    estimatedCost: number;
}
export interface LlmClient {
    complete(prompt: string, model?: string): Promise<LlmResponse>;
}
/**
 * Create an LLM client for a given provider.
 * `credential` is either an API key or an OAuth access token.
 * `mode` distinguishes how Gemini authenticates (OAuth token vs API key).
 */
export declare function getLlmClient(provider: string, credential: string, mode?: 'oauth' | 'api_key'): LlmClient;
