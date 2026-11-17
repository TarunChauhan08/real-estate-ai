import {
  type LLMProvider,
  type LLMStructuredRequest,
  type LLMStructuredResponse,
} from './llm-provider';

/**
 * Offline, deterministic stand-in for a real model.
 *
 * - Tests use it so they never call a paid API and always get the same answer.
 * - Developers can demo the full flow without an API key.
 *
 * It understands just enough Hinglish (budget in lakh/crore, BHK, a few cities) to show
 * the lead profile filling in. It is not meant to be clever.
 */
export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';

  async generateStructured(request: LLMStructuredRequest): Promise<LLMStructuredResponse> {
    const buyerText = request.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' \n ');
    const last = [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const wantsRent = /\b(rent|kiraye|kiraya)\b/i.test(buyerText);
    const listings = [...request.system.matchAll(/\[id:([0-9a-f-]{36})\]([^\n]*)/g)].map((m) => ({
      id: m[1]!,
      text: m[2]!,
    }));

    const leadUpdates: Record<string, unknown> = {};
    const budget = parseBudget(buyerText);
    if (budget) leadUpdates.budget_max_rupees = budget;
    const bhk = /(\d)\s*bhk/i.exec(buyerText);
    if (bhk) leadUpdates.preferred_bedrooms = [Number(bhk[1])];
    const city =
      /\b(noida|gurugram|gurgaon|delhi|mumbai|pune|bengaluru|bangalore|hyderabad|chennai|kolkata)\b/i.exec(
        buyerText,
      );
    if (city)
      leadUpdates.preferred_city = titleCase(
        city[1]!.replace(/gurgaon/i, 'Gurugram').replace(/bangalore/i, 'Bengaluru'),
      );
    if (/\b(loan|emi)\b/i.test(buyerText)) leadUpdates.needs_home_loan = true;
    if (/invest/i.test(buyerText)) leadUpdates.purpose = 'INVESTMENT';

    const wantsVisit = /site visit|visit|dekhna|dekhne/i.test(last);
    const wantsHuman = /\b(human|agent|manager|call me|discount|negotiat)\b/i.test(last);
    const hinglish = /\b(hai|chahiye|mujhe|kya|nahi|haan|ji|lakh|kitna)\b/i.test(last);
    const known = Object.keys(leadUpdates).length;
    // Like a careful salesperson: only suggest listings that match what the buyer said.
    const suggested =
      budget || bhk
        ? listings
            .filter((l) => (bhk ? l.text.includes(`${bhk[1]} BHK`) : true))
            .filter((l) => l.text.includes('/month rent') === wantsRent)
            .slice(0, 2)
            .map((l) => l.id)
        : [];

    let reply: string;
    if (wantsHuman) {
      reply = hinglish
        ? 'Zaroor, main hamari team ke senior member ko connect kar raha hoon. Woh jaldi aapse baat karenge.'
        : 'Of course — I am connecting you with a senior member of our team. They will reach out shortly.';
    } else if (wantsVisit) {
      reply = hinglish
        ? 'Bilkul! Aapke liye kaunsa din aur time theek rahega? Team confirm karke batayegi.'
        : 'Happy to arrange that. Which day and time suit you? Our team will confirm the slot.';
    } else if (suggested.length > 0) {
      reply = hinglish
        ? `Aapki requirement ke hisaab se ${suggested.length} options hain. Kya aap ready-to-move dekh rahe hain ya under-construction bhi chalega?`
        : `I found ${suggested.length} options that fit. Are you looking for ready-to-move, or is under-construction fine too?`;
    } else {
      reply = hinglish
        ? 'Namaste! Aap kis area mein aur kitne budget mein property dekh rahe hain?'
        : 'Hello! Which area are you looking in, and what budget do you have in mind?';
    }

    return {
      output: {
        reply,
        language: hinglish ? 'hinglish' : 'en',
        lead_updates: leadUpdates,
        temperature: wantsVisit ? 'HOT' : known >= 2 ? 'WARM' : 'UNSCORED',
        qualified: known >= 2,
        suggested_property_ids: suggested,
        site_visit_requested: wantsVisit,
        site_visit_preference: wantsVisit ? visitPreference(last) : undefined,
        handoff_to_human: wantsHuman,
        handoff_reason: wantsHuman ? 'Buyer asked for a person' : undefined,
      },
      model: 'fake-1',
      // A rough ~4-characters-per-token estimate, so the usage page has numbers in demo mode.
      usage: {
        inputTokens: Math.ceil(
          (request.system.length + request.messages.reduce((n, m) => n + m.content.length, 0)) / 4,
        ),
        outputTokens: Math.ceil(reply.length / 4) + 40,
      },
      latencyMs: 0,
    };
  }
}

/** Picks a day/time phrase out of the buyer's message, e.g. "Saturday 11am" or "kal shaam". */
function visitPreference(text: string): string | undefined {
  const match =
    /\b(today|tomorrow|aaj|kal|parso|this weekend|weekend|(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b(?:[^.?!,]{0,20}?\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje))\b|\s+(morning|evening|afternoon|subah|shaam))?/i.exec(
      text,
    );
  return match ? match[0].trim().slice(0, 120) : undefined;
}

function parseBudget(text: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|lakhs)\b/i.exec(text);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  return Math.round(amount * (unit.startsWith('c') ? 10_000_000 : 100_000));
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
