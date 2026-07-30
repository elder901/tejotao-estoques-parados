CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_admin = true)
$$;
REVOKE EXECUTE ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO service_role;

DROP POLICY IF EXISTS "Owners or admins can update action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Admins can delete action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Users can read own profile or admins all" ON public.profiles;

CREATE POLICY "Owners or admins can update action plans" ON public.action_plans
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete action plans" ON public.action_plans
FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));

CREATE POLICY "Users can read own profile or admins all" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid() OR private.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin(uuid);