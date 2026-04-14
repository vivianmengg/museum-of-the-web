-- Run this in your Supabase project SQL editor

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  is_anonymous boolean default false not null,
  onboarded boolean default false not null,
  created_at timestamptz default now() not null
);
alter table public.users enable row level security;
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- Traces
create table public.traces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  object_id text not null,        -- e.g. "met-123456"
  institution text not null,      -- "met" | "aic"
  text text not null check (char_length(text) <= 280),
  created_at timestamptz default now() not null
);
alter table public.traces enable row level security;
create policy "Traces are viewable by everyone" on public.traces for select using (true);
create policy "Signed-in users can insert traces" on public.traces for insert with check (auth.uid() = user_id);
create policy "Users can delete their own traces" on public.traces for delete using (auth.uid() = user_id);
create index traces_object_id_idx on public.traces(object_id);

-- Exhibits
create table public.exhibits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  statement text check (char_length(statement) <= 500),
  is_public boolean default false not null,
  is_featured boolean default false not null,
  created_at timestamptz default now() not null
);
alter table public.exhibits enable row level security;
create policy "Featured exhibits are viewable by everyone" on public.exhibits for select using (is_featured = true or auth.uid() = user_id);
create policy "Signed-in users can create exhibits" on public.exhibits for insert with check (auth.uid() = user_id);
create policy "Users can update their own exhibits" on public.exhibits for update using (auth.uid() = user_id);
create policy "Users can delete their own exhibits" on public.exhibits for delete using (auth.uid() = user_id);

-- Exhibit objects
create table public.exhibit_objects (
  id uuid default gen_random_uuid() primary key,
  exhibit_id uuid references public.exhibits(id) on delete cascade not null,
  object_id text not null,
  institution text not null,
  curator_note text,
  position integer not null,
  unique(exhibit_id, position)
);
alter table public.exhibit_objects enable row level security;
create policy "Exhibit objects are viewable by everyone" on public.exhibit_objects for select using (true);
create policy "Exhibit owners can manage objects" on public.exhibit_objects for all using (
  auth.uid() = (select user_id from public.exhibits where id = exhibit_id)
);
