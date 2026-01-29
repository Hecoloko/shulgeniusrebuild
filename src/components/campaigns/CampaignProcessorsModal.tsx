import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Plus, Star, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Campaign {
  id: string;
  name: string;
}

interface CampaignProcessorsModalProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignProcessorsModal({
  campaign,
  open,
  onOpenChange,
}: CampaignProcessorsModalProps) {
  const { orgId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [selectedProcessorId, setSelectedProcessorId] = useState<string>("");

  // Fetch all payment processors for the org
  const { data: processors } = useQuery({
    queryKey: ["payment-processors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Fetch assigned processors for this campaign
  const { data: assignedProcessors, isLoading } = useQuery({
    queryKey: ["campaign-processors", campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) return [];
      const { data, error } = await supabase
        .from("campaign_processors")
        .select(`
          id,
          is_primary,
          processor:payment_processors(id, name, processor_type, is_active)
        `)
        .eq("campaign_id", campaign.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaign?.id && open,
  });

  // Add processor mutation
  const addProcessorMutation = useMutation({
    mutationFn: async (processorId: string) => {
      if (!campaign?.id) throw new Error("No campaign selected");
      
      // Check if it's the first processor (make it primary)
      const isPrimary = !assignedProcessors || assignedProcessors.length === 0;
      
      const { error } = await supabase.from("campaign_processors").insert({
        campaign_id: campaign.id,
        processor_id: processorId,
        is_primary: isPrimary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processor added");
      queryClient.invalidateQueries({ queryKey: ["campaign-processors", campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSelectedProcessorId("");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("This processor is already assigned");
      } else {
        toast.error("Failed to add processor");
      }
    },
  });

  // Remove processor mutation
  const removeProcessorMutation = useMutation({
    mutationFn: async (cpId: string) => {
      const { error } = await supabase.from("campaign_processors").delete().eq("id", cpId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processor removed");
      queryClient.invalidateQueries({ queryKey: ["campaign-processors", campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => {
      toast.error("Failed to remove processor");
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (cpId: string) => {
      if (!campaign?.id) throw new Error("No campaign selected");
      
      // First, unset all as non-primary
      await supabase
        .from("campaign_processors")
        .update({ is_primary: false })
        .eq("campaign_id", campaign.id);
      
      // Then set the selected one as primary
      const { error } = await supabase
        .from("campaign_processors")
        .update({ is_primary: true })
        .eq("id", cpId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Primary processor updated");
      queryClient.invalidateQueries({ queryKey: ["campaign-processors", campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => {
      toast.error("Failed to update primary processor");
    },
  });

  // Filter out already assigned processors
  const availableProcessors = processors?.filter(
    (p) => !assignedProcessors?.some((ap: any) => ap.processor?.id === p.id)
  );

  const handleAdd = () => {
    if (selectedProcessorId) {
      addProcessorMutation.mutate(selectedProcessorId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Payment Processors</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Assign payment processors to handle payments for "{campaign?.name}"
          </p>
        </DialogHeader>

        {/* Add Processor */}
        <div className="flex gap-2">
          <Select
            value={selectedProcessorId}
            onValueChange={setSelectedProcessorId}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a payment processor" />
            </SelectTrigger>
            <SelectContent>
              {availableProcessors?.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No available processors
                </div>
              ) : (
                availableProcessors?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.processor_type})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAdd}
            disabled={!selectedProcessorId || addProcessorMutation.isPending}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Assigned Processors Table */}
        <div className="mt-4">
          <h4 className="font-medium mb-3">Assigned Processors</h4>
          
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : !assignedProcessors || assignedProcessors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg">
              No processors assigned yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedProcessors.map((cp: any) => (
                  <TableRow key={cp.id}>
                    <TableCell className="font-medium">
                      {cp.processor?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cp.processor?.processor_type || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cp.is_primary ? (
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrimaryMutation.mutate(cp.id)}
                          disabled={setPrimaryMutation.isPending}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Set Primary
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeProcessorMutation.mutate(cp.id)}
                        disabled={removeProcessorMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
