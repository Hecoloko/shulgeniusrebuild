

# Fix: Campaign Not Found & Public Pages Navigation

## Summary

This plan addresses two interconnected issues:
1. **"Campaign Not Found" error** - RLS policies block public access to campaigns and organizations
2. **Missing navigation bar** - Public campaign page needs Home, Schedule, Donate, Member Portal, Admin Portal (conditional), Logout, and a Shul Switcher for members with multiple organizations

---

## Part 1: Root Cause - RLS Blocking Public Access

### Problem Analysis

The current RLS policies for `campaigns` and `organizations` tables require users to be authenticated org members:

```sql
-- Organizations: Requires org membership or shulowner status
USING (public.is_org_member(auth.uid(), id) OR public.is_shulowner(auth.uid()));

-- Campaigns: Requires org membership
USING (public.is_org_member(auth.uid(), organization_id));
```

**Impact:**
- Anonymous visitors to `/s/{slug}/campaign/{id}` cannot see campaigns
- Even logged-in users who aren't members of that specific org cannot see the campaign
- The public shul page (`/s/{slug}`) has the same issue for organizations

### Solution: Add Public SELECT Policies

Add new RLS policies that allow **unauthenticated public access** for SELECT on:
1. `organizations` table - by slug (for public pages)
2. `campaigns` table - for active campaigns only

**Migration SQL:**
```sql
-- Allow public access to organizations by slug (for public shul pages)
CREATE POLICY "Public can view organizations by slug"
  ON public.organizations FOR SELECT
  USING (true);  -- Open read access, slug filtering happens in query

-- Allow public access to active campaigns (for public campaign pages)
CREATE POLICY "Public can view active campaigns"
  ON public.campaigns FOR SELECT
  USING (is_active = true);
```

**Security Note:** These policies only allow SELECT (read) access. Write operations remain protected by existing admin policies.

---

## Part 2: Enhanced Public Navigation Bar

### Current State

The `PublicCampaign.tsx` has a basic navigation with:
- Home, Schedule, Donate (non-functional links)
- Member Portal button (always shown)
- Admin button (only if `user` exists)
- Logout button (only if `user` exists)

### Desired Navigation (from reference image)

```text
+-----------------------------------------------------------------------------+
| [Logo] Org Name     Home | Schedule | Donate | [Member Portal] | Admin | Logout |
+-----------------------------------------------------------------------------+
```

Key Requirements:
- **Home** - Links to `/s/{slug}`
- **Schedule** - Links to `/s/{slug}` (schedule tab) or future `/s/{slug}/schedule`
- **Donate** - Links to `/s/{slug}` (donate tab) or current campaign
- **Member Portal** - Always visible, links to `/portal/login`
- **Admin Portal** - Only visible if user is admin (`shuladmin` or `shulowner`) of this organization
- **Logout** - Only visible if user is logged in
- **Shul Switcher** - Dropdown for members with roles in multiple organizations

### Implementation Steps

#### Step 1: Create a Reusable Public Navigation Component

**New File: `src/components/public/PublicNavbar.tsx`**

This component will:
- Accept `org` and `slug` props
- Show navigation items: Home, Schedule, Donate
- Check if current user is an admin of **this specific organization**
- Conditionally show Admin Portal link
- Show Member Portal and Logout buttons
- Include a Shul Switcher dropdown if user has multiple org roles

**Logic for Admin visibility:**
```typescript
// Check if user is admin of THIS organization (not just any admin)
const isOrgAdmin = roles.some(
  r => r.organization_id === org.id && (r.role === 'shuladmin' || r.role === 'shulowner')
) || isShulowner;
```

**Logic for Shul Switcher:**
```typescript
// Get all organizations user has roles in
const userOrgs = roles.filter(r => r.organization_id).map(r => ({
  id: r.organization_id,
  role: r.role
}));
// Fetch org details (name, slug) for the switcher
```

#### Step 2: Update PublicCampaign.tsx

Replace inline navigation with the new `PublicNavbar` component.

#### Step 3: Update PublicShul.tsx

Apply the same navigation component for consistency.

---

## Part 3: Shul Switcher Component

### Overview

