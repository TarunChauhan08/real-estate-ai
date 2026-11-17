# 0002 — How the AI sales employee works

Status: accepted (Phase 2B)

## One turn, three steps

```
buyer message ──► 1. save message (transaction A)
                  2. load context: business, lead profile, ≤6 matching listings, last 20 messages
                     ask the LLM            (no transaction open — this can take seconds)
                  3. save AI reply + lead updates + audit entries (transaction B)
```

If step 2 fails, the buyer's message is already safe and the API returns `aiError` instead of a 500.

## Decisions

| Decision                                                            | Why                                                                                                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLMProvider` interface; `AnthropicProvider` and `FakeLLMProvider`  | Swap vendors or run a self-hosted model on-prem by writing one class. Tests and demos never call a paid API.                                                                                       |
| Plain `fetch` to the Messages API, no SDK                           | One less dependency to keep in sync; easy to read and to point at a proxy.                                                                                                                         |
| Forced tool call (`respond`) instead of free text                   | One round-trip returns both the reply and structured facts (budget, BHK, city…) we can save.                                                                                                       |
| Validate everything the model returns (`parseAgentDecision`)        | Model output is untrusted input. Bad fields degrade to "unknown"; only a missing reply fails the turn.                                                                                             |
| Suggested property IDs are filtered to the listings we showed it    | The AI cannot recommend something that is not in the inventory.                                                                                                                                    |
| `planLeadUpdate` is a pure function                                 | The rules for what the AI may change are easy to read and unit-test: it fills facts, never overwrites a human-entered name/email, only moves NEW → CONTACTED → QUALIFIED, never wins/loses a lead. |
| Candidate listings: strict match first, then relax                  | Early in a chat the AI still knows what the business sells; later it only sees close matches (budget +10%/-20%).                                                                                   |
| Human handoff pauses the AI for that conversation                   | Discounts, legal questions and complaints go to people. The AI stays silent until someone turns it back on.                                                                                        |
| `PROMPT_VERSION` stored on every AI message                         | When we change the prompt we can compare before/after on real conversations — the start of the eval pipeline.                                                                                      |
| Prompt-injection rule in the system prompt + server-side validation | Buyer text is treated as conversation, never as instructions; even if the model is fooled, the server only accepts known fields.                                                                   |
| Buyer messages can only be simulated in `WEB_TEST` conversations    | WhatsApp/voice messages will arrive through verified webhooks, not from the dashboard.                                                                                                             |

## Cost and model choice

`ANTHROPIC_MODEL` defaults to `claude-sonnet-5-5` for quality. `claude-haiku-5-5` is cheaper and faster
for high volume. Token counts per message are stored, so cost per lead can be measured, not guessed.

## Next

1. WhatsApp Business webhook → same `ConversationsService.sendMessage` path with `channel = WHATSAPP`.
2. Eval set of ~50 Hinglish conversations, scored automatically on every prompt change.
3. Site-visit booking as a second tool the model can call.
