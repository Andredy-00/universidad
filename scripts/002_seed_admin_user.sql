-- This script creates an admin user using Supabase Auth
-- Email: admin@universidad.edu
-- Password: 123456789
-- Role: super_admin

-- Note: This script inserts directly into the profiles table.
-- The actual auth user must be created through Supabase Auth API.
-- Run this AFTER creating the user via the signup endpoint or Supabase dashboard.

-- First, we need to create the user through the auth system.
-- Since we can't directly insert into auth.users, we'll create a helper function
-- that will be called after signup to set the admin role.

-- Update the admin user's profile to super_admin role
-- This assumes the user signs up first with email: admin@universidad.edu

-- Create a function to promote a user to super_admin by email
create or replace function public.promote_to_admin(user_email text)
returns void
language plpgsql
security definer
as $$
declare
  user_id uuid;
begin
  -- Get the user id from auth.users
  select id into user_id from auth.users where email = user_email;
  
  if user_id is not null then
    -- Update the profile to super_admin
    update public.profiles 
    set role = 'super_admin', updated_at = now()
    where id = user_id;
  end if;
end;
$$;
