-- Validate an employee join attempt without exposing invite/company tables publicly.
-- Email-specific invites still take precedence, including used/expired status.
-- If no email invite exists, a valid company invite_code acts as a workspace code.

create or replace function public.validate_workspace_invite_code(
  p_invite_code text,
  p_email text
)
returns table (
  invite_id uuid,
  company_id uuid,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_invite_code));
  v_email text := lower(trim(p_email));
begin
  return query
  select i.id, i.company_id, i.status::text, i.expires_at
  from public.invites i
  where upper(i.invite_code) = v_code
    and lower(i.email) = v_email
  order by case when i.status = 'pending' then 0 else 1 end
  limit 1;

  if found then
    return;
  end if;

  return query
  select null::uuid, c.id, 'workspace_code'::text, null::timestamptz
  from public.companies c
  where upper(c.invite_code) = v_code
  limit 1;
end;
$$;

grant execute on function public.validate_workspace_invite_code(text, text) to anon, authenticated;
