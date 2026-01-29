-- Create junction table for campaign-processor relationships
CREATE TABLE public.campaign_processors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  processor_id UUID NOT NULL REFERENCES public.payment_processors(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, processor_id)
);

-- Enable RLS
ALTER TABLE public.campaign_processors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage campaign processors"
  ON public.campaign_processors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_processors.campaign_id
      AND is_org_admin(auth.uid(), c.organization_id)
    )
  );

CREATE POLICY "Members can view campaign processors"
  ON public.campaign_processors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_processors.campaign_id
      AND is_org_member(auth.uid(), c.organization_id)
    )
  );

-- Ensure only one primary processor per campaign
CREATE UNIQUE INDEX idx_campaign_primary_processor 
  ON public.campaign_processors (campaign_id) 
  WHERE is_primary = true;