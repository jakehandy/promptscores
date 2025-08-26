-- Enable UUID generation extension (usually enabled by default on Supabase)
create extension if not exists "pgcrypto";

-- Profiles table (optional, can extend later)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  display_name text
);

alter table public.profiles enable row level security;
create policy "Profiles are viewable by users" on public.profiles for select using (true);
create policy "Users can insert their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Prompts
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text not null,
  tags text[] default '{}'
);

create index if not exists prompts_user_id_idx on public.prompts(user_id);
create index if not exists prompts_type_idx on public.prompts(type);
create index if not exists prompts_tags_gin on public.prompts using gin (tags);

alter table public.prompts enable row level security;
create policy "Prompts readable by everyone" on public.prompts for select using (true);
create policy "Authenticated can insert prompts" on public.prompts for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());
create policy "Owners can update prompts" on public.prompts for update using (auth.uid() = user_id);
create policy "Owners can delete prompts" on public.prompts for delete using (auth.uid() = user_id);

-- Votes (thumbs up)
create table if not exists public.prompt_votes (
  prompt_id uuid references public.prompts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (prompt_id, user_id)
);

create index if not exists prompt_votes_user_idx on public.prompt_votes(user_id);
create index if not exists prompt_votes_prompt_idx on public.prompt_votes(prompt_id);

alter table public.prompt_votes enable row level security;
create policy "Votes readable by everyone" on public.prompt_votes for select using (true);
create policy "Users can vote" on public.prompt_votes for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());
create policy "Users can unvote their own" on public.prompt_votes for delete using (auth.uid() = user_id);

-- Convenience view with counts
create or replace view public.prompts_with_counts as
  select p.*, coalesce(v.count, 0) as vote_count
  from public.prompts p
  left join (
    select prompt_id, count(*)::int as count from public.prompt_votes group by prompt_id
  ) v on v.prompt_id = p.id;

grant select on public.prompts_with_counts to anon, authenticated;

-- Suggested prompt types (UI is pre-listed; this is optional seed)
insert into public.prompts (id, user_id, title, body, type, tags)
  select uuid_generate_v4(), auth.uid(), 'Welcome to Prompt Scores', 'Share your best prompts here!', 'System Prompt', array['welcome','example']
  where false; -- seed example disabled by default
