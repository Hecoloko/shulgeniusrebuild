import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  activeMembers: number;
  activeCampaigns: number;
  openInvoices: number;
  revenueThisMonth: number;
}

export function useDashboardStats() {
  const { roles, isShulowner } = useAuth();
  
  // Get org IDs from roles
  const orgIds = roles
    .filter((r) => r.organization_id)
    .map((r) => r.organization_id as string);

  return useQuery({
    queryKey: ["dashboard-stats", orgIds, isShulowner],
    queryFn: async (): Promise<DashboardStats> => {
      // For shulowner, get all orgs; otherwise filter by user's orgs
      let memberQuery = supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      
      let campaignQuery = supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      
      let invoiceQuery = supabase
        .from("invoices")
        .select("total")
        .in("status", ["sent", "overdue"]);
      
      // Get first day of current month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      let paymentQuery = supabase
        .from("payments")
        .select("amount")
        .gte("created_at", firstOfMonth);

      // If not shulowner, filter by org IDs
      if (!isShulowner && orgIds.length > 0) {
        memberQuery = memberQuery.in("organization_id", orgIds);
        campaignQuery = campaignQuery.in("organization_id", orgIds);
        invoiceQuery = invoiceQuery.in("organization_id", orgIds);
        paymentQuery = paymentQuery.in("organization_id", orgIds);
      }

      const [membersRes, campaignsRes, invoicesRes, paymentsRes] = await Promise.all([
        memberQuery,
        campaignQuery,
        invoiceQuery,
        paymentQuery,
      ]);

      const openInvoicesTotal = (invoicesRes.data || []).reduce(
        (sum, inv) => sum + Number(inv.total || 0),
        0
      );

      const revenueTotal = (paymentsRes.data || []).reduce(
        (sum, pay) => sum + Number(pay.amount || 0),
        0
      );

      return {
        activeMembers: membersRes.count || 0,
        activeCampaigns: campaignsRes.count || 0,
        openInvoices: openInvoicesTotal,
        revenueThisMonth: revenueTotal,
      };
    },
    enabled: isShulowner || orgIds.length > 0,
  });
}
