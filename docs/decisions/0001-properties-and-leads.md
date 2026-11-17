# 0001 — Properties and leads design

Status: accepted (Phase 2A)

| Decision                                      | Why                                                                                                        | Trade-off                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Money as BIGINT whole rupees                  | Exact arithmetic, no float bugs; Indian prices are whole rupees in practice                                | Paise precision not supported                   |
| Phone normalised to E.164, unique per tenant  | The same buyer from WhatsApp, a portal and a walk-in must be one lead; WhatsApp identifies people by phone | Shared family phones collapse into one lead     |
| Soft delete via status (ARCHIVED, LOST)       | Keeps history for the AI and audits                                                                        | Lists must filter archived by default           |
| Hand-written CHECK constraints                | The database is the last line of defence if a bug skips validation                                         | Live in migration SQL, not the Prisma schema    |
| `null` on required fields ignored in PATCH    | `PartialType` would otherwise let `null` reach Prisma and cause a 500                                      | A client can't clear required fields (intended) |
| Lead pipeline: WON terminal, LOST → NEW only  | Real sales are not linear; only block clearly wrong moves                                                  | Rare corrections need an admin fix              |
| Assignment is its own endpoint and permission | Agents can work leads but not reshuffle them                                                               | One more route                                  |
| SALES_AGENT sees all leads for now            | Simple first; per-agent visibility needs product input                                                     | Revisit before selling to larger teams          |
| Tenant only from auth context                 | Never trust IDs in URL or body                                                                             | —                                               |
