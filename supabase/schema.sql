-- Enable UUID generation extension (usually enabled by default on Supabase)
create extension if not exists "pgcrypto";

-- Profiles table (optional, can extend later)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  display_name text
);

alter table public.profiles enable row level security;
drop policy if exists "Profiles are viewable by users" on public.profiles;
create policy "Profiles are viewable by users" on public.profiles for select using (true);
drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Ensure display_name uniqueness (case-insensitive) and track last change timestamp
alter table public.profiles
  add column if not exists display_name_last_changed_at timestamp with time zone default now();

-- Unique index on lower(display_name), allow multiple NULLs
create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name))
  where display_name is not null;

-- Enforce 30-day cooldown between display_name changes and update last_changed_at
create or replace function public.enforce_display_name_constraints()
returns trigger
language plpgsql
security definer
as $$
begin
  if (coalesce(new.display_name, '') is distinct from coalesce(old.display_name, '')) then
    -- Prevent changes if within 30 days of last change
    if old.display_name_last_changed_at is not null
       and (now() - old.display_name_last_changed_at) < interval '30 days' then
      raise exception using message = 'You can only change your display name every 30 days. '
        || 'Try again on ' || to_char(old.display_name_last_changed_at + interval '30 days', 'YYYY-MM-DD');
    end if;

    -- Optionally provide a nicer message for uniqueness before hitting the index
    if new.display_name is not null and exists (
      select 1 from public.profiles p
      where p.id <> old.id and lower(p.display_name) = lower(new.display_name)
    ) then
      raise exception using message = 'That display name is already taken.';
    end if;

    new.display_name_last_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_display_name_constraints on public.profiles;
create trigger trg_enforce_display_name_constraints
before update on public.profiles
for each row execute function public.enforce_display_name_constraints();

-- Automatically create a profile for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  begin
    insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce((new.raw_user_meta_data ->> 'display_name'), new.email)
    )
    on conflict (id)
    do nothing;
  exception when unique_violation then
    -- Fallback: if desired display_name/email collides with another profile,
    -- create the profile with a null display_name to avoid failing signup.
    insert into public.profiles (id, display_name)
    values (new.id, null)
    on conflict (id)
    do nothing;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
drop policy if exists "Prompts readable by everyone" on public.prompts;
create policy "Prompts readable by everyone" on public.prompts for select using (true);
drop policy if exists "Authenticated can insert prompts" on public.prompts;
create policy "Authenticated can insert prompts" on public.prompts for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());
drop policy if exists "Owners can update prompts" on public.prompts;
create policy "Owners can update prompts" on public.prompts for update using (auth.uid() = user_id);
drop policy if exists "Owners can delete prompts" on public.prompts;
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
drop policy if exists "Votes readable by everyone" on public.prompt_votes;
create policy "Votes readable by everyone" on public.prompt_votes for select using (true);
drop policy if exists "Users can vote" on public.prompt_votes;
create policy "Users can vote" on public.prompt_votes for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());
drop policy if exists "Users can unvote their own" on public.prompt_votes;
create policy "Users can unvote their own" on public.prompt_votes for delete using (auth.uid() = user_id);

-- Convenience view with counts + author display name
create or replace view public.prompts_with_counts as
  select
    p.*,
    coalesce(v.count, 0) as vote_count,
    prof.display_name as author_display_name
  from public.prompts p
  left join (
    select prompt_id, count(*)::int as count from public.prompt_votes group by prompt_id
  ) v on v.prompt_id = p.id
  left join public.profiles prof on prof.id = p.user_id;

grant select on public.prompts_with_counts to anon, authenticated;

-- Per-profile metrics and percentiles across all profiles
create or replace view public.profile_metrics as
with prompts_by_user as (
  select user_id, count(*)::int as prompts_created
  from public.prompts
  group by user_id
), votes_received_by_user as (
  select p.user_id, count(v.*)::int as votes_received
  from public.prompt_votes v
  join public.prompts p on p.id = v.prompt_id
  group by p.user_id
), votes_given_by_user as (
  select user_id, count(*)::int as votes_given
  from public.prompt_votes
  group by user_id
), metrics as (
  select
    pr.id as user_id,
    coalesce(pb.prompts_created, 0) as prompts_created,
    coalesce(vrb.votes_received, 0) as votes_received,
    coalesce(vgb.votes_given, 0) as votes_given
  from public.profiles pr
  left join prompts_by_user pb on pb.user_id = pr.id
  left join votes_received_by_user vrb on vrb.user_id = pr.id
  left join votes_given_by_user vgb on vgb.user_id = pr.id
)
select
  user_id,
  prompts_created,
  votes_received,
  votes_given,
  round(100 * cume_dist() over (order by prompts_created))::int as prompts_percentile,
  round(100 * cume_dist() over (order by votes_received))::int as votes_received_percentile,
  round(100 * cume_dist() over (order by votes_given))::int as votes_given_percentile
from metrics;

grant select on public.profile_metrics to anon, authenticated;

-- Suggested prompt types (UI is pre-listed; this is optional seed)
insert into public.prompts (id, user_id, title, body, type, tags)
  select uuid_generate_v4(), auth.uid(), 'Welcome to Prompt Scores', 'Share your best prompts here!', 'Global Instruction', array['welcome','example']
  where false; -- seed example disabled by default
