-- ── Video testimonials ───────────────────────────────────────────────────
-- Jess is filming homeowners on completed projects (first one: Peach
-- Grove). A recorded homeowner walking through their own house converts
-- harder than any written quote, so testimonials need to carry video.
--
-- Design notes:
--   • Video is ADDITIVE. `quote` stays NOT NULL, so a video testimonial
--     still ships a pull-quote. That is deliberate: the quote is what
--     Google indexes, what renders before the poster loads, and what
--     shows if the video ever fails. Video-only rows would be invisible
--     to search.
--   • `video_poster_url` is separate rather than reusing
--     `author_photo_url` — the avatar is a face crop, the poster is a
--     16:9 frame. Same column would force one to look wrong.
--   • `video_duration_seconds` is stored so the UI can print "2:14"
--     next to the play button without downloading the file to measure
--     it. Nullable; the UI just omits the runtime when it's unknown.

ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS video_duration_seconds SMALLINT
    CHECK (video_duration_seconds IS NULL OR video_duration_seconds > 0);

COMMENT ON COLUMN public.testimonials.video_url IS
  'Public URL of the testimonial video in the testimonial-videos bucket. '
  'NULL for written-only testimonials.';
COMMENT ON COLUMN public.testimonials.video_poster_url IS
  'Poster frame shown before playback. Without it the video card falls '
  'back to a typographic card so we never render a black rectangle.';

-- Partial index for the /reviews page, which leads with video reviews.
CREATE INDEX IF NOT EXISTS idx_testimonials_video_published
  ON public.testimonials (display_order, created_at DESC)
  WHERE status = 'published' AND video_url IS NOT NULL;

-- ── Storage: dedicated public bucket for testimonial video ───────────────
-- 50 MB ceiling matches Supabase's default standard-upload limit; a
-- compressed 1080p testimonial of 1-3 minutes lands well under it. Raw
-- phone footage will not, and should be compressed before upload rather
-- than served at full size to every mobile visitor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'testimonial-videos',
  'testimonial-videos',
  true,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can write testimonial-videos" on storage.objects;
create policy "Admins can write testimonial-videos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'testimonial-videos' and public.is_admin());

drop policy if exists "Admins can update testimonial-videos" on storage.objects;
create policy "Admins can update testimonial-videos"
on storage.objects for update
to authenticated
using (bucket_id = 'testimonial-videos' and public.is_admin())
with check (bucket_id = 'testimonial-videos' and public.is_admin());

drop policy if exists "Admins can delete testimonial-videos" on storage.objects;
create policy "Admins can delete testimonial-videos"
on storage.objects for delete
to authenticated
using (bucket_id = 'testimonial-videos' and public.is_admin());

-- (No SELECT policy on purpose — public buckets serve objects by direct
-- URL without one, and omitting it stops anon from LISTING the bucket
-- via /rest/v1/storage.objects. Same reasoning as construction-photos.)
