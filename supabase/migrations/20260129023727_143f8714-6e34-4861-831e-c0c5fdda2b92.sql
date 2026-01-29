-- Create billing_items table for subscription/one-off items
CREATE TABLE public.billing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL DEFAULT 'one_time' CHECK (type IN ('subscription', 'one_time')),
  billing_interval TEXT CHECK (billing_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  cardknox_item_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage billing items
CREATE POLICY "Admins can manage billing items"
  ON public.billing_items FOR ALL
  USING (is_org_admin(auth.uid(), organization_id));

-- Members can view billing items
CREATE POLICY "Members can view billing items"
  ON public.billing_items FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_billing_items_updated_at
  BEFORE UPDATE ON public.billing_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add logo storage bucket for shul branding
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Storage policy for logo uploads
CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can update their logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);