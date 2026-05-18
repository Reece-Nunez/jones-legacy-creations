-- Public buckets in Supabase serve objects via direct URL without a SELECT
-- policy. The broad SELECT policies on avatars and real-estate-photos let
-- anon LIST every object in those buckets via /rest/v1/storage.objects
-- queries, which isn't useful and slightly expands the attack surface.
-- Direct URL fetches keep working.

drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Real-estate photos public read" on storage.objects;
