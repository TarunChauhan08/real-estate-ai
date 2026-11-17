import { WHATSAPP_REPLY_WINDOW_HOURS } from '@rea/shared-types';

export const REPLY_WINDOW_MS = WHATSAPP_REPLY_WINDOW_HOURS * 60 * 60 * 1000;

/** WhatsApp allows free-form business messages only within 24 hours of the buyer's last message. */
export function isInsideReplyWindow(lastBuyerMessageAt: Date | null, now = Date.now()): boolean {
  return lastBuyerMessageAt !== null && now - lastBuyerMessageAt.getTime() < REPLY_WINDOW_MS;
}