For members who belong to multiple synagogues (have `user_roles` with different `organization_id` values), show a dropdown to switch between their organizations.

### UI Design

```text
+----------------------------+
| [Current: Heco Shul    ▼]  |
|----------------------------|
| ○ Heco Shul (Admin)        |
| ○ Beth Israel (Member)     |
| ○ Temple Sinai (Admin)     |
+----------------------------+
```

### Implementation

**Component: `src/components/public/ShulSwitcher.tsx`**

Props:
- `currentOrgId`: Current organization being viewed
- `userRoles`: User's roles array from AuthContext

Behavior:
1. Filter roles to those with `organization_id`
2. Query organizations table to get names/slugs for each org
3. Show current org highlighted
4. On selection, navigate to `/s/{newSlug}`

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_public_access.sql` | Create | Add public SELECT policies for orgs/campaigns |
| `src/components/public/PublicNavbar.tsx` | Create | Reusable navigation for public pages |
| `src/components/public/ShulSwitcher.tsx` | Create | Dropdown for members with multiple orgs |
| `src/pages/PublicCampaign.tsx` | Modify | Use PublicNavbar, improve layout |
| `src/pages/PublicShul.tsx` | Modify | Use PublicNavbar for consistency |

---

## Data Flow Diagram

```text
User visits /s/{slug}/campaign/{campaignId}
                |
                v
    +-------------------------+
    | PublicCampaign.tsx      |
    | - Fetch org by slug     |
    | - Fetch campaign by id  |
    +-------------------------+
                |
                v
    +-------------------------+
    | Supabase RLS Check      |
    | (NEW) Public policies   |
    | allow SELECT access     |
    +-------------------------+
                |
    +-----------+-----------+
    |                       |
    v                       v
  [Org found]           [Campaign found]
    |                       |
    v                       v
    +-------------------------+
    | PublicNavbar component  |
    | - Check user auth state |
    | - Check user org roles  |
    | - Show conditional nav  |
    +-------------------------+
                |
      +---------+---------+
      |         |         |
      v         v         v
  [Home]   [Member    [Admin]
  [Schedule] Portal]   (if org admin)
  [Donate]  (always)   [Shul Switcher]
            [Logout]   (if multi-org)
            (if auth)
```

---

## Technical Details

### PublicNavbar Component Props

```typescript
interface PublicNavbarProps {
  org: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
  currentPath?: string; // For active tab highlighting
}
```

### ShulSwitcher Component

```typescript
interface ShulSwitcherProps {
  currentOrgId: string;
  onSwitch?: (newSlug: string) => void;
}
```

The component will:
1. Use `useAuth()` to get user roles
2. Query organizations table for org details of user's roles
3. Render a dropdown with org names and roles
4. Navigate on selection

---

## Testing Checklist

After implementation:

1. **RLS Changes:**
   - Visit `/s/{slug}` as anonymous user - should load org details
   - Visit `/s/{slug}/campaign/{id}` as anonymous user - should load campaign
   - Inactive campaigns should NOT be visible to anonymous users

2. **Navigation:**
   - Home link goes to `/s/{slug}`
   - Schedule link goes to `/s/{slug}` (schedule tab)
   - Donate link goes to `/s/{slug}` (donate tab)
   - Member Portal always visible, links to `/portal/login`
   
3. **Admin Visibility:**
   - Anonymous user: No Admin button
   - Logged-in non-admin: No Admin button
   - Logged-in shuladmin of THIS org: Admin button visible
   - Logged-in shulowner: Admin button visible (global admin)

4. **Shul Switcher:**
   - User with single org role: No switcher shown
   - User with multiple org roles: Switcher dropdown visible
   - Switching navigates to correct org's public page

5. **Logout:**
   - Only visible when logged in
   - Clicking logs out and stays on public page

---

## Security Considerations

1. **Public READ policies are safe** - Only allowing SELECT on organizations and active campaigns
2. **Admin detection uses server data** - Roles come from authenticated Supabase query, not client storage
3. **No sensitive data exposed** - Public pages only show campaign name, goal, raised amount
4. **Inactive campaigns hidden** - Only `is_active = true` campaigns visible publicly

