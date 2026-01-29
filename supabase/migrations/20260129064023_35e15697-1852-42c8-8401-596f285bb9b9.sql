-- Allow public access to organizations by slug (for public shul pages)
CREATE POLICY "Public can view organizations by slug"
  ON public.organizations FOR SELECT
  USING (true);

-- Allow public access to active campaigns (for public campaign pages)
CREATE POLICY "Public can view active campaigns"
  ON public.campaigns FOR SELECT
  USING (is_active = true);