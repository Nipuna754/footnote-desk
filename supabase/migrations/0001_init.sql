-- Footnote Desk database. Paste into Supabase: SQL Editor > New query > Run.
-- Safe to run once on a fresh project.

create extension if not exists vector with schema extensions;

-- One workspace per owner. The demo workspace (Aerin Home) has no owner.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  pages int,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  page int not null,
  content text not null,
  embedding extensions.vector(768) not null
);

create index chunks_embedding_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index chunks_workspace_idx on public.chunks (workspace_id);

create table public.questions (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  question text not null,
  answered boolean not null,
  citations jsonb not null default '[]',
  ip_hash text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index questions_workspace_idx on public.questions (workspace_id, created_at desc);
create index questions_ip_idx on public.questions (ip_hash, created_at desc);

-- Row-level security on every table. Owners see only their own workspace.
-- Visitors never query tables directly: the chat goes through the server.
alter table public.workspaces enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.questions enable row level security;

create policy "owner reads own workspace" on public.workspaces
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner renames own workspace" on public.workspaces
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owner manages own documents" on public.documents
  for all to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())))
  with check (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

create policy "owner reads own chunks" on public.chunks
  for select to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

create policy "owner reads own questions" on public.questions
  for select to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));
create policy "owner marks own questions handled" on public.questions
  for update to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())))
  with check (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

-- Plan changes only come from the Stripe webhook (service role), never the browser.
-- (A column-level revoke can't override the table grant, so revoke the table
-- grant and give back only the columns owners may edit.)
revoke insert, update, delete on public.workspaces from anon, authenticated;
grant update (name) on public.workspaces to authenticated;
revoke update on public.questions from anon, authenticated;
grant update (handled) on public.questions to authenticated;

-- Vector search, scoped to one workspace. Called by the server only.
create function public.match_chunks(
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
  from chunks c
  join documents d on d.id = c.document_id
  where c.workspace_id = p_workspace and d.status = 'ready'
  order by c.embedding <=> p_embedding
  limit p_count;
$$;

revoke execute on function public.match_chunks from public, anon, authenticated;

-- Private file storage. Files live under <workspace id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'text/plain', 'text/markdown']);

create policy "owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );
create policy "owner reads own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );
create policy "owner deletes own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in
      (select id::text from public.workspaces where owner_id = (select auth.uid()))
  );
