// TypeScript types mirroring the Supabase schema.
// For a production setup, generate with: `supabase gen types typescript --linked > lib/types/database.ts`
// This hand-written version mirrors migrations/00001_init_schema.sql.

export type UserRole = "admin" | "sales_manager" | "sales_agent" | "field_executive" | "social_media_manager";
export type LeadSource = "36_acre" | "magicbricks" | "housing" | "facebook" | "instagram" | "website" | "referral" | "manual" | "whatsapp" | "other";
export type LeadStatus = "new" | "contacted" | "interested" | "site_visit_scheduled" | "negotiation" | "won" | "lost" | "not_responding" | "call_pending";
export type LeadTemperature = "cold" | "warm" | "hot";
export type PropertyType = "apartment" | "villa" | "plot" | "commercial" | "rental";
export type PropertyStatus = "available" | "hold" | "sold" | "rented";
export type CallStatus = "initiated" | "ringing_agent" | "agent_connected" | "ringing_lead" | "in_progress" | "completed" | "no_answer" | "failed" | "busy";
export type CallOutcome = "connected" | "voicemail" | "no_answer" | "wrong_number" | "callback_requested" | "not_interested" | "interested";
export type MessageChannel = "whatsapp" | "sms" | "email";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "read";
export type FollowupType = "call" | "whatsapp" | "sms" | "email" | "meeting";
export type FollowupStatus = "pending" | "completed" | "snoozed" | "cancelled";
export type AttendanceStatus = "present" | "late" | "absent" | "half_day" | "on_leave";
export type SocialPostType = "instagram_reel" | "instagram_post" | "facebook_post" | "linkedin_post" | "story" | "twitter_post";
export type SocialPostStatus = "idea" | "draft" | "scheduled" | "published" | "failed";
export type AssignmentMode = "round_robin" | "manual" | "least_busy";
export type ActivityType =
  | "lead_created" | "lead_assigned" | "lead_status_changed" | "lead_note_added"
  | "call_started" | "call_ended" | "message_sent" | "property_shared"
  | "followup_created" | "followup_completed" | "attendance_checked_in" | "attendance_checked_out";

export interface Organization {
  id: string; name: string; slug: string; logo_url: string | null;
  phone: string | null; email: string | null; address: string | null;
  created_at: string; updated_at: string;
}

export interface Profile {
  id: string; organization_id: string; full_name: string; email: string;
  phone: string | null; avatar_url: string | null; role: UserRole;
  is_active: boolean; last_active_at: string | null;
  created_at: string; updated_at: string;
}

export interface Lead {
  id: string; organization_id: string; full_name: string; phone: string;
  email: string | null; source: LeadSource; source_meta: Record<string, unknown>;
  property_type: PropertyType | null; budget_min: number | null; budget_max: number | null;
  preferred_location: string | null; status: LeadStatus; temperature: LeadTemperature;
  assigned_agent_id: string | null; notes: string | null;
  next_followup_at: string | null; last_contacted_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface Property {
  id: string; organization_id: string; title: string; location: string; address: string | null;
  property_type: PropertyType; price: number; size_sqft: number | null;
  bedrooms: number | null; bathrooms: number | null; floor: number | null;
  furnishing: string | null; status: PropertyStatus; description: string | null;
  amenities: string[]; developer_name: string | null; internal_tags: string[];
  share_token: string; created_by: string | null; created_at: string; updated_at: string;
}

export interface PropertyImage {
  id: string; organization_id: string; property_id: string;
  url: string; storage_path: string | null; caption: string | null;
  sort_order: number; created_at: string;
}

export interface Call {
  id: string; organization_id: string; lead_id: string; agent_id: string | null;
  call_sid: string | null; conference_sid: string | null;
  agent_call_sid: string | null; lead_call_sid: string | null;
  status: CallStatus; outcome: CallOutcome | null;
  duration_seconds: number; recording_url: string | null;
  notes: string | null; is_dry_run: boolean;
  started_at: string; ended_at: string | null;
  created_at: string; updated_at: string;
}

export interface Message {
  id: string; organization_id: string; lead_id: string; sent_by: string | null;
  channel: MessageChannel; direction: "outbound" | "inbound"; body: string;
  template_key: string | null; external_id: string | null;
  status: MessageStatus; error_message: string | null; is_dry_run: boolean;
  created_at: string; updated_at: string;
}

export interface Followup {
  id: string; organization_id: string; lead_id: string; assigned_to: string | null;
  type: FollowupType; title: string; notes: string | null;
  due_at: string; completed_at: string | null; status: FollowupStatus;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface Attendance {
  id: string; organization_id: string; user_id: string;
  check_in_at: string; check_out_at: string | null;
  check_in_lat: number | null; check_in_lng: number | null;
  check_out_lat: number | null; check_out_lng: number | null;
  check_in_selfie_url: string | null;
  status: AttendanceStatus; notes: string | null; field_visit_notes: string | null;
  created_at: string; updated_at: string;
}

export interface SocialPost {
  id: string; organization_id: string; title: string; post_type: SocialPostType;
  caption: string | null; media_urls: string[]; status: SocialPostStatus;
  scheduled_at: string | null; published_at: string | null;
  assigned_to: string | null; notes: string | null;
  external_post_id: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface Activity {
  id: string; organization_id: string; actor_id: string | null;
  type: ActivityType; lead_id: string | null; property_id: string | null;
  call_id: string | null; message_id: string | null;
  followup_id: string | null; attendance_id: string | null;
  summary: string; metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string; organization_id: string; user_id: string; kind: string;
  title: string; body: string | null; link_path: string | null;
  is_read: boolean; metadata: Record<string, unknown>; created_at: string;
}

export interface IntegrationSettings {
  id: string; organization_id: string;
  lead_webhook_secret: string | null;
  default_assignment_mode: AssignmentMode;
  social_publish_webhook_url: string | null;
  created_at: string; updated_at: string;
}

export interface Invite {
  id: string; organization_id: string; email: string; role: UserRole;
  token: string; invited_by: string | null;
  accepted_at: string | null; expires_at: string; created_at: string;
}
