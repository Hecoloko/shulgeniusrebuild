import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CampaignType = "fund" | "drive";

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const { orgId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CampaignType>("fund");
  const [goalAmount, setGoalAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization selected");
      if (!name.trim()) throw new Error("Campaign name is required");

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          organization_id: orgId,
          name: name.trim(),
          description: description.trim() || null,
          type,
          goal_amount: goalAmount ? parseFloat(goalAmount) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          is_active: isActive,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Campaign created successfully");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create campaign");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("fund");
    setGoalAmount("");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Drive / Fund</DialogTitle>
          <DialogDescription>Create a fundraising drive or ongoing fund</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., General Fund"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CampaignType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fund">
                  <div className="flex flex-col">
                    <span className="font-medium">Fund (Bucket)</span>
                    <span className="text-xs text-muted-foreground">
                      Ongoing designation (Building Fund, Membership)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="drive">
                  <div className="flex flex-col">
                    <span className="font-medium">Drive</span>
                    <span className="text-xs text-muted-foreground">
                      Goal/Time-bound (Charidy, Dinner, Raffle)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
          </Select>
          </div>

          {/* Goal Amount - shown for both types */}
          <div className="space-y-2">
            <Label htmlFor="goal">
              Goal Amount {type === "fund" ? "(Optional)" : ""}
            </Label>
            <Input
              id="goal"
              type="number"
              min={0}
              step={0.01}
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              {type === "fund" 
                ? "Optional - leave empty for unlimited fund" 
                : "Set a fundraising target for your drive"}
            </p>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2 pb-2">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          {/* End Date - only for drives */}
          {type === "drive" && (
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCampaignMutation.mutate()}
              disabled={!name.trim() || createCampaignMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
