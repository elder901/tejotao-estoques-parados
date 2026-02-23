-- Drop the restrictive update policy and replace with one allowing any authenticated user to update
DROP POLICY "Creator can update own action plans" ON public.action_plans;

CREATE POLICY "Authenticated can update action plans"
ON public.action_plans
FOR UPDATE
USING (true);