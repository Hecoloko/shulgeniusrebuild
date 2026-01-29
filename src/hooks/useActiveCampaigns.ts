import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CampaignData {
  id: string;
  name: string;
  type: "drive" | "fund";
  raised: number;
  goal: number;
}

export function useActiveCampaigns(limit = 3) {
  const { roles, isShulowner } = useAuth();
  
  const orgIds = roles
    .filter((r) => r.organization_id)
    .map((r) => r.organization_id as string);

  return useQuery({
    queryKey: ["active-campaigns", orgIds, isShulowner, limit],
    queryFn: async (): Promise<CampaignData[]> => {
      let query = supabase
        .from("campaigns")
        .select("id, name, type, raised_amount, goal_amount")
        .eq("is_active", true)
        .not("goal_amount", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      // If not shulowner, filter by org IDs
      if (!isShulowner && orgIds.length > 0) {
        query = query.in("organization_id", orgIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        raised: Number(c.raised_amount) || 0,
        goal: Number(c.goal_amount) || 1, // Prevent division by zero
      }));
    },
    enabled: isShulowner || orgIds.length > 0,
  });
}
