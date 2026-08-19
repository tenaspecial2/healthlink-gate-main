-- ==============================================================================
-- TENA SPECIAL / HEALTHLINK COMPREHENSIVE DATABASE SCHEMA MIGRATION (FIXED)
-- ==============================================================================

-- 1. Bot Settings Table & Columns
CREATE TABLE IF NOT EXISTS public.bot_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Ensure label and category columns exist if the table was created previously
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Insert or update default configurations
INSERT INTO public.bot_settings (key, value, label, category, description) VALUES
  ('cbe_account', '1000255631865', 'CBE Account Number', 'payments', 'Commercial Bank of Ethiopia account number'),
  ('telebirr_account', '0908343267', 'Telebirr Account Number', 'payments', 'Telebirr phone number for mobile payments'),
  ('account_holder', 'Tazebachew Wudie', 'Account Holder Name', 'payments', 'Full name on CBE / Telebirr accounts'),
  ('admin_group_id', '-5373266757', 'Admin Telegram Group ID', 'telegram', 'Telegram group chat ID for receipt forwards and alerts'),
  ('free_channel', 'https://t.me/tenachinfree', 'Free Channel URL', 'telegram', 'Public channel for free health education'),
  ('premium_channel', 'https://t.me/tenachinpremium', 'Premium Channel URL', 'telegram', 'Exclusive channel for premium subscribers'),
  ('free_group', 'https://t.me/+UXHaDU3GIudlY2U0', 'Free Discussion Group URL', 'telegram', 'Community support discussion group'),
  ('support_phone_1', '+251 90 834 3267', 'Support Phone 1', 'support', 'Primary helpline number'),
  ('support_phone_2', '0967449552', 'Support Phone 2', 'support', 'Secondary helpline number'),
  ('support_username', '@tenachinbottelemedicine', 'Support Telegram Username', 'support', 'Support representative handle'),
  ('premium_price', '24', 'Premium Channel Fee (ETB/mo)', 'pricing', 'Monthly subscription fee for the premium channel'),
  ('commission_pct', '10', 'Platform Commission (%)', 'pricing', 'Percentage deducted from doctor consultations and services'),
  ('website_url', 'https://healthlink-gate-main-nine.vercel.app/', 'Portal Website URL', 'general', 'Official telemedicine website address')
ON CONFLICT (key) DO UPDATE 
SET label = EXCLUDED.label,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 2. Digital Store Products Table (Managed from Admin Panel)
CREATE TABLE IF NOT EXISTS public.bot_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  specialty text NOT NULL DEFAULT 'internal',
  file_type text NOT NULL DEFAULT 'pdf',
  price numeric NOT NULL DEFAULT 200,
  description text DEFAULT '',
  download_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed initial digital products if empty
INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'የደም ግፊት መከላከያ (Hypertension Guide)', 'internal', 'pdf', 200, 'Comprehensive guide on blood pressure management and prevention.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%ደም ግፊት%');

INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'የስኳር በሽታ አያያዝ (Diabetes Management)', 'internal', 'pdf', 300, 'Practical handbook on diabetes care, diet, and glucose control.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%ስኳር%');

INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'OBGYN Medical Guide (PDF)', 'obgyn', 'pdf', 300, 'Clinical reference guide for obstetrics and gynecology.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%OBGYN Medical Guide%');

INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'OBGYN Video Masterclass', 'obgyn', 'video', 500, 'Specialist video lecture series covering maternal care and reproductive health.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%OBGYN Video Masterclass%');

INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'የእርግዝና እንክብካቤ (Pregnancy Care)', 'obgyn', 'pdf', 250, 'Step-by-step prenatal care guide for expecting mothers.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%የእርግዝና እንክብካቤ%');

INSERT INTO public.bot_products (title, specialty, file_type, price, description, is_active)
SELECT 'የሕፃናት ምግብና እድገት (Child Nutrition & Growth)', 'peds', 'pdf', 200, 'Essential infant nutrition and milestone tracking handbook.', true
WHERE NOT EXISTS (SELECT 1 FROM public.bot_products WHERE title LIKE '%የሕፃናት ምግብና እድገት%');

-- 3. Bot Transactions Table (Receipts, Platform Commissions & Doctor Earnings)
CREATE TABLE IF NOT EXISTS public.bot_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_telegram_id bigint,
  doctor_name text DEFAULT 'Platform',
  item_type text NOT NULL,
  item_title text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  user_id bigint NOT NULL,
  status text DEFAULT 'approved',
  created_at timestamptz DEFAULT now()
);

-- 4. Doctor Consultation Fees & Online Status Table
CREATE TABLE IF NOT EXISTS public.doctor_consultation_fees (
  telegram_id bigint PRIMARY KEY,
  text_fee numeric DEFAULT 100,
  voice_fee numeric DEFAULT 200,
  video_fee numeric DEFAULT 300,
  is_online boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- 5. FSM States Table (For stateless Telegram webhooks)
CREATE TABLE IF NOT EXISTS public.bot_fsm_states (
  user_id bigint PRIMARY KEY,
  state text NOT NULL DEFAULT '',
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 6. Recreate public_doctor_profiles view with all required profile data
CREATE OR REPLACE VIEW public.public_doctor_profiles AS
SELECT 
  da.id, 
  da.doctor_id, 
  da.full_name, 
  da.specialty,
  da.city, 
  da.experience_years, 
  da.education,
  da.bio, 
  da.languages,
  da.workplace, 
  da.consultation_fee, 
  da.schedule,
  da.avatar_path, 
  da.certificate_path,
  da.status, 
  da.created_at,
  p.telegram_id, 
  p.telegram_username,
  p.phone,
  p.email
FROM doctor_applications da
JOIN profiles p ON p.id = da.doctor_id
WHERE da.status = 'approved';

-- 7. Grant Permissions & RLS Policies
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_consultation_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_fsm_states ENABLE ROW LEVEL SECURITY;

-- Allow service role and anon read/write
GRANT ALL ON public.bot_settings TO service_role, anon;
GRANT ALL ON public.bot_products TO service_role, anon;
GRANT ALL ON public.bot_transactions TO service_role, anon;
GRANT ALL ON public.doctor_consultation_fees TO service_role, anon;
GRANT ALL ON public.bot_fsm_states TO service_role, anon;

-- Drop existing policies if they exist to prevent duplicate errors
DROP POLICY IF EXISTS "Allow all on bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Allow all on bot_products" ON public.bot_products;
DROP POLICY IF EXISTS "Allow all on bot_transactions" ON public.bot_transactions;
DROP POLICY IF EXISTS "Allow all on doctor_consultation_fees" ON public.doctor_consultation_fees;
DROP POLICY IF EXISTS "Allow all on bot_fsm_states" ON public.bot_fsm_states;

-- Create clean policies
CREATE POLICY "Allow all on bot_settings" ON public.bot_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bot_products" ON public.bot_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bot_transactions" ON public.bot_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on doctor_consultation_fees" ON public.doctor_consultation_fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bot_fsm_states" ON public.bot_fsm_states FOR ALL USING (true) WITH CHECK (true);
