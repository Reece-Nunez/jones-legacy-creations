-- Update user_profiles role constraint to support new roles
-- Drop old constraint and add new one with all role options
alter table user_profiles drop constraint if exists user_profiles_role_check;
alter table user_profiles add constraint user_profiles_role_check
  check (role in (
    'technical_director',
    'owner',
    'project_manager',
    'office_manager',
    'office_admin'
  ));

-- Migrate any existing 'admin' roles to 'owner'
update user_profiles set role = 'owner' where role = 'admin';
-- Migrate any existing 'viewer' roles to 'office_admin'
update user_profiles set role = 'office_admin' where role = 'viewer';
