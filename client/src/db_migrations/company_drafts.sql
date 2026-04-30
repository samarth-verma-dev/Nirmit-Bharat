-- Backend-owned draft storage for the Admin "Add Company" onboarding flow.
-- Run this in Supabase SQL Editor before deploying the frontend changes.

create table if not exists public.company_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_kind text not null default 'add_company',
  status text not null default 'active' check (status in ('active', 'submitted', 'discarded')),
  current_step integer not null default 1 check (current_step between 1 and 6),
  form_data jsonb not null default '{}'::jsonb,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create unique index if not exists company_drafts_one_active_per_user_kind
  on public.company_drafts (user_id, draft_kind, status)
  where status = 'active';

create index if not exists company_drafts_user_status_idx
  on public.company_drafts (user_id, status, updated_at desc);

alter table public.company_drafts enable row level security;

grant select, insert, update, delete on public.company_drafts to authenticated;

drop policy if exists "Users can read their own company drafts" on public.company_drafts;
create policy "Users can read their own company drafts"
on public.company_drafts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own company drafts" on public.company_drafts;
create policy "Users can create their own company drafts"
on public.company_drafts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own active company drafts" on public.company_drafts;
create policy "Users can update their own active company drafts"
on public.company_drafts
for update
using (auth.uid() = user_id and status = 'active')
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own company drafts" on public.company_drafts;
create policy "Users can delete their own company drafts"
on public.company_drafts
for delete
using (auth.uid() = user_id);

create or replace function public.set_company_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_drafts_set_updated_at on public.company_drafts;
create trigger company_drafts_set_updated_at
before update on public.company_drafts
for each row
execute function public.set_company_drafts_updated_at();

create or replace function public.finalize_company_draft(p_draft_id uuid)
returns table (
  company_id uuid,
  company_name text,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.company_drafts%rowtype;
  v_company public.companies%rowtype;
  v_form jsonb;
  v_invite_code text;
begin
  select *
  into v_draft
  from public.company_drafts
  where id = p_draft_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active draft not found.';
  end if;

  v_form := v_draft.form_data;
  v_invite_code := coalesce(nullif(v_form->>'inviteCode', ''), 'REVIEW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)));

  if nullif(v_form->>'companyName', '') is null then
    raise exception 'Company name is required.';
  end if;

  insert into public.companies (name, created_by, invite_code)
  values (v_form->>'companyName', v_draft.user_id, v_invite_code)
  returning * into v_company;

  if coalesce((v_form->>'noSystem')::boolean, false) is false then
    insert into public.projects (
      company_id,
      app_name,
      android_package,
      ios_app_id,
      social_handles,
      timeframe,
      alerts_enabled
    )
    values (
      v_company.id,
      nullif(v_form->>'appName', ''),
      nullif(v_form->>'androidPackage', ''),
      nullif(v_form->>'iosAppId', ''),
      coalesce(v_form->'socialSources', '[]'::jsonb),
      coalesce(nullif(v_form->>'timeframe', ''), 'Last 30 days'),
      coalesce((v_form->>'alertsEnabled')::boolean, false)
    );
  end if;

  update public.company_drafts
  set status = 'submitted',
      company_id = v_company.id,
      submitted_at = now()
  where id = v_draft.id;

  company_id := v_company.id;
  company_name := v_company.name;
  invite_code := v_company.invite_code;
  return next;
end;
$$;

grant execute on function public.finalize_company_draft(uuid) to authenticated;
