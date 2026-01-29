-- Allow users to create their own shulmember role (for password setup flow)
CREATE POLICY "Users can create own member role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'shulmember'
);