
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: users can read all profiles, only update own
CREATE POLICY "Anyone authenticated can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Action plans table
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_item TEXT NOT NULL,
  cod_unidade TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responsavel TEXT NOT NULL,
  estrategia TEXT NOT NULL,
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cod_item, cod_unidade)
);

ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- RLS: all authenticated can read, only creator can insert/update
CREATE POLICY "Authenticated can read all action plans"
  ON public.action_plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert action plans"
  ON public.action_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Creator can update own action plans"
  ON public.action_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
