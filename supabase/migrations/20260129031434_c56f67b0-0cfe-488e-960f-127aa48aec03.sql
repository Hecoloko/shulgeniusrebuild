-- Create function to add member role (called from password setup)
CREATE OR REPLACE FUNCTION public.create_member_role(_user_id uuid, _org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if role doesn't already exist
  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, 'shulmember', _org_id)
  ON CONFLICT DO NOTHING;
END;
$$;