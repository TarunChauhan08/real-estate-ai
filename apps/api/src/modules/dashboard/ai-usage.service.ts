import { Injectable } from '@nestjs/common';
import { type AiUsageDay, type AiUsageSummary } from '@rea/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../audit/audit-actions';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant, in India Standard Time. */
export function istDate(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight IST `days - 1` days ago, so "7 days" means today plus the six days before it. */
export function periodStart(now: Date, days: number): Date {
  const todayIst = istDate(now);
  const midnightIst = new Date(`${todayIst}T00:00:00.000Z`).getTime() - IST_OFFSET_MS;
  return new Date(midnightIst - (days - 1) * 24 * 60 * 60 * 1000);
}

interface DailyRow {
  date: string;
  replies: bigint;
  input_tokens: bigint | null;
  output_tokens: bigint | null;
}

/**
 * Reads token usage straight from the AI messages (each AI reply stores its model, tokens and
 * latency), so there is no second counter that could drift out of sync.
 */
@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string, days: number, now = new Date()): Promise<AiUsageSummary> {
    const from = periodStart(now, days);
    const [totals, daily, languages, failedReplies] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          replies: bigint;
          input_tokens: bigint | null;
          output_tokens: bigint | null;
          avg_latency: number | null;
          handoffs: bigint;
          visits: bigint;
        }>
      >`
        SELECT count(*) AS replies,
               sum(input_tokens) AS input_tokens,
               sum(output_tokens) AS output_tokens,
               avg(latency_ms)::float AS avg_latency,
               count(*) FILTER (WHERE (metadata -> 'handoff' ->> 'requested') = 'true') AS handoffs,
               count(*) FILTER (WHERE (metadata ->> 'siteVisitRequested') = 'true') AS visits
        FROM messages
        WHERE tenant_id = ${tenantId}::uuid AND role = 'AI' AND created_at >= ${from}`,
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
               count(*) AS replies,
               sum(input_tokens) AS input_tokens,
               sum(output_tokens) AS output_tokens
        FROM messages
        WHERE tenant_id = ${tenantId}::uuid AND role = 'AI' AND created_at >= ${from}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ language: string | null; replies: bigint }>>`
        SELECT metadata ->> 'language' AS language, count(*) AS replies
        FROM messages
        WHERE tenant_id = ${tenantId}::uuid AND role = 'AI' AND created_at >= ${from}
        GROUP BY 1`,
      this.prisma.auditLog.count({
        where: { tenantId, action: AuditAction.AI_REPLY_FAILED, createdAt: { gte: from } },
      }),
    ]);

    const t = totals[0];
    const byDate = new Map(daily.map((d) => [d.date, d]));
    const series: AiUsageDay[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = istDate(new Date(from.getTime() + i * 24 * 60 * 60 * 1000));
      const row = byDate.get(date);
      series.push({
        date,
        replies: Number(row?.replies ?? 0),
        inputTokens: Number(row?.input_tokens ?? 0),
        outputTokens: Number(row?.output_tokens ?? 0),
      });
    }
    const replies = Number(t?.replies ?? 0);
    return {
      days,
      from: from.toISOString(),
      replies,
      failedReplies,
      inputTokens: Number(t?.input_tokens ?? 0),
      outputTokens: Number(t?.output_tokens ?? 0),
      averageLatencyMs:
        replies > 0 && t?.avg_latency !== null && t?.avg_latency !== undefined
          ? Math.round(t.avg_latency)
          : null,
      handoffs: Number(t?.handoffs ?? 0),
      siteVisitRequests: Number(t?.visits ?? 0),
      languages: Object.fromEntries(
        languages.map((l) => [l.language ?? 'unknown', Number(l.replies)]),
      ),
      daily: series,
    };
  }
}
