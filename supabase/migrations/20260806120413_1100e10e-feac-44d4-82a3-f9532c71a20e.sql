DROP VIEW IF EXISTS public.public_doctors;

CREATE TABLE public.public_doctor_profiles (
  doctor_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  full_name text NOT NULL,
  specialty text NOT NULL,
  city text,
  experience_years integer NOT NULL DEFAULT 0,
  education text,
  workplace text,
  languages text,
  consultation_fee text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_doctor_profiles TO authenticated;
GRANT ALL ON public.public_doctor_profiles TO service_role;

ALTER TABLE public.public_doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_doctor_profiles_select ON public.public_doctor_profiles
FOR SELECT TO authenticated USING (true);

CREATE TRIGGER public_doctor_profiles_updated
BEFORE UPDATE ON public.public_doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_public_doctor_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'::public.review_status THEN
    INSERT INTO public.public_doctor_profiles (
      doctor_id, application_id, full_name, specialty, city, experience_years,
      education, workplace, languages, consultation_fee, bio
    ) VALUES (
      NEW.doctor_id, NEW.id, NEW.full_name, NEW.specialty, NEW.city, NEW.experience_years,
      NEW.education, NEW.workplace, NEW.languages, NEW.consultation_fee, NEW.bio
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
      bio = EXCLUDED.bio;
  ELSE
    DELETE FROM public.public_doctor_profiles WHERE doctor_id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.sync_public_doctor_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_public_doctor_profile
AFTER INSERT OR UPDATE ON public.doctor_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_public_doctor_profile();

INSERT INTO public.public_doctor_profiles (
  doctor_id, application_id, full_name, specialty, city, experience_years,
  education, workplace, languages, consultation_fee, bio
)
SELECT da.doctor_id, da.id, da.full_name, da.specialty, da.city, da.experience_years,
       da.education, da.workplace, da.languages, da.consultation_fee, da.bio
FROM public.doctor_applications da
WHERE da.status = 'approved'::public.review_status
ON CONFLICT (doctor_id) DO NOTHING;