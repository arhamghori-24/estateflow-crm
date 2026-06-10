-- EstateFlow CRM - Initial Schema
-- Multi-tenant: every row scoped by organization_id

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============ ENUMS ============
create type user_role as enum ('admin', 'sales_manager', 'sales_agent', 'field_executive', 'social_media_manager');
create type lead_source as enum ('36_acre', 'magicbricks', 'housing', 'facebook', 'instagram', 'website', 'referral', 'manual', 'whatsapp', 'other');
create type lead_status as enum ('new', 'contacted', 'interested', 'site_visit_scheduled', 'negotiation', 'won', 'lost', 'not_responding', 'call_pending');
create type lead_temperature as enum ('cold', 'warm', 'hot');
create type property_type as enum ('apartment', 'villa', 'plot', 'commercial', 'rental');
create type property_status as enum ('available', 'hold', 'sold', 'rented');
create type call_status as enum ('initiated', 'ringing_agent', 'agent_connected', 'ringing_lead', 'in_progress', 'completed', 'no_answer', 'failed', 'busy');
create type call_outcome as enum ('connected', 'voicemail', 'no_answer', 'wrong_number', 'callback_requested', 'not_interested', 'interested');
create type message_channel as enum ('whatsapp', 'sms', 'email');
create type message_status as enum ('queued', 'sent', 'delivered', 'failed', 'read');
create type followup_type as enum ('call', 'whatsapp', 'sms', 'email', 'meeting');
create type followup_status as enum ('pending', 'completed', 'snoozed', 'cancelled');
create type attendance_status as enum ('present', 'late', 'absent', 'half_day', 'on_leave');
create type social_post_type as enum ('instagram_reel', 'instagram_post', 'facebook_post', 'linkedin_post', 'story', 'twitter_post');
create type social_post_status as enum ('idea', 'draft', 'scheduled', 'published', 'failed');
create type assignment_mode as enum ('round_robin', 'manual', 'least_busy');
create type activity_type as enum (
  'lead_created', 'lead_assigned', 'lead_status_changed', 'lead_note_added',
  'call_started', 'call_ended', 'message_sent', 'property_shared',
  'followup_created', 'followup_completed', 'attendance_checked_in', 'attendance_checked_out'
);

-- ============ ORGANIZATIONS ============
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ PROFILES (extends auth.users) ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'sales_agent',
  is_active boolean not null default true,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_role on profiles(organization_id, role);

