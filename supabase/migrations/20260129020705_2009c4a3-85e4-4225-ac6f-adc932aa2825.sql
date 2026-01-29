-- ShulGenius Antigravity - Multi-Tenant Synagogue Management System
-- Core Database Schema with Role-Based Access Control

-- ============================================
-- 1. ENUMS
-- ============================================

-- App-wide role enum (stored in separate table, not on profiles)
CREATE TYPE public.app_role AS ENUM ('shulowner', 'shuladmin', 'shulmember');

-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'void', 'overdue');

-- Campaign type enum
CREATE TYPE public.campaign_type AS ENUM ('drive', 'fund');

-- ============================================
-- 2. ORGANIZATIONS (SHULS) TABLE
-- ============================================
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. PROFILES TABLE (User Information)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. USER ROLES TABLE (Separate from Profiles)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organization_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. MEMBERS TABLE (Synagogue Members)
-- ============================================
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  membership_type TEXT DEFAULT 'individual',
  family_head_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. INVOICES TABLE
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. INVOICE LINE ITEMS TABLE
-- ============================================
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. PAYMENTS TABLE
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  processor TEXT,
  processor_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. CAMPAIGNS TABLE
-- ============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type campaign_type NOT NULL DEFAULT 'fund',
  goal_amount DECIMAL(10, 2),
  raised_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. DONATIONS TABLE
-- ============================================
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  donor_name TEXT,
  donor_email TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT,
  processor TEXT,
  processor_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. PAYMENT METHODS (Saved Cards)
-- ============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  processor TEXT NOT NULL,
  processor_customer_id TEXT,
  processor_payment_method_id TEXT NOT NULL,
  card_last_four TEXT,
  card_brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. ORGANIZATION SETTINGS
-- ============================================
CREATE TABLE public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  stripe_publishable_key TEXT,
  cardknox_account_id TEXT,
  cardknox_api_key TEXT,
  active_processor TEXT DEFAULT 'stripe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. ACTIVITY LOG
-- ============================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 14. SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is shulowner
CREATE OR REPLACE FUNCTION public.is_shulowner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'shulowner')
$$;

-- Function to check if user is admin of specific organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'shuladmin'
      AND organization_id = _org_id
  ) OR public.is_shulowner(_user_id)
$$;

-- Function to check if user is member of specific organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  ) OR public.is_shulowner(_user_id)
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND organization_id IS NOT NULL
$$;

-- ============================================
-- 15. RLS POLICIES
-- ============================================

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User Roles: Only visible to the user themselves or shulowners
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_shulowner(auth.uid()));

-- Organizations: Visible to members, editable by admins
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id) OR public.is_shulowner(auth.uid()));

CREATE POLICY "Admins can update their organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Shulowners can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_shulowner(auth.uid()));

-- Members: Org-scoped access
CREATE POLICY "Admins can view org members"
  ON public.members FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id) OR user_id = auth.uid());

CREATE POLICY "Admins can create org members"
  ON public.members FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update org members"
  ON public.members FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete org members"
  ON public.members FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Invoices: Org-scoped + member can see own
CREATE POLICY "Admins can view org invoices"
  ON public.invoices FOR SELECT
  USING (
    public.is_org_admin(auth.uid(), organization_id) OR
    EXISTS (SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Invoice Items: Through invoice access
CREATE POLICY "View invoice items through invoice"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (public.is_org_admin(auth.uid(), i.organization_id) OR
             EXISTS (SELECT 1 FROM public.members m WHERE m.id = i.member_id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "Admins can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND public.is_org_admin(auth.uid(), i.organization_id)
    )
  );

-- Payments: Org-scoped + member can see own
CREATE POLICY "View payments"
  ON public.payments FOR SELECT
  USING (
    public.is_org_admin(auth.uid(), organization_id) OR
    EXISTS (SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Campaigns: Visible to org members
CREATE POLICY "Org members can view campaigns"
  ON public.campaigns FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Donations: Org-scoped
CREATE POLICY "Admins can view donations"
  ON public.donations FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Anyone can create donations"
  ON public.donations FOR INSERT
  WITH CHECK (true);

-- Payment Methods: Member-scoped
CREATE POLICY "Members can view own payment methods"
  ON public.payment_methods FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid())
  );

-- Organization Settings: Admin only
CREATE POLICY "Admins can view org settings"
  ON public.organization_settings FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can manage org settings"
  ON public.organization_settings FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Activity Log: Org-scoped
CREATE POLICY "Admins can view activity log"
  ON public.activity_log FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Activity log insert"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- ============================================
-- 16. TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 17. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(organization_id);
CREATE INDEX idx_members_org_id ON public.members(organization_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_email ON public.members(email);
CREATE INDEX idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX idx_invoices_member_id ON public.invoices(member_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_payments_org_id ON public.payments(organization_id);
CREATE INDEX idx_payments_member_id ON public.payments(member_id);
CREATE INDEX idx_campaigns_org_id ON public.campaigns(organization_id);
CREATE INDEX idx_donations_org_id ON public.donations(organization_id);
CREATE INDEX idx_donations_campaign_id ON public.donations(campaign_id);
CREATE INDEX idx_activity_log_org_id ON public.activity_log(organization_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);