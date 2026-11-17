import { Logger } from '@nestjs/common';
import {
  LLMError,
  type LLMProvider,
  type LLMStructuredRequest,
  type LLMStructuredResponse,
  normaliseMessages,
} from './llm-provider';

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

interface AnthropicResponse {
  model: string;
  content: Array<{ type: string; name?: string; input?: unknown; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

/**
 * Claude via the Messages API, using plain `fetch` (no SDK dependency to keep in sync).
 * Retries once on rate limits, overload and server errors.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly options: AnthropicOptions) {}

  async generateStructured(request: LLMStructuredRequest): Promise<LLMStructuredResponse> {
    const messages = normaliseMessages(request.messages);
    if (messages.length === 0) throw new LLMError('No user message to respond to', false);

    const body = JSON.stringify({
      model: this.options.model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.4,
      system: request.system,
      messages,
      tools: [
        {
          name: request.tool.name,
          description: request.tool.description,
          input_schema: request.tool.inputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: request.tool.name },
    });

    const started = Date.now();
    for (let attempt = 1; ; attempt += 1) {
      try {
        const data = await this.call(body);
        const toolUse = data.content.find(
          (block) => block.type === 'tool_use' && block.name === request.tool.name,
        );
        if (!toolUse) throw new LLMError('Model did not call the response tool', true);
        return {
          output: toolUse.input,
          model: data.model,
          usage: {
            inputTokens: data.usage?.input_tokens ?? 0,
            outputTokens: data.usage?.output_tokens ?? 0,
          },
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        const llmError =
          error instanceof LLMError ? error : new LLMError((error as Error).message, true);
        if (!llmError.retryable || attempt >= 2) throw llmError;
        this.logger.warn(`Anthropic call failed (${llmError.message}); retrying once`);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  private async call(body: string): Promise<AnthropicResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.options.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.options.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      const timedOut = (error as Error).name === 'TimeoutError';
      throw new LLMError(timedOut ? 'AI provider timed out' : 'AI provider unreachable', true);
    }
    if (!res.ok) {
      // Never log the response body verbatim: it can echo prompt content (buyer personal data).
      throw new LLMError(
        `AI provider returned ${res.status}`,
        RETRYABLE_STATUS.has(res.status),
        res.status,
      );
    }
    return (await res.json()) as AnthropicResponse;
  }
}
