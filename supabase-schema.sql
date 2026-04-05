-- Run this in your Supabase SQL editor to set up the schema

create table if not exists articles (
  id           uuid primary key default gen_random_uuid(),
  guid         text unique not null,
  title        text not null,
  url          text not null,
  source_name  text not null,
  source_url   text not null,
  published_at timestamptz not null,
  summary      text,
  tags         text[] default '{}',
  heat_score   float8 not null default 0,
  created_at   timestamptz default now()
);

create index if not exists articles_heat_score_idx on articles (heat_score desc);
create index if not exists articles_published_at_idx on articles (published_at desc);

-- Allow anonymous reads (required for the Next.js frontend with anon key)
alter table articles enable row level security;

create policy "Public read access"
  on articles for select
  using (true);

-- Allow service role full access (used by the crawler)
-- The service_role key bypasses RLS by default in Supabase, but this
-- explicit policy ensures compatibility across all client configurations.
create policy "Service role full access"
  on articles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
