-- ================================================================
-- EstateFlow CRM Seed Data
--
-- NOTE: This seed file only inserts non-auth rows. Auth users must
-- be created either via the Supabase dashboard or the seed script
-- at supabase/seed.ts (which uses the service_role key).
--
-- For a fresh setup, create these auth users first (any password):
--   admin@estateflow.test          -> Admin / Business Owner
--   manager@estateflow.test        -> Sales Manager
--   agent1@estateflow.test         -> Sales Agent
--   agent2@estateflow.test         -> Sales Agent
--   field@estateflow.test          -> Field Executive
--   social@estateflow.test         -> Social Media Manager
--
-- Then run `pnpm db:seed` (or psql -f supabase/seed.sql) which calls
-- the function below to link the auth users to org/profiles.
-- ================================================================

-- One organization
insert into organizations (id, name, slug, phone, email, address)
values (
  '00000000-0000-0000-0000-000000000001',
  'EstateFlow Demo Realty',
  'estateflow-demo',
  '+919999900000',
  'demo@estateflow.app',
  'Cyber City, Gurgaon, India'
) on conflict (id) do nothing;

-- Integration settings (dry-run defaults)
insert into integration_settings (organization_id, default_assignment_mode)
values ('00000000-0000-0000-0000-000000000001', 'round_robin')
on conflict (organization_id) do nothing;

-- Link any existing auth users (by email) to the org as profiles
create or replace function seed_link_profiles()
returns void language plpgsql as $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  rec record;
  role_for_email user_role;
  fullname text;
begin
  for rec in select id, email from auth.users where email like '%@estateflow.test' loop
    case rec.email
      when 'admin@estateflow.test' then role_for_email := 'admin'; fullname := 'Aarav Mehta (Admin)';
      when 'manager@estateflow.test' then role_for_email := 'sales_manager'; fullname := 'Neha Kapoor';
      when 'agent1@estateflow.test' then role_for_email := 'sales_agent'; fullname := 'Rohit Verma';
      when 'agent2@estateflow.test' then role_for_email := 'sales_agent'; fullname := 'Priya Sharma';
      when 'field@estateflow.test' then role_for_email := 'field_executive'; fullname := 'Karan Singh';
      when 'social@estateflow.test' then role_for_email := 'social_media_manager'; fullname := 'Aisha Khan';
      else continue;
    end case;

    insert into profiles (id, organization_id, full_name, email, role, phone)
    values (rec.id, org, fullname, rec.email, role_for_email, '+9199999' || (random()*89999+10000)::int)
    on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;
  end loop;
end $$;

select seed_link_profiles();

-- ============ SAMPLE PROPERTIES ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  prop_ids uuid[] := array[]::uuid[];
  pid uuid;
  i int;
  titles text[] := array[
    '3 BHK in DLF Phase 4',
    'Premium Villa at Sohna Road',
    'Commercial Office in Cyber Hub',
    'Studio Apt near Golf Course Rd',
    '4 BHK Penthouse Gurgaon',
    'Plot in Sector 84',
    'Furnished 2 BHK MG Road',
    'Luxury Villa Aravalli',
    'Co-working Space Udyog Vihar',
    '5 BHK Independent Floor'
  ];
  locs text[] := array[
    'Gurgaon','Sohna Road','Cyber Hub','Golf Course Rd','Gurgaon','Sector 84','MG Road','Aravalli Hills','Udyog Vihar','South City'
  ];
  types property_type[] := array[
    'apartment','villa','commercial','apartment','apartment','plot','apartment','villa','commercial','apartment'
  ];
  prices numeric[] := array[8500000,32000000,15000000,4500000,42000000,12000000,7800000,55000000,9500000,28000000];
