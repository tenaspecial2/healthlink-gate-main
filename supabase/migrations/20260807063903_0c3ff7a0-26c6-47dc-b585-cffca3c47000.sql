CREATE TABLE public.payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  telegram_username text NOT NULL,
  status public.review_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY payout_select ON public.payout_requests FOR SELECT TO authenticated
  USING (doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY payout_insert_own ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND status = 'pending');

CREATE POLICY payout_admin_update ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payout_requests_doctor ON public.payout_requests (doctor_id);

CREATE TRIGGER payout_requests_updated BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_payout_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      NEW.doctor_id,
      CASE WHEN NEW.status = 'approved' THEN 'Withdrawal approved'
           ELSE 'Withdrawal declined' END,
      COALESCE(NEW.admin_note, CASE WHEN NEW.status = 'approved'
        THEN 'Your withdrawal was sent via Telegram.'
        ELSE 'Your withdrawal request was declined. Contact support for details.' END)
    );
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.notify_payout_decision() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_payout_decision AFTER UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_payout_decision();