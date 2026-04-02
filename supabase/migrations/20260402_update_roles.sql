-- Update user_profiles role constraint to support new roles
-- First drop the old constraint so we can migrate data freely
alter table user_profiles drop constraint if exists user_profiles_role_check;

-- Migrate existing data to new role values BEFORE adding the new constraint
update user_profiles set role = 'owner' where role = 'admin';
update user_profiles set role = 'office_admin' where role = 'viewer';

-- Now add the new constraint
alter table user_profiles add constraint user_profiles_role_check
  check (role in (
    'technical_director',
    'owner',
    'project_manager',
    'office_manager',
    'office_admin'
  ));
