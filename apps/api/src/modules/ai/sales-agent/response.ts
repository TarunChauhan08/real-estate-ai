import { MAX_PRICE_RUPEES } from '@rea/shared-types';
import { z } from 'zod';
import { type LLMTool } from '../llm/llm-provider';

/**
 * The single tool the model must call on every turn. One call gives us both the
 * message for the buyer and structured facts to save on the lead.
 */
export const RESPOND_TOOL: LLMTool = {
  name: 'respond',
  description:
    'Send your reply to the buyer and record anything new you learned about what they want.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'reply',
      'language',
      'lead_updates',
      'temperature',
      'qualified',
      'suggested_property_ids',
      'site_visit_requested',
      'handoff_to_human',
    ],
    properties: {
      reply: {
        type: 'string',
        description:
          'The chat message to send. Plain text, 1-3 short sentences, at most one question.',
      },
      language: { type: 'string', enum: ['en', 'hi', 'hinglish'] },
      lead_updates: {
        type: 'object',
        additionalProperties: false,
        description: 'Only facts the buyer stated in this conversation. Omit anything unknown.',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          budget_min_rupees: { type: 'integer', description: 'Whole rupees. 80 lakh = 8000000' },
          budget_max_rupees: { type: 'integer', description: 'Whole rupees. 1.2 crore = 12000000' },
          preferred_city: { type: 'string' },
          preferred_localities: { type: 'array', items: { type: 'string' } },
          preferred_bedrooms: { type: 'array', items: { type: 'integer' } },
          purpose: { type: 'string', enum: ['SELF_USE', 'INVESTMENT'] },
          timeline: {
            type: 'string',
            enum: [
              'IMMEDIATE',
              'ONE_TO_THREE_MONTHS',
              'THREE_TO_SIX_MONTHS',
              'SIX_PLUS_MONTHS',
              'JUST_BROWSING',
            ],
          },
          needs_home_loan: { type: 'boolean' },
        },
      },
      temperature: {
        type: 'string',
        enum: ['UNSCORED', 'COLD', 'WARM', 'HOT'],
        description:
          'HOT = clear budget + location + wants to visit or buy soon. COLD = just browsing.',
      },
      qualified: {
        type: 'boolean',
        description: 'True once location, budget and property size are all known.',
      },
      suggested_property_ids: {
        type: 'array',
        items: { type: 'string' },
        description:
          'IDs from the INVENTORY list that you mentioned in this reply. Never invent IDs.',
      },
      site_visit_requested: { type: 'boolean' },
      handoff_to_human: { type: 'boolean' },
      handoff_reason: { type: 'string' },
    },
  },
};

const text = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1).max(max));
const rupees = z.number().int().min(0).max(MAX_PRICE_RUPEES);

const rawSchema = z.object({
  reply: text(1500),
  language: z.enum(['en', 'hi', 'hinglish']).catch('en'),
  lead_updates: z
    .object({
      name: text(120).optional().catch(undefined),
      email: z.string().trim().email().max(254).optional().catch(undefined),
      budget_min_rupees: rupees.optional().catch(undefined),
      budget_max_rupees: rupees.optional().catch(undefined),
      preferred_city: text(100).optional().catch(undefined),
      preferred_localities: z.array(text(100)).max(20).optional().catch(undefined),
      preferred_bedrooms: z
        .array(z.number().int().min(0).max(20))
        .max(10)
        .optional()
        .catch(undefined),
      purpose: z.enum(['SELF_USE', 'INVESTMENT']).optional().catch(undefined),
      timeline: z
        .enum([
          'IMMEDIATE',
          'ONE_TO_THREE_MONTHS',
          'THREE_TO_SIX_MONTHS',
          'SIX_PLUS_MONTHS',
          'JUST_BROWSING',
        ])
        .optional()
        .catch(undefined),
      needs_home_loan: z.boolean().optional().catch(undefined),
    })
    .catch({}),
  temperature: z.enum(['UNSCORED', 'COLD', 'WARM', 'HOT']).catch('UNSCORED'),
  qualified: z.boolean().catch(false),
  suggested_property_ids: z.array(z.string()).catch([]),
  site_visit_requested: z.boolean().catch(false),
  handoff_to_human: z.boolean().catch(false),
  handoff_reason: z.string().trim().max(300).optional().catch(undefined),
});

export interface LeadUpdates {
  name?: string;
  email?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredCity?: string;
  preferredLocalities?: string[];
  preferredBedrooms?: number[];
  purpose?: 'SELF_USE' | 'INVESTMENT';
  timeline?:
    | 'IMMEDIATE'
    | 'ONE_TO_THREE_MONTHS'
    | 'THREE_TO_SIX_MONTHS'
    | 'SIX_PLUS_MONTHS'
    | 'JUST_BROWSING';
  needsHomeLoan?: boolean;
}

export interface AgentDecision {
  reply: string;
  language: 'en' | 'hi' | 'hinglish';
  leadUpdates: LeadUpdates;
  temperature: 'UNSCORED' | 'COLD' | 'WARM' | 'HOT';
  qualified: boolean;
  suggestedPropertyIds: string[];
  siteVisitRequested: boolean;
  handoff: { requested: boolean; reason: string | null };
}

/**
 * Validates and cleans model output. Never trust the model:
 * - the reply must exist (otherwise the whole turn fails),
 * - every other field degrades to "unknown" instead of failing,
 * - suggested property IDs are limited to the ones we actually showed it,
 * - an inverted budget is swapped so the database CHECK can never fail.
 */
export function parseAgentDecision(
  raw: unknown,
  allowedPropertyIds: string[],
): AgentDecision | null {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  const u = r.lead_updates;
  let budgetMin = u.budget_min_rupees;
  let budgetMax = u.budget_max_rupees;
  if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
    [budgetMin, budgetMax] = [budgetMax, budgetMin];
  }
  const allowed = new Set(allowedPropertyIds);
  const leadUpdates: LeadUpdates = {
    name: u.name,
    email: u.email?.toLowerCase(),
    budgetMin,
    budgetMax,
    preferredCity: u.preferred_city,
    preferredLocalities: u.preferred_localities,
    preferredBedrooms: u.preferred_bedrooms ? [...new Set(u.preferred_bedrooms)].sort() : undefined,
    purpose: u.purpose,
    timeline: u.timeline,
    needsHomeLoan: u.needs_home_loan,
  };
  for (const key of Object.keys(leadUpdates) as Array<keyof LeadUpdates>) {
    if (leadUpdates[key] === undefined) delete leadUpdates[key];
  }
  return {
    reply: r.reply,
    language: r.language,
    leadUpdates,
    temperature: r.temperature,
    qualified: r.qualified,
    suggestedPropertyIds: [...new Set(r.suggested_property_ids.filter((id) => allowed.has(id)))],
    siteVisitRequested: r.site_visit_requested,
    handoff: {
      requested: r.handoff_to_human,
      reason: r.handoff_to_human ? (r.handoff_reason ?? null) : null,
    },
  };
}
