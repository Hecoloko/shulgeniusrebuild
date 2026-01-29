import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, DollarSign, Settings, Pencil, Link2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Campaigns() {
  const { orgId, isLoading: orgLoading } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch campaigns with processors
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_processors(
            id,
            is_primary,
            processor:payment_processors(id, name, processor_type)
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch payment processors count
  const { data: processorStats } = useQuery({
    queryKey: ["processor-stats", orgId],
    queryFn: async () => {
      if (!orgId || !campaigns) return { connected: 0 };
      // Count campaigns that have at least one processor
      const campaignsWithProcessors = campaigns.filter(
        (c) => c.campaign_processors && c.campaign_processors.length > 0
      ).length;
      return { connected: campaignsWithProcessors };
    },
    enabled: !!orgId && !!campaigns,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete campaign");
    },
  });

  const isLoading = orgLoading || campaignsLoading;

  // Stats calculations
  const activeCampaigns = campaigns?.filter((c) => c.is_active) || [];
  const drivesCount = activeCampaigns.filter((c) => c.type === "drive").length;
  const fundsCount = activeCampaigns.filter((c) => c.type === "fund").length;
  const totalGoal = activeCampaigns
    .filter((c) => c.type === "drive" && c.goal_amount)
    .reduce((sum, c) => sum + Number(c.goal_amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "MMM d, yyyy");
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Drives & Funds</h1>
            <p className="text-muted-foreground">Manage fundraising buckets and drives</p>
          </div>
          <Button className="btn-royal gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Drive / Fund
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Drives/Funds</p>
                  <p className="text-3xl font-bold">{activeCampaigns.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {drivesCount} Drives | {fundsCount} Buckets
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Goal Amount</p>
                  <p className="text-3xl font-bold text-amber-500">{formatCurrency(totalGoal)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Combined drive goals</p>
                </div>
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processor Status</p>
                  <p className="text-3xl font-bold">{processorStats?.connected || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drives with connected processors
                  </p>
                </div>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">All Drives & Funds</h2>
              <p className="text-sm text-muted-foreground">View and manage your buckets and drives</p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !campaigns || campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No campaigns yet</p>
                <p className="text-sm mt-1">Create your first drive or fund to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment Processors</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            campaign.type === "fund"
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {campaign.type === "fund" ? "Fund (Bucket)" : "Drive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {campaign.campaign_processors?.length > 0 ? (
                            campaign.campaign_processors.map((cp: any) => (
                              <span
                                key={cp.id}
                                className={`px-2 py-0.5 rounded-full text-xs border ${
                                  cp.is_primary
                                    ? "border-primary text-primary"
                                    : "border-muted-foreground text-muted-foreground"
                                }`}
                              >
                                {cp.processor?.name}
                                {cp.is_primary && " (Primary)"}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.goal_amount ? formatCurrency(Number(campaign.goal_amount)) : "-"}
                      </TableCell>
                      <TableCell>{formatDate(campaign.start_date)}</TableCell>
                      <TableCell>
                        {campaign.type === "fund" ? "Ongoing" : formatDate(campaign.end_date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            campaign.is_active
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {campaign.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <CreateCampaignModal open={showCreateModal} onOpenChange={setShowCreateModal} />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the campaign and all
                associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </DashboardLayout>
  );
}
