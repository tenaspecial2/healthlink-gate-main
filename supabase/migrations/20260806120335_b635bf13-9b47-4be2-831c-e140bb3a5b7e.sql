-- 1) Restrict doctor_applications SELECT to owner / admin / shared consultation
DROP POLICY IF EXISTS doctor_app_select ON public.doctor_applications;
CREATE POLICY doctor_app_select ON public.doctor_applications
FOR SELECT TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.shares_consultation(auth.uid(), doctor_id)
);

-- 2) Safe public directory of approved doctors (no phone/email/license/certificate)
CREATE OR REPLACE VIEW public.public_doctors
WITH (security_invoker = false) AS
SELECT
  da.id,
  da.doctor_id,
  da.full_name,
  da.specialty,
  da.city,
  da.experience_years,
  da.education,
  da.workplace,
  da.languages,
  da.consultation_fee,
  da.bio,
  da.created_at
FROM public.doctor_applications da
WHERE da.status = 'approved'::public.review_status;

REVOKE ALL ON public.public_doctors FROM anon;
GRANT SELECT ON public.public_doctors TO authenticated;

-- 3) Notifications: no client-side insert/delete
REVOKE INSERT, DELETE, TRUNCATE ON public.notifications FROM authenticated;
REVOKE ALL ON public.notifications FROM anon;

-- 4) Trigger-only SECURITY DEFINER functions must not be callable by users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_consultation_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_doctor_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;