/** Shared types for service adapters. */
export interface ServiceResult<T = unknown> {
  ok: boolean;
  dryRun?: boolean;
  data?: T;
  error?: string;
}

export interface CallBridgeRequest {
  organizationId: string;
  leadId: string;
  leadPhone: string;
  leadName: string;
  source: string;
  agentId: string;
  agentPhone: string;
}

export interface MessageRequest {
  organizationId: string;
  leadId: string;
  sentBy?: string;
  channel: "whatsapp" | "sms" | "email";
  to: string;
  body: string;
  subject?: string;
  templateKey?: string;
}

export interface PropertyShareRequest {
  organizationId: string;
  leadId: string;
  propertyId: string;
  sharedBy: string;
  channel: "whatsapp" | "sms" | "email";
}
