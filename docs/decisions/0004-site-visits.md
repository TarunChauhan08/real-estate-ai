# 0004 — Site visits

Status: accepted (Phase 4)

## Flow

```
Buyer: "Saturday 11am visit?" ─► AI turn ─► REQUESTED visit (requested_slot = "Saturday 11am")
                                              │  shown in the conversation and on Site Visits
Team picks an exact time ───────────────────► CONFIRMED ─► WhatsApp confirmation to the buyer
                                              │            lead → SITE_VISIT_SCHEDULED
Reminder job (every minute) ────────────────► one WhatsApp reminder ~3 h before
After the slot ─────────────────────────────► COMPLETED or NO_SHOW (correctable), or CANCELLED
```

## Decisions

| Decision                                                                                                        | Why                                                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| The AI only creates REQUESTED visits; people confirm exact times                                                | The AI does not know the team's calendar. Promising a slot nobody can keep is worse than a short wait. |
| One open request per lead; later messages update its preferred time                                             | Buyers repeat themselves ("Saturday" then "actually Sunday"). One request keeps the queue clean.       |
| The AI never edits a confirmed visit                                                                            | Changes to a confirmed visit are a conversation for a person.                                          |
| Buyer messages in their language (English / Hindi / Hinglish), from fixed templates                             | Predictable wording for times and places; no AI-invented details.                                      |
| Confirmation is sent as an AI message in the same WhatsApp thread                                               | The buyer sees it in context, and the AI knows about it on later turns.                                |
| When WhatsApp does not allow a message (no thread, 24-hour window closed, delivery failed) the team is told why | They can call the buyer instead. Nothing fails silently.                                               |
| Reminders are claimed with a conditional update before sending                                                  | Exactly one reminder even with several API instances. Rescheduling resets it.                          |
| No reminder when the visit was confirmed less than an hour ago                                                  | The confirmation itself is enough.                                                                     |
| A database CHECK keeps CONFIRMED visits from having no time                                                     | A second line of defence behind the API's validation.                                                  |
| Visits are never deleted                                                                                        | Cancelled and no-show history is useful for follow-ups and reporting.                                  |

## Next

- Calendar view and per-agent availability.
- Template-message reminders outside WhatsApp's 24-hour window.
- No-show follow-up suggestions.
