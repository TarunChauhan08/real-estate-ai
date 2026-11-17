import {
  type ConversationChannel,
  type ConversationStatus,
  type LeadStatus,
  type LeadTemperature,
  type MessageDeliveryStatus,
  type MessageRole,
} from './enums';

export interface MessageDto {
  id: string;
  role: MessageRole;
  content: string;
  /** AI replies only: property IDs the AI suggested in this message. */
  suggestedPropertyIds: string[];
  /** Outgoing WhatsApp messages only; null for everything else. */
  deliveryStatus: MessageDeliveryStatus | null;
  /** Why WhatsApp delivery failed, when it did. */
  deliveryError: string | null;
  createdAt: string;
}

export interface ConversationSummaryDto {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  aiEnabled: boolean;
  lead: {
    id: string;
    name: string;
    phone: string;
    status: LeadStatus;
    temperature: LeadTemperature;
  };
  lastMessage: { role: MessageRole; content: string; createdAt: string } | null;
  lastMessageAt: string | null;
  /**
   * WhatsApp only: free-form replies are allowed until this time (24 hours after the buyer's
   * last message). Null for other channels or before the buyer has written.
   */
  replyWindowEndsAt: string | null;
  createdAt: string;
}

export interface ConversationDto extends ConversationSummaryDto {
  messages: MessageDto[];
}

/** Result of a buyer message: the stored buyer message, the AI reply (if the AI is on) and the refreshed lead. */
export interface ConversationTurnDto {
  buyerMessage: MessageDto;
  aiMessage: MessageDto | null;
  /** True when the AI asked for a human (e.g. negotiation, complaint, legal question). */
  handoffRequested: boolean;
  /** Set when the AI could not reply (provider down, timeout). The buyer message is still saved. */
  aiError: string | null;
}

/** WhatsApp lets a business reply freely for this long after the buyer's last message. */
export const WHATSAPP_REPLY_WINDOW_HOURS = 24;

export type WhatsAppProviderName = 'fake' | 'cloud';

export interface WhatsAppAccountDto {
  phoneNumberId: string;
  wabaId: string | null;
  displayPhoneNumber: string;
  connectedAt: string;
  /** Last time a buyer message arrived on this number. */
  lastInboundAt: string | null;
}

export interface WhatsAppStatusDto {
  /** `fake` = offline demo mode: replies are recorded but never sent. */
  provider: WhatsAppProviderName;
  account: WhatsAppAccountDto | null;
  /** True when staff can simulate incoming WhatsApp messages (fake provider, non-production). */
  simulatorEnabled: boolean;
}

export interface ConnectWhatsAppRequest {
  phoneNumberId: string;
  wabaId?: string;
  displayPhoneNumber: string;
  /** Permanent system-user token from Meta Business Manager. Write-only. */
  accessToken: string;
}

export interface SimulateWhatsAppRequest {
  /** Buyer's number. */
  from: string;
  name?: string;
  text: string;
}

export interface SimulateWhatsAppResultDto {
  conversationId: string;
}
