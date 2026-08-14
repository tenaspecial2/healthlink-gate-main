-- 1. Chat attachments
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

-- 2. Doctor extras: schedule + avatar
ALTER TABLE public.doctor_applications
  ADD COLUMN IF NOT EXISTS schedule text,
  ADD COLUMN IF NOT EXISTS avatar_path text;

ALTER TABLE public.public_doctor_profiles
  ADD COLUMN IF NOT EXISTS schedule text,
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_public_doctor_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'::public.review_status THEN
    INSERT INTO public.public_doctor_profiles (
      doctor_id, application_id, full_name, specialty, city, experience_years,
      education, workplace, languages, consultation_fee, bio, schedule, avatar_path
    ) VALUES (
      NEW.doctor_id, NEW.id, NEW.full_name, NEW.specialty, NEW.city, NEW.experience_years,
      NEW.education, NEW.workplace, NEW.languages, NEW.consultation_fee, NEW.bio,
      NEW.schedule, NEW.avatar_path
    )
    ON CONFLICT (doctor_id) DO UPDATE SET
      application_id = EXCLUDED.application_id,
      full_name = EXCLUDED.full_name,
      specialty = EXCLUDED.specialty,
      city = EXCLUDED.city,
      experience_years = EXCLUDED.experience_years,
      education = EXCLUDED.education,
      workplace = EXCLUDED.workplace,
      languages = EXCLUDED.languages,
      consultation_fee = EXCLUDED.consultation_fee,
      bio = EXCLUDED.bio,
      schedule = EXCLUDED.schedule,
      avatar_path = EXCLUDED.avatar_path;
  ELSE
    DELETE FROM public.public_doctor_profiles WHERE doctor_id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END $function$;

-- 3. Doctors may edit their own application at any time, but not privileged fields
DROP POLICY IF EXISTS doctor_app_update_own_pending ON public.doctor_applications;
DROP POLICY IF EXISTS doctor_app_update_own ON public.doctor_applications;
CREATE POLICY doctor_app_update_own ON public.doctor_applications
  FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_doctor_application_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.admin_note := OLD.admin_note;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.license_number := OLD.license_number;
  NEW.doctor_id := OLD.doctor_id;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.guard_doctor_application_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_doctor_application_update() FROM anon;
REVOKE ALL ON FUNCTION public.guard_doctor_application_update() FROM authenticated;

DROP TRIGGER IF EXISTS trg_guard_doctor_application_update ON public.doctor_applications;
CREATE TRIGGER trg_guard_doctor_application_update
  BEFORE UPDATE ON public.doctor_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_doctor_application_update();

-- 4. Presence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_presence()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
  UPDATE public.public_doctor_profiles SET last_seen_at = now() WHERE doctor_id = auth.uid();
END $function$;

REVOKE ALL ON FUNCTION public.touch_presence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_presence() FROM anon;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- 5. Ratings
CREATE TABLE IF NOT EXISTS public.doctor_ratings (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consultation_id, patient_id)
);

GRANT SELECT, INSERT, UPDATE ON public.doctor_ratings TO authenticated;
GRANT ALL ON public.doctor_ratings TO service_role;

ALTER TABLE public.doctor_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ratings_select ON public.doctor_ratings;
CREATE POLICY ratings_select ON public.doctor_ratings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ratings_insert_own ON public.doctor_ratings;
CREATE POLICY ratings_insert_own ON public.doctor_ratings
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() AND public.can_access_consultation(consultation_id, auth.uid()));
DROP POLICY IF EXISTS ratings_update_own ON public.doctor_ratings;
CREATE POLICY ratings_update_own ON public.doctor_ratings
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

DROP TRIGGER IF EXISTS doctor_ratings_updated ON public.doctor_ratings;
CREATE TRIGGER doctor_ratings_updated BEFORE UPDATE ON public.doctor_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_rating()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stars < 1 OR NEW.stars > 5 THEN
    RAISE EXCEPTION 'stars must be between 1 and 5';
  END IF;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.validate_rating() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_rating() FROM anon;
REVOKE ALL ON FUNCTION public.validate_rating() FROM authenticated;

DROP TRIGGER IF EXISTS trg_validate_rating ON public.doctor_ratings;
CREATE TRIGGER trg_validate_rating BEFORE INSERT OR UPDATE ON public.doctor_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

-- 6. Security questions (answers hashed, never readable by clients)
CREATE TABLE IF NOT EXISTS public.security_questions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  q1 text not null, a1 text not null,
  q2 text not null, a2 text not null,
  q3 text not null, a3 text not null,
  q4 text not null, a4 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT ALL ON public.security_questions TO service_role;

ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: only trusted server code touches this table.

DROP TRIGGER IF EXISTS security_questions_updated ON public.security_questions;
CREATE TRIGGER security_questions_updated BEFORE UPDATE ON public.security_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Storage policies for chat media and avatars
DROP POLICY IF EXISTS chat_media_select ON storage.objects;
CREATE POLICY chat_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      public.can_access_consultation((split_part(name, '/', 1))::uuid, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS chat_media_insert ON storage.objects;
CREATE POLICY chat_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND public.can_access_consultation((split_part(name, '/', 1))::uuid, auth.uid())
  );

DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_write_own ON storage.objects;
CREATE POLICY avatars_write_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);