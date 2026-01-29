import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddSubscriptionModalProps {
  member: {
    id: string;
    organization_id: string;
    first_name: string;
    last_name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentType = "recurring" | "installments";
type BillingMethod = "invoiced" | "auto_cc";
type Frequency = "daily" | "weekly" | "monthly" | "monthly_hebrew" | "quarterly" | "annual";

export function AddSubscriptionModal({ member, open, onOpenChange }: AddSubscriptionModalProps) {
  const queryClient = useQueryClient();

  const [campaignId, setCampaignId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("recurring");
  const [billingMethod, setBillingMethod] = useState<BillingMethod>("invoiced");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [installmentsTotal, setInstallmentsTotal] = useState("");

  // Fetch campaigns for this organization
  const { data: campaigns } = useQuery({
    queryKey: ["org-campaigns", member.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("organization_id", member.organization_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch payment methods for this member (for auto_cc option)
  const { data: paymentMethods } = useQuery({
    queryKey: ["member-payment-methods", member.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("member_id", member.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && billingMethod === "auto_cc",
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      if (!campaignId) {
        throw new Error("Please select a campaign");
      }

      if (paymentType === "installments") {
        const installments = parseInt(installmentsTotal);
        if (isNaN(installments) || installments < 2) {
          throw new Error("Installments must be at least 2");
        }
      }

      // Get default payment method if auto_cc is selected
      let paymentMethodId = null;
      if (billingMethod === "auto_cc" && paymentMethods && paymentMethods.length > 0) {
        const defaultMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
        paymentMethodId = defaultMethod.id;
      }

      const { error } = await supabase.from("subscriptions").insert({
        organization_id: member.organization_id,
        member_id: member.id,
        campaign_id: campaignId,
        total_amount: amount,
        payment_type: paymentType,
        billing_method: billingMethod,
        frequency,
        installments_total: paymentType === "installments" ? parseInt(installmentsTotal) : null,
        payment_method_id: paymentMethodId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-subscriptions", member.id] });
      toast.success("Subscription created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setCampaignId("");
    setTotalAmount("");
    setPaymentType("recurring");
    setBillingMethod("invoiced");
    setFrequency("monthly");
    setInstallmentsTotal("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^\d.]/g, "");
    const parts = num.split(".");
    if (parts.length > 2) return parts[0] + "." + parts[1];
    if (parts[1]?.length > 2) return parts[0] + "." + parts[1].slice(0, 2);
    return num;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>
            Set up recurring membership dues, pledges, or installment payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Campaign Select */}
          <div className="space-y-2">
            <Label>Campaign *</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {campaigns?.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label>Total Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="text"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(formatAmount(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>

          {/* Payment Type Toggle */}
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentType === "recurring" ? "default" : "outline"}
                onClick={() => setPaymentType("recurring")}
                className="w-full"
              >
                Recurring
              </Button>
              <Button
                type="button"
                variant={paymentType === "installments" ? "default" : "outline"}
                onClick={() => setPaymentType("installments")}
                className="w-full"
              >
                Installments
              </Button>
            </div>
          </div>

          {/* Installments Count (only if installments selected) */}
          {paymentType === "installments" && (
            <div className="space-y-2">
              <Label>Number of Installments *</Label>
              <Input
                type="number"
                placeholder="12"
                min="2"
                value={installmentsTotal}
                onChange={(e) => setInstallmentsTotal(e.target.value)}
              />
            </div>
          )}

          {/* Billing Method Toggle */}
          <div className="space-y-2">
            <Label>Billing Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={billingMethod === "invoiced" ? "default" : "outline"}
                onClick={() => setBillingMethod("invoiced")}
                className="w-full"
              >
                Invoiced
              </Button>
              <Button
                type="button"
                variant={billingMethod === "auto_cc" ? "default" : "outline"}
                onClick={() => setBillingMethod("auto_cc")}
                className="w-full"
              >
                Auto CC
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {billingMethod === "invoiced"
                ? "Invoice will be generated for manual payment"
                : "Card on file will be charged automatically"}
            </p>
          </div>

          {/* Frequency Options */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "monthly", label: "Monthly" },
                { value: "monthly_hebrew", label: "Monthly (Hebrew)" },
                { value: "weekly", label: "Weekly" },
                { value: "daily", label: "Daily" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annual", label: "Annual" },
              ].map((freq) => (
                <Button
                  key={freq.value}
                  type="button"
                  variant={frequency === freq.value ? "default" : "outline"}
                  onClick={() => setFrequency(freq.value as Frequency)}
                  className={cn(
                    "w-full text-xs",
                    frequency === freq.value && "ring-2 ring-primary ring-offset-2"
                  )}
                  size="sm"
                >
                  {freq.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createSubscriptionMutation.mutate()}
            disabled={createSubscriptionMutation.isPending || !campaignId || !totalAmount}
          >
            {createSubscriptionMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
