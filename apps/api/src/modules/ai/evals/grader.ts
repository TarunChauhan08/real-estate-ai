import { type AgentDecision } from '../sales-agent/response';
import { type EvalExpectations } from './scenarios';

export interface EvalCheck {
  name: string;
  passed: boolean;
  /** What actually happened, when it failed. */
  detail?: string;
}

const inRange = (v: number | undefined, [min, max]: [number, number]) =>
  v !== undefined && v >= min && v <= max;
const show = (v: unknown) => (v === undefined ? 'nothing' : JSON.stringify(v));

/**
 * Grades one AI turn. Every expectation becomes a named check, plus rules that apply to every
 * reply (style limits from the prompt and the "never promise" rules).
 */
export function gradeDecision(decision: AgentDecision, expect: EvalExpectations): EvalCheck[] {
  const checks: EvalCheck[] = [];
  const check = (name: string, passed: boolean, detail?: string) =>
    checks.push(passed ? { name, passed } : { name, passed, detail });
  const lead = decision.leadUpdates;
  const suggested = decision.suggestedPropertyIds;
  const reply = decision.reply;

  if (expect.language)
    check(
      'language',
      expect.language.includes(decision.language),
      `answered in ${decision.language}`,
    );

  const e = expect.lead ?? {};
  if (e.budgetMin)
    check('lead.budgetMin', inRange(lead.budgetMin, e.budgetMin), show(lead.budgetMin));
  if (e.budgetMax)
    check('lead.budgetMax', inRange(lead.budgetMax, e.budgetMax), show(lead.budgetMax));
  if (e.preferredCity)
    check(
      'lead.preferredCity',
      e.preferredCity.test(lead.preferredCity ?? ''),
      show(lead.preferredCity),
    );
  if (e.preferredBedrooms)
    check(
      'lead.preferredBedrooms',
      JSON.stringify(lead.preferredBedrooms ?? []) === JSON.stringify(e.preferredBedrooms),
      show(lead.preferredBedrooms),
    );
  if (e.purpose) check('lead.purpose', lead.purpose === e.purpose, show(lead.purpose));
  if (e.timeline)
    check(
      'lead.timeline',
      !!lead.timeline && e.timeline.includes(lead.timeline),
      show(lead.timeline),
    );
  if (e.needsHomeLoan !== undefined)
    check('lead.needsHomeLoan', lead.needsHomeLoan === e.needsHomeLoan, show(lead.needsHomeLoan));

  if (expect.suggestAnyOf)
    check(
      'suggests a fitting listing',
      expect.suggestAnyOf.some((id) => suggested.includes(id)),
      `suggested ${show(suggested)}`,
    );
  if (expect.suggestNoneOf) {
    const wrong = suggested.filter((id) => expect.suggestNoneOf!.includes(id));
    check('suggests nothing unsuitable', wrong.length === 0, `also suggested ${show(wrong)}`);
  }
  if (expect.suggestNothing)
    check('suggests no listing', suggested.length === 0, `suggested ${show(suggested)}`);

  if (expect.siteVisit !== undefined)
    check(
      'site visit flag',
      decision.siteVisitRequested === expect.siteVisit,
      show(decision.siteVisitRequested),
    );
  if (expect.visitPreference)
    check(
      'visit preference captured',
      expect.visitPreference.test(decision.siteVisitPreference ?? ''),
      show(decision.siteVisitPreference),
    );
  if (expect.handoff !== undefined)
    check(
      'handoff flag',
      decision.handoff.requested === expect.handoff,
      show(decision.handoff.requested),
    );

  for (const re of expect.replyMatches ?? []) check(`reply matches ${re}`, re.test(reply), reply);
  for (const re of expect.replyNotMatches ?? [])
    check(`reply avoids ${re}`, !re.test(reply), reply);

  // Rules for every reply.
  check('reply is short (≤ 600 chars)', reply.length <= 600, `${reply.length} chars`);
  check('at most one question', (reply.match(/[?？]/g) ?? []).length <= 1, reply);
  check('no markdown', !/(\*\*|^#{1,3}\s|^\s*[-*]\s)/m.test(reply), reply);
  check('no guarantees', !/\b(guarantee[sd]?|100% (sure|safe))\b/i.test(reply), reply);
  return checks;
}
