import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to get the current organization ID for the user.
 * - For users with organization roles: returns their org ID and fetches org details
 * - For shulowners without a direct org: returns the first available org
 */
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
    enabled: !!orgIdFromRoles,
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
  const orgSlug = orgFromRole?.slug || firstOrg?.slug || null;
  
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
