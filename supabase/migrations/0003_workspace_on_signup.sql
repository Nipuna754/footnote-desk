-- Gives every new owner their own workspace the moment they sign up.
-- Paste into Supabase: SQL Editor > New query > Run. Safe to run more than once.

create or replace function public.create_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), 'My help centre'), 80);
  base text := trim(both '-' from regexp_replace(lower(company), '[^a-z0-9]+', '-', 'g'));
begin
  if char_length(base) < 3 then base := 'help'; end if;
  insert into public.workspaces (owner_id, name, slug)
  values (new.id, company, left(base, 30) || '-' || substr(md5(random()::text), 1, 5));
  return new;
end;
$$;

revoke execute on function public.create_workspace_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_workspace_for_new_user();
