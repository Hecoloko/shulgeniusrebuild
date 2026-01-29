import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to get the current organization ID for the user.
 * - For users with organization roles: returns their org ID
 * - For shulowners without a direct org: returns the first available org
 */
export function useCurrentOrg() {
  const { roles, isShulowner } = useAuth();
  
  // Get org ID from user's roles (for shuladmin/shulmember)
  const orgIdFromRoles = roles.find(r => r.organization_id)?.organization_id;

  // For shulowner: Fetch first available organization if they don't have one in roles
  const { data: firstOrg, isLoading: loadingFirstOrg } = useQuery({
    queryKey: ["first-organization"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isShulowner && !orgIdFromRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Determine actual orgId to use
  const orgId = orgIdFromRoles || firstOrg?.id || null;
  const isLoading = isShulowner && !orgIdFromRoles && loadingFirstOrg;
  const noOrgExists = isShulowner && !orgIdFromRoles && !loadingFirstOrg && !firstOrg;

  return {
    orgId,
    isLoading,
    isShulowner,
    noOrgExists, // True when shulowner and no orgs exist yet
    canCreateOrg: isShulowner, // Only shulowners can create orgs
  };
}
