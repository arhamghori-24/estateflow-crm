-- Row Level Security: users only see their own organization's data.

-- Helper: current user's organization
create or replace function auth_org_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Helper: current user's role
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public, auth as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin()
returns boolean language sql stable as $$ select auth_role() = 'admin' $$;

create or replace function is_manager_or_admin()
returns boolean language sql stable as $$ select auth_role() in ('admin','sales_manager') $$;

-- Enable RLS on every tenant-scoped table
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table integration_settings enable row level security;
alter table leads enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table property_documents enable row level security;
alter table lead_property_shares enable row level security;
alter table calls enable row level security;
alter table messages enable row level security;
alter table followups enable row level security;
alter table attendance enable row level security;
alter table social_posts enable row level security;
alter table tasks enable row level security;
alter table activities enable row level security;
alter table notifications enable row level security;
alter table invites enable row level security;
alter table assignment_pointer enable row level security;

-- ORGANIZATIONS: members can read their org; admin can update
create policy org_select on organizations for select using (id = auth_org_id());
create policy org_update on organizations for update using (id = auth_org_id() and is_admin());

-- PROFILES: members can read profiles in same org; admin can insert/update/delete
create policy profiles_select on profiles for select using (organization_id = auth_org_id());
create policy profiles_self_update on profiles for update using (id = auth.uid());
create policy profiles_admin_all on profiles for all using (organization_id = auth_org_id() and is_admin())
  with check (organization_id = auth_org_id() and is_admin());

-- INTEGRATION SETTINGS: admin only
create policy integrations_admin on integration_settings for all
  using (organization_id = auth_org_id() and is_admin())
  with check (organization_id = auth_org_id() and is_admin());

-- LEADS: org-scoped read; agents see all in org (managers can reassign)
create policy leads_select on leads for select using (organization_id = auth_org_id());
create policy leads_insert on leads for insert with check (organization_id = auth_org_id());
create policy leads_update on leads for update using (organization_id = auth_org_id());
create policy leads_delete on leads for delete using (organization_id = auth_org_id() and is_manager_or_admin());

-- PROPERTIES
create policy properties_select on properties for select using (organization_id = auth_org_id());
create policy properties_write on properties for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

-- PROPERTY IMAGES / DOCS
create policy property_images_rw on property_images for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
create policy property_docs_rw on property_documents for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

-- SHARES
create policy shares_rw on lead_property_shares for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

-- CALLS / MESSAGES / FOLLOWUPS / TASKS / ACTIVITIES
create policy calls_rw on calls for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
create policy messages_rw on messages for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
create policy followups_rw on followups for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
create policy tasks_rw on tasks for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());
create policy activities_rw on activities for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

-- ATTENDANCE: users see all org attendance (for "who's checked in"); only self can insert/update own
create policy attendance_select on attendance for select using (organization_id = auth_org_id());
create policy attendance_insert_self on attendance for insert with check (
  organization_id = auth_org_id() and user_id = auth.uid()
);
create policy attendance_update_self on attendance for update using (
  organization_id = auth_org_id() and (user_id = auth.uid() or is_manager_or_admin())
);

-- SOCIAL POSTS
create policy social_rw on social_posts for all using (organization_id = auth_org_id())
  with check (organization_id = auth_org_id());

-- NOTIFICATIONS: user only sees own
create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid());

-- INVITES: admin only
create policy invites_admin on invites for all
  using (organization_id = auth_org_id() and is_admin())
  with check (organization_id = auth_org_id() and is_admin());

-- ASSIGNMENT POINTER: anyone in org can read; service role writes
create policy ap_select on assignment_pointer for select using (organization_id = auth_org_id());

-- ============ ROUND-ROBIN ASSIGNMENT FUNCTION ============
-- Picks the next active sales_agent in round-robin order for the given org.
-- Returns null if no agents are available.
create or replace function pick_next_agent(p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  last_id uuid;
  next_id uuid;
begin
  select last_agent_id into last_id from assignment_pointer where organization_id = p_org;

  -- Find next agent after the last one, ordered by id
  select id into next_id
  from profiles
  where organization_id = p_org and role = 'sales_agent' and is_active
    and (last_id is null or id > last_id)
  order by id asc
  limit 1;

  -- Wrap around if no agent found
  if next_id is null then
    select id into next_id
    from profiles
    where organization_id = p_org and role = 'sales_agent' and is_active
    order by id asc
    limit 1;
  end if;

  if next_id is not null then
    insert into assignment_pointer (organization_id, last_agent_id, updated_at)
    values (p_org, next_id, now())
    on conflict (organization_id) do update
      set last_agent_id = excluded.last_agent_id, updated_at = now();
  end if;

  return next_id;
end $$;

-- Least-busy agent: agent with fewest open leads
create or replace function pick_least_busy_agent(p_org uuid)
returns uuid language sql security definer set search_path = public as $$
  select p.id from profiles p
  left join leads l on l.assigned_agent_id = p.id
    and l.status not in ('won','lost','not_responding')
  where p.organization_id = p_org and p.role = 'sales_agent' and p.is_active
  group by p.id
  order by count(l.id) asc, p.id asc
  limit 1
$$;
