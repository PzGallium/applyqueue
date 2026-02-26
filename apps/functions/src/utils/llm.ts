/**
 * Minimal LLM client abstraction for BYOK usage.
 * Supports OpenAI and Anthropic via their REST APIs.
 */

export interface LlmResponse {
  text: string;
  tokensUsed: number;
  estimatedCost: number;
}

export interface LlmClient {
  complete(prompt: string, model?: string): Promise<LlmResponse>;
}

class OpenAIClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(prompt: string, model = 'gpt-4o-mini'): Promise<LlmResponse> {
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

    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
    };

    const totalTokens = data.usage?.total_tokens ?? 0;
    const costPer1k = model.includes('mini') ? 0.00015 : 0.005;

    return {
      text: data.choices[0]?.message?.content ?? '',
      tokensUsed: totalTokens,
      estimatedCost: (totalTokens / 1000) * costPer1k,
    };
  }
}

class AnthropicClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(prompt: string, model = 'claude-sonnet-4-20250514'): Promise<LlmResponse> {
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

    const data = await resp.json() as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const totalTokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return {
      text: data.content.find((c) => c.type === 'text')?.text ?? '',
      tokensUsed: totalTokens,
      estimatedCost: (totalTokens / 1000) * 0.003,
    };
  }
}

export function getLlmClient(provider: string, apiKey: string): LlmClient {
  switch (provider) {
    case 'openai':
      return new OpenAIClient(apiKey);
    case 'anthropic':
      return new AnthropicClient(apiKey);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
