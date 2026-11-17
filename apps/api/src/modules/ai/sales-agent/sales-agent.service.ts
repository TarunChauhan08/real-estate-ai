import { Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER, LLMError, type LLMMessage, type LLMProvider } from '../llm/llm-provider';
import {
  buildSystemPrompt,
  PROMPT_VERSION,
  type PromptBusiness,
  type PromptLead,
  type PromptProperty,
} from './prompt';
import { type AgentDecision, parseAgentDecision, RESPOND_TOOL } from './response';

export interface SalesAgentInput {
  business: PromptBusiness;
  lead: PromptLead;
  properties: PromptProperty[];
  /** Conversation so far, oldest first, ending with the buyer's latest message. */
  history: LLMMessage[];
}

export interface SalesAgentResult extends AgentDecision {
  provider: string;
  model: string;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

/**
 * The "brain" of the AI employee for one turn. It is pure orchestration:
 * build the prompt → ask the model → validate the answer.
 * It does not touch the database; ConversationsService decides what to save.
 */
@Injectable()
export class SalesAgentService {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LLMProvider) {}

  async respond(input: SalesAgentInput): Promise<SalesAgentResult> {
    const response = await this.llm.generateStructured({
      system: buildSystemPrompt(input.business, input.lead, input.properties),
      messages: input.history,
      tool: RESPOND_TOOL,
      maxTokens: 800,
      temperature: 0.4,
    });
    const decision = parseAgentDecision(
      response.output,
      input.properties.map((p) => p.id),
    );
    if (!decision) throw new LLMError('AI returned an unusable answer', false);
    return {
      ...decision,
      provider: this.llm.name,
      model: response.model,
      promptVersion: PROMPT_VERSION,
      usage: response.usage,
      latencyMs: response.latencyMs,
    };
  }
}
