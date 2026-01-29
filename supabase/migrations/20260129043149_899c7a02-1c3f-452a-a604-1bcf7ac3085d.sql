-- Add processor_id column to payment_methods table
ALTER TABLE public.payment_methods
ADD COLUMN processor_id uuid REFERENCES public.payment_processors(id);

-- Create index for faster lookups
CREATE INDEX idx_payment_methods_processor_id ON public.payment_methods(processor_id);

-- Add campaign_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id);

-- Create index for faster lookups
CREATE INDEX idx_invoices_campaign_id ON public.invoices(campaign_id);