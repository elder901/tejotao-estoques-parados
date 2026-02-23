-- Allow admins to delete action plans
CREATE POLICY "Admins can delete action plans"
ON public.action_plans
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);