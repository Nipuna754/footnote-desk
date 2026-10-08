-- Finishes the setup from 0001 if it stopped partway. Safe to run more than once.
-- Paste into Supabase: SQL Editor > New query > Run.

alter table public.workspaces enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.questions enable row level security;

drop policy if exists "owner reads own workspace" on public.workspaces;
create policy "owner reads own workspace" on public.workspaces
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "owner renames own workspace" on public.workspaces;
create policy "owner renames own workspace" on public.workspaces
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owner manages own documents" on public.documents;
create policy "owner manages own documents" on public.documents
  for all to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())))
  with check (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

drop policy if exists "owner reads own chunks" on public.chunks;
create policy "owner reads own chunks" on public.chunks
  for select to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

drop policy if exists "owner reads own questions" on public.questions;
create policy "owner reads own questions" on public.questions
  for select to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));
drop policy if exists "owner marks own questions handled" on public.questions;
create policy "owner marks own questions handled" on public.questions
  for update to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())))
  with check (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

revoke insert, update, delete on public.workspaces from anon, authenticated;
grant update (name) on public.workspaces to authenticated;
revoke update on public.questions from anon, authenticated;
grant update (handled) on public.questions to authenticated;

create or replace function public.match_chunks(
  p_workspace uuid,
  p_embedding extensions.vector(768),
  p_count int default 6
)
returns table (id bigint, document_id uuid, file_name text, page int, content text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.document_id, d.file_name, c.page, c.content,
         1 - (c.embedding <=> p_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.workspace_id = p_workspace and d.status = 'ready'
  order by c.embedding <=> p_embedding
  limit p_count;
$$;

revoke execute on function public.match_chunks(uuid, extensions.vector, int) from public, anon, authenticated;
grant execute on function public.match_chunks(uuid, extensions.vector, int) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'text/plain', 'text/markdown'])
on conflict (id) do nothing;

drop policy if exists "owner uploads to own folder" on storage.objects;
create policy "owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );
drop policy if exists "owner reads own files" on storage.objects;
create policy "owner reads own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );
drop policy if exists "owner deletes own files" on storage.objects;
create policy "owner deletes own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );

-- Tell the API to pick up the new function straight away.
notify pgrst, 'reload schema';
