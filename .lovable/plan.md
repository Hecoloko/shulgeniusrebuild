

# Fix: Organization Slug Not Found Error

## Problem Identified

The `useCurrentOrg` hook has a bug in how it retrieves the organization slug:

**Current Code Issue (line 34):**
```typescript
const orgSlug = firstOrg?.slug || null;
```

The `orgSlug` is ONLY populated from `firstOrg`, but `firstOrg` is only fetched when:
```typescript
enabled: isShulowner && !orgIdFromRoles
```

This means:
- **Shulowner without org role** - `firstOrg` is fetched, slug is available
- **Shuladmin/Shulmember** - `firstOrg` is NOT fetched (because they have `orgIdFromRoles`), so `orgSlug` is always `null`

Your test user has role `shuladmin` with `organization_id: 5e516bc8-5eb6-4f1a-a810-5a0f7072fd95`, so the slug is never retrieved.

---

## Solution

Modify `useCurrentOrg` to fetch the organization's slug based on `orgIdFromRoles` when available.

---

## Implementation

### File: `src/hooks/useCurrentOrg.ts`

**Changes:**
1. Add a new query to fetch organization details when user has `orgIdFromRoles`
2. Return the slug from either source (role-based org or first org)

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentOrg() {
  const { roles, isShulowner } = useAuth();
  
  // Get org ID from user's roles (for shuladmin/shulmember)
  const orgIdFromRoles = roles.find(r => r.organization_id)?.organization_id;

  // Fetch organization details when user has org in their role
  const { data: orgFromRole, isLoading: loadingOrgFromRole } = useQuery({
    queryKey: ["organization", orgIdFromRoles],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .eq("id", orgIdFromRoles!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgIdFromRoles,  // <-- Fetch when user has org role
    staleTime: 5 * 60 * 1000,
  });

  // For shulowner: Fetch first available organization if they don't have one in roles
  const { data: firstOrg, isLoading: loadingFirstOrg } = useQuery({
    queryKey: ["first-organization"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isShulowner && !orgIdFromRoles,
    staleTime: 5 * 60 * 1000,
  });

  // Determine actual orgId and slug to use
  const orgId = orgIdFromRoles || firstOrg?.id || null;
  const orgSlug = orgFromRole?.slug || firstOrg?.slug || null;  // <-- Now checks both sources
  
  const isLoading = 
    (!!orgIdFromRoles && loadingOrgFromRole) || 
    (isShulowner && !orgIdFromRoles && loadingFirstOrg);
  
  const noOrgExists = isShulowner && !orgIdFromRoles && !loadingFirstOrg && !firstOrg;

  return {
    orgId,
    orgSlug,
    isLoading,
    isShulowner,
    noOrgExists,
    canCreateOrg: isShulowner,
  };
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useCurrentOrg.ts` | Add query to fetch org by ID when user has role-based org, return slug from correct source |

---

## Testing

1. Log in as a shuladmin user
2. Go to Campaigns page
3. Click the Copy Campaign URL button (link icon)
4. Verify URL is copied successfully (no "Organization slug not found" error)
5. Verify the URL format is correct: `/s/{slug}/campaign/{id}`

