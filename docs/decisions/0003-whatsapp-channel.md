# 0003 — WhatsApp channel

Status: accepted (Phase 3)

## Flow

```
Meta ──POST /webhooks/whatsapp──► verify HMAC (app secret) ──► 200 OK at once
                                       │
                                       ▼ background
             parse events ─► route by phone_number_id ─► business
                                       │
     message ─► store (per-buyer queue, de-duplicated on wamid) ─► mark read
            ─► wait WHATSAPP_REPLY_DEBOUNCE_MS ─► still the latest buyer message?
            ─► AI turn (same code as the test chat) ─► save reply ─► send via Cloud API
            ─► SENT / FAILED (+ reason)
     status ─► SENT → DELIVERED → READ (forward only) or FAILED
```

## Decisions

| Decision                                                                          | Why                                                                                                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Cloud API directly, behind a `WhatsAppClient` interface (`cloud` and `fake`) | No BSP fees or lock-in. A BSP (Gupshup, Twilio…) or on-prem gateway is one more class. Tests and demos never send a real message.                         |
| One platform Meta app; businesses are routed by `phone_number_id`                 | One webhook URL and one app secret for all businesses — the model Meta's Tech Provider programme expects.                                                 |
| Answer the webhook immediately, process in the background                         | Meta retries slow webhooks; an AI reply can take several seconds.                                                                                         |
| De-duplicate on `wamid` (unique per business)                                     | Meta delivers webhooks at least once. Retries must never create a second message or a second AI reply.                                                    |
| Per-buyer queue for storing, plus a short debounce before replying                | Buyers send bursts ("hi" / "3 BHK" / "Noida"). One coherent reply beats three overlapping ones, and two first messages cannot create the same lead twice. |
| Only the latest buyer message triggers the AI                                     | The AI sees the whole history, so answering the last message answers all of them.                                                                         |
| Save first, send second; failures are stored with a plain-language reason         | A WhatsApp outage never loses a reply, and the team sees exactly why something was not delivered.                                                         |
| Meta's raw error text is never stored or logged                                   | It can echo the buyer's number or message. We keep the error code and our own wording.                                                                    |
| Access token encrypted with AES-256-GCM (`DATA_ENCRYPTION_KEY`)                   | The token can send messages as the business; a database leak alone must not expose it. Required in production.                                            |
| Token checked with Meta before it is saved                                        | A typo is caught at setup, not when the first buyer writes.                                                                                               |
| 24-hour window enforced in the API and shown in the inbox                         | WhatsApp rejects free-form messages after 24 hours (error 131047). Better to explain than to fail.                                                        |
| Demo simulator (fake provider, never production)                                  | Businesses and sales demos can see the full flow before going through Meta's verification.                                                                |
| Unsigned webhooks are rejected whenever real businesses could be affected         | Without the signature anyone could inject buyer messages.                                                                                                 |

## Known limits and next steps

- **Queue is in memory.** Correct for one API instance. Running several instances needs a shared
  queue (BullMQ on Redis) and a distributed lock per buyer.
- **Embedded Signup.** Businesses currently paste IDs and a System User token. Meta's Embedded
  Signup (after Tech Provider verification) makes this a two-click "Connect WhatsApp" button and
  subscribes the business's WABA to the platform app automatically.
- **Template messages** for first contact and follow-ups after 24 hours.
- **Media.** Photos, documents and voice notes are described to the AI ("[Sent a photo]") but not
  downloaded. Voice-note transcription (Hindi/Hinglish) is a strong next feature for India.
- **Business-scoped user IDs.** Meta is introducing usernames; webhooks may then carry an ID instead
  of a phone number. Such messages are currently skipped (logged), and need a lead lookup by that ID.
