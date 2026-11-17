/**
 * Provider-neutral contract for large language models.
 *
 * The rest of the app only ever talks to `LLMProvider`. Swapping Claude for another vendor,
 * or for a self-hosted model in an on-prem install, means writing one new class — nothing else changes.
 *
 * We only need one capability right now: "given a conversation, call this tool with
 * structured arguments". Structured output is what lets us both reply to the buyer
 * AND update the lead profile in one round-trip.
 */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  inputSchema: Record<string, unknown>;
}

export interface LLMStructuredRequest {
  system: string;
  messages: LLMMessage[];
  /** The model is forced to answer by calling this tool. */
  tool: LLMTool;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMStructuredResponse {
  /** Raw tool arguments. Callers must validate them — never trust model output. */
  output: unknown;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  generateStructured(request: LLMStructuredRequest): Promise<LLMStructuredResponse>;
}

/** Thrown for any provider failure (network, timeout, rate limit, bad response). */
export class LLMError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Anthropic-style APIs require strictly alternating roles starting with `user`.
 * Merges consecutive same-role messages and drops leading assistant turns.
 */
export function normaliseMessages(messages: LLMMessage[]): LLMMessage[] {
  const out: LLMMessage[] = [];
  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === message.role) last.content = `${last.content}\n\n${content}`;
    else out.push({ role: message.role, content });
  }
  while (out[0]?.role === 'assistant') out.shift();
  return out;
}
