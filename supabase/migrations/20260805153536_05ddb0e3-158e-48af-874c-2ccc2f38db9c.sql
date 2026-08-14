CREATE OR REPLACE FUNCTION public.notify_doctor_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      NEW.doctor_id,
      CASE WHEN NEW.status = 'approved' THEN 'Your doctor account was approved'
           ELSE 'Your doctor application was declined' END,
      COALESCE(NEW.admin_note, CASE WHEN NEW.status = 'approved'
        THEN 'Patients can now find you in search and start consultations.'
        ELSE 'Please review your details and contact support if you believe this is a mistake.' END)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_doctor_decision ON public.doctor_applications;
CREATE TRIGGER trg_notify_doctor_decision
AFTER UPDATE ON public.doctor_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_doctor_decision();

CREATE OR REPLACE FUNCTION public.notify_consultation_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      NEW.patient_id,
      CASE WHEN NEW.status = 'approved' THEN 'Payment approved — chat unlocked'
           ELSE 'Payment could not be verified' END,
      COALESCE(NEW.admin_note, CASE WHEN NEW.status = 'approved'
        THEN 'Your consultation is active. Open the chat to talk with your doctor.'
        ELSE 'Please check your payment details and submit the request again.' END)
    );
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, body)
      VALUES (NEW.doctor_id, 'New patient consultation', 'A patient consultation was approved. Open your portal to start chatting.');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_consultation_decision ON public.consultations;
CREATE TRIGGER trg_notify_consultation_decision
AFTER UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.notify_consultation_decision();

REVOKE ALL ON FUNCTION public.notify_doctor_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_consultation_decision() FROM PUBLIC, anon, authenticated;