-- Create subscriptions table for recurring payments
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'recurring' CHECK (payment_type IN ('recurring', 'installments')),
  billing_method TEXT NOT NULL DEFAULT 'invoiced' CHECK (billing_method IN ('invoiced', 'auto_cc')),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'monthly_hebrew', 'quarterly', 'annual')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  installments_total INTEGER,
  installments_paid INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Members can view own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM members 
  WHERE members.id = subscriptions.member_id 
  AND members.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();