import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export type ActivityType = "payment" | "invoice" | "member" | "donation";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  amount?: number;
}

function mapEntityToType(entityType: string): ActivityType {
  switch (entityType) {
    case "payment":
      return "payment";
    case "invoice":
      return "invoice";
    case "member":
      return "member";
    case "donation":
      return "donation";
    default:
      return "member";
  }
}

function buildTitle(action: string, entityType: string): string {
  const actionMap: Record<string, string> = {
    created: entityType === "member" ? "New Member" : `${entityType} Created`,
    updated: `${entityType} Updated`,
    deleted: `${entityType} Removed`,
    paid: "Payment Received",
    sent: "Invoice Sent",
  };
  return actionMap[action] || `${entityType} ${action}`;
}

export function useActivityFeed(limit = 5) {
  const { roles, isShulowner } = useAuth();
  
  const orgIds = roles
    .filter((r) => r.organization_id)
    .map((r) => r.organization_id as string);

  return useQuery({
    queryKey: ["activity-feed", orgIds, isShulowner, limit],
    queryFn: async (): Promise<Activity[]> => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // If not shulowner, filter by org IDs
      if (!isShulowner && orgIds.length > 0) {
        query = query.in("organization_id", orgIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((log) => {
        const metadata = log.metadata as Record<string, unknown> | null;
        return {
          id: log.id,
          type: mapEntityToType(log.entity_type),
          title: buildTitle(log.action, log.entity_type),
          description: (metadata?.description as string) || `${log.entity_type} ${log.action}`,
          time: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
          amount: metadata?.amount ? Number(metadata.amount) : undefined,
        };
      });
    },
    enabled: isShulowner || orgIds.length > 0,
  });
}