begin
  for i in 1..10 loop
    insert into properties (
      organization_id, title, location, address, property_type, price, size_sqft,
      bedrooms, bathrooms, status, description, amenities, developer_name
    ) values (
      org, titles[i], locs[i], locs[i] || ', Gurgaon, India',
      types[i], prices[i], 800 + (i*150),
      case when types[i] in ('apartment','villa') then 2 + (i % 4) else null end,
      case when types[i] in ('apartment','villa') then 2 + (i % 3) else null end,
      'available',
      'Spacious, well-ventilated unit with modern amenities and excellent connectivity.',
      array['Parking','Power Backup','Security','Gym','Swimming Pool','Club House']::text[],
      'DLF / Sobha / Godrej'
    ) returning id into pid;
    prop_ids := prop_ids || pid;

    -- Add placeholder image
    insert into property_images (organization_id, property_id, url, sort_order)
    values (org, pid, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200', 0),
           (org, pid, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200', 1);
  end loop;
end $$;

-- ============ SAMPLE LEADS ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  agent uuid;
  i int;
  names text[] := array[
    'Rahul Sharma','Sneha Reddy','Amit Khanna','Pooja Iyer','Vikram Singh',
    'Anjali Mehra','Sandeep Gupta','Kavita Joshi','Manoj Tiwari','Ritu Bansal',
    'Arjun Nair','Divya Pillai','Saurabh Jain','Megha Kapur','Rajesh Yadav',
    'Tanvi Desai','Nikhil Rao','Sara Hussain','Gaurav Malhotra','Isha Chopra'
  ];
  sources lead_source[] := array['36_acre','magicbricks','housing','facebook','instagram','website','referral','manual','whatsapp','other'];
  statuses lead_status[] := array['new','contacted','interested','site_visit_scheduled','negotiation','won','lost','not_responding'];
  temps lead_temperature[] := array['cold','warm','hot'];
  ptypes property_type[] := array['apartment','villa','plot','commercial','rental'];
begin
  -- Pick first sales_agent as fallback
  select id into agent from profiles where organization_id = org and role = 'sales_agent' limit 1;

  for i in 1..20 loop
    insert into leads (
      organization_id, full_name, phone, email, source, property_type,
      budget_min, budget_max, preferred_location, status, temperature,
      assigned_agent_id, notes, next_followup_at
    ) values (
      org,
      names[i],
      '+9198765' || lpad((10000 + i)::text, 5, '0'),
      lower(replace(names[i], ' ', '.')) || '@example.com',
      sources[1 + (i % array_length(sources,1))],
      ptypes[1 + (i % array_length(ptypes,1))],
      5000000 + (i * 100000),
      8000000 + (i * 200000),
      (array['Gurgaon','Noida','Delhi','Faridabad','Bangalore'])[1 + (i % 5)],
      statuses[1 + (i % array_length(statuses,1))],
      temps[1 + (i % 3)],
      agent,
      'Lead from seed data - sample notes for testing the timeline view',
      now() + (i || ' hours')::interval
    );
  end loop;
end $$;

-- ============ SAMPLE FOLLOW-UPS ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  l record;
  agent uuid;
  i int := 0;
begin
  select id into agent from profiles where organization_id = org and role = 'sales_agent' limit 1;
  for l in select id from leads where organization_id = org limit 8 loop
    i := i + 1;
    insert into followups (organization_id, lead_id, assigned_to, type, title, notes, due_at, status)
    values (
      org, l.id, agent,
      (array['call','whatsapp','sms','email','meeting']::followup_type[])[1 + (i % 5)],
      'Follow up on property interest',
      'Check budget confirmation and schedule site visit',
      now() + (i || ' days')::interval,
      case when i = 1 then 'completed'::followup_status else 'pending'::followup_status end
    );
  end loop;
end $$;

-- ============ SAMPLE CALLS ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  l record;
  agent uuid;
  i int := 0;
begin
  select id into agent from profiles where organization_id = org and role = 'sales_agent' limit 1;
  for l in select id from leads where organization_id = org limit 6 loop
    i := i + 1;
    insert into calls (organization_id, lead_id, agent_id, status, outcome, duration_seconds, started_at, ended_at, is_dry_run)
    values (
      org, l.id, agent,
      (array['completed','no_answer','completed','completed','busy','completed']::call_status[])[i],
      (array['connected','no_answer','interested','callback_requested','no_answer','voicemail']::call_outcome[])[i],
      30 + (i * 45),
      now() - (i || ' hours')::interval,
      now() - ((i - 1) || ' hours')::interval,
      true
    );
  end loop;
end $$;

-- ============ SAMPLE ATTENDANCE (last 5 days for each user) ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  p record;
  d int;
begin
  for p in select id from profiles where organization_id = org loop
    for d in 1..5 loop
      insert into attendance (organization_id, user_id, check_in_at, check_out_at, check_in_lat, check_in_lng, status, notes)
      values (
        org, p.id,
        (current_date - d)::timestamptz + interval '9 hours' + ((random()*30)::int || ' minutes')::interval,
        (current_date - d)::timestamptz + interval '18 hours' + ((random()*30)::int || ' minutes')::interval,
        28.4595 + (random()*0.05),
        77.0266 + (random()*0.05),
        case when d = 2 then 'late'::attendance_status else 'present'::attendance_status end,
        'Working from Gurgaon office'
      );
    end loop;
  end loop;
end $$;

-- ============ SAMPLE SOCIAL POSTS ============
do $$
declare
  org uuid := '00000000-0000-0000-0000-000000000001';
  smm uuid;
  i int;
  titles text[] := array[
    'New launch reel - DLF Phase 4',
    'Sohna Road villa tour',
    'Market update - Gurgaon Q2',
    'Client testimonial - Mr. Sharma',
    'Open house event Saturday'
  ];
  ptypes social_post_type[] := array['instagram_reel','instagram_post','facebook_post','linkedin_post','story'];
  statuses social_post_status[] := array['idea','draft','scheduled','published','draft'];
begin
  select id into smm from profiles where organization_id = org and role = 'social_media_manager' limit 1;
  if smm is null then select id into smm from profiles where organization_id = org limit 1; end if;
  for i in 1..5 loop
    insert into social_posts (organization_id, title, post_type, caption, status, scheduled_at, assigned_to)
    values (
      org, titles[i], ptypes[i],
      'Auto-generated caption for ' || titles[i] || ' #realestate #gurgaon #property',
      statuses[i],
      now() + (i || ' days')::interval,
      smm
    );
  end loop;
end $$;

-- ============ SAMPLE ACTIVITIES ============
insert into activities (organization_id, type, lead_id, summary, created_at)
select '00000000-0000-0000-0000-000000000001', 'lead_created', id, 'New lead "' || full_name || '" from ' || source::text, created_at
from leads where organization_id = '00000000-0000-0000-0000-000000000001';