-- ============ INTEGRATION SETTINGS ============
create table integration_settings (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  twilio_account_sid text,
  twilio_auth_token_encrypted text,
  twilio_phone_number text,
  whatsapp_sender_number text,
  resend_api_key_encrypted text,
  smtp_host text,
  smtp_port int,
  smtp_user text,
  smtp_password_encrypted text,
  lead_webhook_secret text,
  openai_api_key_encrypted text,
  default_assignment_mode assignment_mode not null default 'round_robin',
  social_publish_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ LEADS ============
create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  source lead_source not null default 'manual',
  source_meta jsonb default '{}'::jsonb,
  property_type property_type,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  preferred_location text,
  status lead_status not null default 'new',
  temperature lead_temperature not null default 'warm',
  assigned_agent_id uuid references profiles(id) on delete set null,
  notes text,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_org_status on leads(organization_id, status);
create index idx_leads_org_agent on leads(organization_id, assigned_agent_id);
create index idx_leads_followup on leads(organization_id, next_followup_at) where next_followup_at is not null;
create index idx_leads_phone on leads(organization_id, phone);
create index idx_leads_created on leads(organization_id, created_at desc);

-- ============ PROPERTIES ============
create table properties (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  location text not null,
  address text,
  property_type property_type not null,
  price numeric(14,2) not null,
  size_sqft numeric(10,2),
  bedrooms int,
  bathrooms int,
  floor int,
  furnishing text,
  status property_status not null default 'available',
  description text,
  amenities text[] default '{}',
  developer_name text,
  internal_tags text[] default '{}',
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_properties_org_status on properties(organization_id, status);
create index idx_properties_org_type on properties(organization_id, property_type);
create index idx_properties_org_price on properties(organization_id, price);
create index idx_properties_share_token on properties(share_token);

create table property_images (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  url text not null,
  storage_path text,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_property_images_property on property_images(property_id, sort_order);

create table property_documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  url text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- ============ LEAD <> PROPERTY SHARES ============
create table lead_property_shares (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  shared_by uuid references profiles(id) on delete set null,
  channel message_channel not null,
  message_body text,
  share_url text,
  created_at timestamptz not null default now()
);
create index idx_shares_lead on lead_property_shares(lead_id, created_at desc);

-- ============ CALLS ============
create table calls (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  agent_id uuid references profiles(id) on delete set null,
  call_sid text,
  conference_sid text,
  agent_call_sid text,
  lead_call_sid text,
  status call_status not null default 'initiated',
  outcome call_outcome,
  duration_seconds int default 0,
  recording_url text,
  notes text,
  is_dry_run boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_calls_org_lead on calls(organization_id, lead_id, started_at desc);
create index idx_calls_org_agent on calls(organization_id, agent_id, started_at desc);
create index idx_calls_sid on calls(call_sid);

-- ============ MESSAGES ============
create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  sent_by uuid references profiles(id) on delete set null,
  channel message_channel not null,
  direction text not null default 'outbound', -- outbound | inbound
  body text not null,
  template_key text,
  external_id text,
  status message_status not null default 'queued',
  error_message text,
  is_dry_run boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_messages_org_lead on messages(organization_id, lead_id, created_at desc);

-- ============ FOLLOW-UPS ============
create table followups (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  type followup_type not null,
  title text not null,
  notes text,
  due_at timestamptz not null,
  completed_at timestamptz,
  status followup_status not null default 'pending',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_followups_org_due on followups(organization_id, due_at) where status = 'pending';
create index idx_followups_lead on followups(lead_id, created_at desc);

-- ============ ATTENDANCE ============
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_lat numeric(9,6),
  check_in_lng numeric(9,6),
  check_out_lat numeric(9,6),
  check_out_lng numeric(9,6),
  check_in_selfie_url text,
  status attendance_status not null default 'present',
  notes text,
  field_visit_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_attendance_org_user_date on attendance(organization_id, user_id, check_in_at desc);
create index idx_attendance_open on attendance(organization_id, user_id) where check_out_at is null;

-- ============ SOCIAL POSTS ============
create table social_posts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  post_type social_post_type not null,
  caption text,
  media_urls text[] default '{}',
  status social_post_status not null default 'idea',
  scheduled_at timestamptz,
  published_at timestamptz,
  assigned_to uuid references profiles(id) on delete set null,
  notes text,
  external_post_id text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_social_org_status on social_posts(organization_id, status, scheduled_at);

-- ============ TASKS (generic) ============
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  related_lead_id uuid references leads(id) on delete cascade,
  related_property_id uuid references properties(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_assigned on tasks(organization_id, assigned_to, is_done, due_at);

-- ============ ACTIVITIES (timeline log) ============
create table activities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type activity_type not null,
  lead_id uuid references leads(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  call_id uuid references calls(id) on delete set null,
  message_id uuid references messages(id) on delete set null,
  followup_id uuid references followups(id) on delete set null,
  attendance_id uuid references attendance(id) on delete set null,
  summary text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activities_org_created on activities(organization_id, created_at desc);
create index idx_activities_lead on activities(lead_id, created_at desc) where lead_id is not null;

-- ============ NOTIFICATIONS ============
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null, -- 'new_lead' | 'missed_call' | 'followup_due' | 'site_visit' | 'property_shared' | 'attendance' | 'social_post_due'
  title text not null,
  body text,
  link_path text,
  is_read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications(user_id, is_read, created_at desc);

-- ============ INVITES ============
create table invites (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role user_role not null default 'sales_agent',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index idx_invites_token on invites(token);
create index idx_invites_org on invites(organization_id);

-- ============ ROUND-ROBIN ASSIGNMENT POINTER ============
-- Tracks last-assigned agent index per org for round-robin
create table assignment_pointer (
  organization_id uuid primary key references organizations(id) on delete cascade,
  last_agent_id uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============ updated_at TRIGGERS ============
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'organizations','profiles','integration_settings','leads','properties',
    'calls','messages','followups','attendance','social_posts','tasks'
  ]) loop
    execute format('create trigger trg_updated_at_%I before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
