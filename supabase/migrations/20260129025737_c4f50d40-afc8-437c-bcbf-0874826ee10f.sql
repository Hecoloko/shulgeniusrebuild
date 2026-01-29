-- Allow admins to insert payment methods for their organization's members
CREATE POLICY "Admins can create payment methods for org members"
ON public.payment_methods
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = payment_methods.member_id
      AND is_org_admin(auth.uid(), m.organization_id)
  )
);

-- Allow admins to view payment methods for their organization's members
CREATE POLICY "Admins can view org member payment methods"
ON public.payment_methods
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = payment_methods.member_id
      AND is_org_admin(auth.uid(), m.organization_id)
  )
);