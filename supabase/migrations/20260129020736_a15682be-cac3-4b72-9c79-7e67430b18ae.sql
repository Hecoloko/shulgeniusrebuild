-- Fix the overly permissive donations INSERT policy
-- Require organization_id to be valid

DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;

CREATE POLICY "Authenticated users can create donations"
  ON public.donations FOR INSERT
  WITH CHECK (
    -- Allow authenticated users to donate to any organization
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id)
  );