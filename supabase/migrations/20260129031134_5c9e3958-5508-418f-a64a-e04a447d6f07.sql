-- Add invite token fields to members table for password setup flow
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invite_token_expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS password_set_at timestamp with time zone DEFAULT NULL;

-- Create index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_members_invite_token ON public.members(invite_token);

-- Allow public access to verify invite tokens (for password setup page)
CREATE OR REPLACE FUNCTION public.get_member_by_invite_token(_token uuid)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  organization_id uuid,
  invite_token_expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.organization_id,
    m.invite_token_expires_at
  FROM public.members m
  WHERE m.invite_token = _token
    AND m.invite_token_expires_at > now()
    AND m.password_set_at IS NULL
$$;