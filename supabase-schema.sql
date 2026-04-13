-- ============================================================
-- MineOps Database Schema (Fixed)
-- ============================================================

create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'operator' check (role in ('admin', 'manager', 'operator')),
  created_at timestamptz default now()
);

-- Sites
-- manager_email is plain text matching the frontend field
create table public.sites (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  manager_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assets
-- column is "asset_type" (not "type") and "last_maintenance" (not "last_maintenance_date")
create table public.assets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  asset_type text not null default 'other' check (asset_type in ('drill', 'truck', 'excavator', 'crusher', 'conveyor', 'pump', 'generator', 'other')),
  site_id uuid references public.sites(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'maintenance', 'faulty')),
  last_maintenance date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Incidents
-- uses incident_type, report_date, injuries, fatalities, cause,
-- corrective_actions, reported_by_email — severity includes 'high',
-- status includes 'investigating'
create table public.incidents (
  id uuid default uuid_generate_v4() primary key,
  incident_type text not null default 'other',
  description text,
  site_id uuid references public.sites(id) on delete set null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  report_date date not null default current_date,
  injuries integer not null default 0,
  fatalities integer not null default 0,
  cause text,
  corrective_actions text,
  reported_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compliance Issues
create table public.compliance_issues (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  site_id uuid references public.sites(id) on delete set null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Maintenance Logs
create table public.maintenance_logs (
  id uuid default uuid_generate_v4() primary key,
  asset_id uuid references public.assets(id) on delete cascade,
  maintenance_type text not null,
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  notes text,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity Logs
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- Hazard Register
create table public.hazards (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'other' check (category in ('mechanical', 'electrical', 'chemical', 'physical', 'biological', 'ergonomic', 'fire', 'other')),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  control_measures text,
  status text not null default 'active' check (status in ('active', 'mitigated', 'closed')),
  identified_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Near Misses
create table public.near_misses (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete set null,
  description text not null,
  location_detail text,
  potential_severity text not null default 'medium' check (potential_severity in ('low', 'medium', 'high', 'critical')),
  immediate_action text,
  report_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'investigated', 'closed')),
  reported_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Toolbox Talks
create table public.toolbox_talks (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete set null,
  topic text not null,
  talk_date date not null default current_date,
  attendee_count integer not null default 0,
  duration_minutes integer not null default 15,
  notes text,
  conducted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Permits to Work
create table public.permits (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete set null,
  title text not null,
  work_type text not null default 'general' check (work_type in ('hot_work', 'confined_space', 'electrical', 'excavation', 'height', 'general')),
  description text,
  location_detail text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'active', 'completed', 'cancelled')),
  requested_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Production Logs
create table public.production_logs (
  id uuid default uuid_generate_v4() primary key,
  site_id uuid references public.sites(id) on delete set null,
  shift text not null default 'day' check (shift in ('day', 'afternoon', 'night')),
  log_date date not null default current_date,
  tons_extracted numeric(10,2) not null default 0,
  ore_grade numeric(6,3) not null default 0,
  equipment_used text,
  workers_on_shift integer not null default 0,
  cost_per_ton numeric(10,2) not null default 0,
  notes text,
  logged_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Downtime Logs (used by Dashboard)
create table public.downtime_logs (
  id uuid default uuid_generate_v4() primary key,
  asset_id uuid references public.assets(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  reason text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.assets enable row level security;
alter table public.incidents enable row level security;
alter table public.compliance_issues enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.hazards enable row level security;
alter table public.near_misses enable row level security;
alter table public.toolbox_talks enable row level security;
alter table public.permits enable row level security;
alter table public.production_logs enable row level security;
alter table public.downtime_logs enable row level security;

-- Profiles
create policy "Profiles viewable by authenticated" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Sites
create policy "Sites viewable by all" on public.sites for select using (auth.role() = 'authenticated');
create policy "Sites writable by admin/manager" on public.sites for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- Assets
create policy "Assets viewable by all" on public.assets for select using (auth.role() = 'authenticated');
create policy "Assets writable by admin/manager" on public.assets for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- Incidents
create policy "Incidents viewable by all" on public.incidents for select using (auth.role() = 'authenticated');
create policy "Incidents insertable by all" on public.incidents for insert with check (auth.role() = 'authenticated');
create policy "Incidents updatable by admin/manager" on public.incidents for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Incidents deletable by admin" on public.incidents for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Compliance
create policy "Compliance viewable by all" on public.compliance_issues for select using (auth.role() = 'authenticated');
create policy "Compliance insertable by all" on public.compliance_issues for insert with check (auth.role() = 'authenticated');
create policy "Compliance updatable by admin/manager" on public.compliance_issues for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Compliance deletable by admin" on public.compliance_issues for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Maintenance
create policy "Maintenance viewable by all" on public.maintenance_logs for select using (auth.role() = 'authenticated');
create policy "Maintenance insertable by all" on public.maintenance_logs for insert with check (auth.role() = 'authenticated');
create policy "Maintenance updatable by admin/manager" on public.maintenance_logs for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Maintenance deletable by admin" on public.maintenance_logs for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Activity logs
create policy "Activity logs viewable by all" on public.activity_logs for select using (auth.role() = 'authenticated');
create policy "Activity logs insertable by all" on public.activity_logs for insert with check (auth.role() = 'authenticated');

-- Hazards
create policy "Hazards viewable by all" on public.hazards for select using (auth.role() = 'authenticated');
create policy "Hazards insertable by all" on public.hazards for insert with check (auth.role() = 'authenticated');
create policy "Hazards updatable by admin/manager" on public.hazards for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Hazards deletable by admin" on public.hazards for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Near Misses
create policy "NearMisses viewable by all" on public.near_misses for select using (auth.role() = 'authenticated');
create policy "NearMisses insertable by all" on public.near_misses for insert with check (auth.role() = 'authenticated');
create policy "NearMisses updatable by admin/manager" on public.near_misses for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "NearMisses deletable by admin" on public.near_misses for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Toolbox Talks
create policy "Toolbox viewable by all" on public.toolbox_talks for select using (auth.role() = 'authenticated');
create policy "Toolbox insertable by all" on public.toolbox_talks for insert with check (auth.role() = 'authenticated');
create policy "Toolbox updatable by admin/manager" on public.toolbox_talks for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Toolbox deletable by admin" on public.toolbox_talks for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Permits
create policy "Permits viewable by all" on public.permits for select using (auth.role() = 'authenticated');
create policy "Permits insertable by all" on public.permits for insert with check (auth.role() = 'authenticated');
create policy "Permits updatable by admin/manager" on public.permits for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Permits deletable by admin" on public.permits for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Production Logs
create policy "Production viewable by all" on public.production_logs for select using (auth.role() = 'authenticated');
create policy "Production insertable by all" on public.production_logs for insert with check (auth.role() = 'authenticated');
create policy "Production updatable by admin/manager" on public.production_logs for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);
create policy "Production deletable by admin" on public.production_logs for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Downtime Logs
create policy "Downtime viewable by all" on public.downtime_logs for select using (auth.role() = 'authenticated');
create policy "Downtime insertable by all" on public.downtime_logs for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'operator')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE: incident image uploads
-- ============================================================

insert into storage.buckets (id, name, public) values ('incident-images', 'incident-images', true);
create policy "Incident images uploadable by authenticated" on storage.objects for insert with check (bucket_id = 'incident-images' and auth.role() = 'authenticated');
create policy "Incident images viewable by all" on storage.objects for select using (bucket_id = 'incident-images');
