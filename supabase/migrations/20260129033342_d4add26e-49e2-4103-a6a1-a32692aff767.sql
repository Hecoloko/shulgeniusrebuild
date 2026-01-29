-- Create payment_processors table for multiple processors per org
CREATE TABLE public.payment_processors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  processor_type TEXT NOT NULL CHECK (processor_type IN ('stripe', 'cardknox')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_processors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage payment processors"
  ON public.payment_processors FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view payment processors"
  ON public.payment_processors FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Only one default per org
CREATE UNIQUE INDEX idx_payment_processors_default 
  ON public.payment_processors (organization_id) 
  WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_payment_processors_updated_at
  BEFORE UPDATE ON public.payment_processors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from organization_settings
INSERT INTO public.payment_processors (organization_id, name, processor_type, is_default, credentials)
SELECT 
  os.organization_id,
  'Cardknox',
  'cardknox',
  os.active_processor = 'cardknox',
  jsonb_build_object(
    'ifields_key', os.cardknox_ifields_key,
    'transaction_key', os.cardknox_transaction_key
  )
FROM public.organization_settings os
WHERE os.cardknox_ifields_key IS NOT NULL;

INSERT INTO public.payment_processors (organization_id, name, processor_type, is_default, credentials)
SELECT 
  os.organization_id,
  'Stripe',
  'stripe',
  os.active_processor = 'stripe',
  jsonb_build_object(
    'account_id', os.stripe_account_id,
    'publishable_key', os.stripe_publishable_key
  )
FROM public.organization_settings os
WHERE os.stripe_account_id IS NOT NULL;