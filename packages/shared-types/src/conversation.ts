import {
  type ConversationChannel,
  type ConversationStatus,
  type LeadStatus,
  type LeadTemperature,
  type MessageRole,
} from './enums';

export interface MessageDto {
  id: string;
  role: MessageRole;
  content: string;
  /** AI replies only: property IDs the AI suggested in this message. */
  suggestedPropertyIds: string[];
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
