-- Drop existing policies that cause infinite recursion
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

-- Create a security definer function to check admin role (avoids RLS recursion)
create or replace function public.is_super_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'super_admin'
  );
$$;

-- Policy: Users can view their own profile OR super admins can view all
create policy "profiles_select_policy"
  on public.profiles for select
  using (
    auth.uid() = id 
    OR public.is_super_admin(auth.uid())
  );

-- Policy: Users can update their own profile
create policy "profiles_update_policy"
  on public.profiles for update
  using (auth.uid() = id);

-- Policy: Users can insert their own profile
create policy "profiles_insert_policy"
  on public.profiles for insert
  with check (auth.uid() = id);
