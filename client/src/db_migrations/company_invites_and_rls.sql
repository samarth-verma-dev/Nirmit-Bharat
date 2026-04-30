-- Production invite flow and tenant isolation.
-- Run in Supabase SQL Editor after confirming the base tables exist.

create extension if not exists pgcrypto;

alter table public.companies
  add column if not exists invite_token_hash text,
  add column if not exists invite_token_expires_at timestamptz;

alter table public.invites
  add column if not exists invite_token_hash text,
  add column if not exists sent_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists used_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.analytics_summaries
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.support_tickets
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

create index if not exists companies_invite_token_hash_idx
  on public.companies (invite_token_hash);

create index if not exists invites_company_status_idx
  on public.invites (company_id, status, created_at desc);

create index if not exists invites_token_email_idx
  on public.invites (invite_token_hash, lower(email));

create index if not exists analytics_summaries_company_created_idx
  on public.analytics_summaries (company_id, created_at desc);

create index if not exists support_tickets_company_created_idx
  on public.support_tickets (company_id, created_at desc);

create or replace function public.current_user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.created_by = auth.uid()
  union
  select e.company_id
  from public.employees e
  where e.user_id = auth.uid();
$$;

grant execute on function public.current_user_company_ids() to authenticated;

create or replace function public.get_my_workspace()
returns table (
  role text,
  company_id uuid,
  company_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 'employee'::text, e.company_id, c.name
  from public.employees e
  join public.companies c on c.id = e.company_id
  where e.user_id = auth.uid()
  order by e.created_at asc nulls last
  limit 1;

  if found then
    return;
  end if;

  return query
  select 'admin'::text, c.id, c.name
  from public.companies c
  where c.created_by = auth.uid()
  order by c.created_at asc nulls last
  limit 1;

  if found then
    return;
  end if;

  role := 'admin';
  company_id := null;
  company_name := null;
  return next;
end;
$$;

grant execute on function public.get_my_workspace() to authenticated;

create or replace function public.create_company_invites(
  p_company_id uuid,
  p_emails text[],
  p_app_origin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_company public.companies%rowtype;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_origin text := coalesce(nullif(trim(p_app_origin), ''), 'http://localhost:5173');
  v_email text;
  v_emails text[] := array[]::text[];
begin
  select *
  into v_company
  from public.companies
  where id = p_company_id
    and created_by = auth.uid()
  for update;

  if not found then
    raise exception 'Company not found or not owned by current user.';
  end if;

  if p_emails is null or cardinality(p_emails) = 0 then
    raise exception 'At least one email is required.';
  end if;

  if v_company.invite_token_hash is null
     or v_company.invite_token_expires_at is null
     or v_company.invite_token_expires_at <= now() then
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_expires_at := now() + interval '72 hours';

    update public.companies
    set invite_token_hash = v_token_hash,
        invite_token_expires_at = v_expires_at
    where id = p_company_id;
  else
    v_token := null;
    v_token_hash := v_company.invite_token_hash;
    v_expires_at := v_company.invite_token_expires_at;
  end if;

  if v_token is null then
    -- Existing active tokens are hashed only. Rotate to produce a sendable link.
    v_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_expires_at := now() + interval '72 hours';

    update public.companies
    set invite_token_hash = v_token_hash,
        invite_token_expires_at = v_expires_at
    where id = p_company_id;
  end if;

  foreach v_email in array p_emails loop
    v_email := lower(trim(v_email));
    if v_email = '' or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Invalid invite email: %', v_email;
    end if;

    v_emails := array_append(v_emails, v_email);

    insert into public.invites (
      email,
      company_id,
      invite_code,
      invite_token_hash,
      status,
      expires_at,
      sent_at
    )
    values (
      v_email,
      p_company_id,
      coalesce(v_company.invite_code, 'EMAIL-LINK'),
      v_token_hash,
      'pending',
      v_expires_at,
      now()
    )
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'company_id', p_company_id,
    'company_name', v_company.name,
    'email_count', cardinality(v_emails),
    'emails', v_emails,
    'expires_at', v_expires_at,
    'invite_url', rtrim(v_origin, '/') || '/join?token=' || v_token
  );
end;
$$;

grant execute on function public.create_company_invites(uuid, text[], text) to authenticated;

create or replace function public.validate_company_invite_token(
  p_token text,
  p_email text default null
)
returns table (
  company_id uuid,
  company_name text,
  status text,
  expires_at timestamptz,
  registered boolean
)
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_hash text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  return query
  select
    c.id,
    c.name,
    case
      when c.invite_token_expires_at <= now() then 'expired'
      when v_email <> '' and not exists (
        select 1
        from public.invites i
        where i.company_id = c.id
          and i.invite_token_hash = v_hash
          and lower(i.email) = v_email
          and i.status = 'pending'
      ) then 'not_invited'
      else 'pending'
    end::text,
    c.invite_token_expires_at,
    case
      when v_email = '' then false
      else exists (select 1 from auth.users u where lower(u.email) = v_email)
    end
  from public.companies c
  where c.invite_token_hash = v_hash
  limit 1;
end;
$$;

grant execute on function public.validate_company_invite_token(text, text) to anon, authenticated;

create or replace function public.accept_company_invite(p_token text)
returns table (
  company_id uuid,
  company_name text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_email text;
  v_company public.companies%rowtype;
begin
  select lower(email)
  into v_email
  from auth.users
  where id = auth.uid();

  if v_email is null then
    raise exception 'Authenticated user email not found.';
  end if;

  select *
  into v_company
  from public.companies
  where invite_token_hash = v_hash
    and invite_token_expires_at > now();

  if not found then
    raise exception 'Invite link is invalid or expired.';
  end if;

  if not exists (
    select 1
    from public.invites i
    where i.company_id = v_company.id
      and i.invite_token_hash = v_hash
      and lower(i.email) = v_email
      and i.status = 'pending'
      and (i.expires_at is null or i.expires_at > now())
  ) then
    raise exception 'This email is not pending for this invite.';
  end if;

  insert into public.employees (user_id, company_id, role)
  values (auth.uid(), v_company.id, 'employee')
  on conflict do nothing;

  update public.invites
  set status = 'used',
      used_at = now(),
      used_by = auth.uid(),
      updated_at = now()
  where company_id = v_company.id
    and invite_token_hash = v_hash
    and lower(email) = v_email
    and status = 'pending';

  company_id := v_company.id;
  company_name := v_company.name;
  return next;
end;
$$;

grant execute on function public.accept_company_invite(text) to authenticated;

alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.invites enable row level security;
alter table public.projects enable row level security;
alter table public.analytics_summaries enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "Allow public read access to invites" on public.invites;

drop policy if exists "Company owners can manage companies" on public.companies;
create policy "Company owners can manage companies"
on public.companies
for all
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Members can read their company" on public.companies;
create policy "Members can read their company"
on public.companies
for select
using (id in (select public.current_user_company_ids()));

drop policy if exists "Admins can read company employees" on public.employees;
create policy "Admins can read company employees"
on public.employees
for select
using (
  user_id = auth.uid()
  or company_id in (select id from public.companies where created_by = auth.uid())
);

drop policy if exists "Employees can be added by invite RPC" on public.employees;
create policy "Employees can be added by invite RPC"
on public.employees
for insert
with check (user_id = auth.uid());

drop policy if exists "Admins can manage company invites" on public.invites;
create policy "Admins can manage company invites"
on public.invites
for all
using (company_id in (select id from public.companies where created_by = auth.uid()))
with check (company_id in (select id from public.companies where created_by = auth.uid()));

drop policy if exists "Members can read company projects" on public.projects;
create policy "Members can read company projects"
on public.projects
for select
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Admins can manage company projects" on public.projects;
create policy "Admins can manage company projects"
on public.projects
for all
using (company_id in (select id from public.companies where created_by = auth.uid()))
with check (company_id in (select id from public.companies where created_by = auth.uid()));

drop policy if exists "Members can read company analytics" on public.analytics_summaries;
create policy "Members can read company analytics"
on public.analytics_summaries
for select
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Members can read company tickets" on public.support_tickets;
create policy "Members can read company tickets"
on public.support_tickets
for select
using (company_id in (select public.current_user_company_ids()));
