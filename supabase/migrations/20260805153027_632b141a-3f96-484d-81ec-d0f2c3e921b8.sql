CREATE OR REPLACE FUNCTION public.shares_consultation(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE (c.patient_id = _a AND c.doctor_id = _b)
       OR (c.patient_id = _b AND c.doctor_id = _a)
  )
$$;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.shares_consultation(auth.uid(), id)
);

ALTER TABLE public.messages REPLICA IDENTITY FULL;