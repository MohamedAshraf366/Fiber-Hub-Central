-- 1. Data rates catalog
CREATE TABLE public.data_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_rates TO authenticated;
GRANT ALL ON public.data_rates TO service_role;

ALTER TABLE public.data_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read data rates" ON public.data_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "managers manage data rates" ON public.data_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER data_rates_updated_at BEFORE UPDATE ON public.data_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.data_rates (label, sort_order) VALUES
  ('E1', 10), ('STM1', 20), ('1G', 30), ('10G', 40), ('100G', 50), ('200G', 60), ('400G', 70);

-- 2. Circuits get a data rate
ALTER TABLE public.circuits ADD COLUMN data_rate text;

-- 3. Manager contact details on app users
ALTER TABLE public.app_users ADD COLUMN email text;
ALTER TABLE public.app_users ADD COLUMN phone text;

-- 4. Weekly backup reminder tracking
CREATE TABLE public.export_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE UNIQUE,
  last_export_at timestamptz,
  last_dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_reminders TO authenticated;
GRANT ALL ON public.export_reminders TO service_role;

ALTER TABLE public.export_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own reminder" ON public.export_reminders
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = app_user_id AND u.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "write own reminder" ON public.export_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = app_user_id AND u.auth_user_id = auth.uid())
  );
CREATE POLICY "update own reminder" ON public.export_reminders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = app_user_id AND u.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = app_user_id AND u.auth_user_id = auth.uid())
  );

CREATE TRIGGER export_reminders_updated_at BEFORE UPDATE ON public.export_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();