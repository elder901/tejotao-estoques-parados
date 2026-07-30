-- 1. erp_mcp_connection: owner-scoped policies
CREATE POLICY "Owners can read own erp connection" ON public.erp_mcp_connection
FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners can insert own erp connection" ON public.erp_mcp_connection
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update own erp connection" ON public.erp_mcp_connection
FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete own erp connection" ON public.erp_mcp_connection
FOR DELETE TO authenticated USING (owner_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_mcp_connection TO authenticated;
GRANT ALL ON public.erp_mcp_connection TO service_role;

-- 2. admin helper (avoids recursive profile policy)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_admin = true)
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 3. action_plans: scoped update/delete
DROP POLICY IF EXISTS "Authenticated can update action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Admins can delete action plans" ON public.action_plans;
CREATE POLICY "Owners or admins can update action plans" ON public.action_plans
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete action plans" ON public.action_plans
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 4. profiles: self or admin read
DROP POLICY IF EXISTS "Anyone authenticated can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile or admins all" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- 5. storage: authenticated reads only
DROP POLICY IF EXISTS "Anyone can read csv files" ON storage.objects;
CREATE POLICY "Authenticated can read csv files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'csv-files');

-- 6. lock down signup trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;