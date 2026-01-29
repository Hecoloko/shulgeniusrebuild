import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet, CreditCard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  member_id: string;
}

interface RecordPaymentModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentTab = "manual" | "stripe" | "sola";

export function RecordPaymentModal({ invoice, open, onOpenChange }: RecordPaymentModalProps) {
  const { orgId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PaymentTab>("manual");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedProcessorId, setSelectedProcessorId] = useState("");

  // Fetch payment processors
  const { data: processors } = useQuery({
    queryKey: ["payment-processors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  const stripeProcessors = processors?.filter((p) => p.processor_type === "stripe") || [];
  const cardknoxProcessors = processors?.filter((p) => p.processor_type === "cardknox") || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Record manual payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !invoice) throw new Error("Missing required data");
      
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }

      const { error } = await supabase.from("payments").insert({
        organization_id: orgId,
        member_id: invoice.member_id,
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        processor: activeTab === "manual" ? null : activeTab,
        processor_transaction_id: referenceNumber || null,
        notes: `Payment for ${invoice.invoice_number}`,
      });

      if (error) throw error;

      // Update invoice status if fully paid
      // For now, we'll mark it as paid if the payment equals or exceeds total
      if (paymentAmount >= invoice.total) {
        await supabase
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", invoice.id);
      }

      return true;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const resetForm = () => {
    setAmount("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("cash");
    setReferenceNumber("");
    setSelectedProcessorId("");
    setActiveTab("manual");
  };

  const handleRecordPayment = () => {
    if (activeTab === "manual") {
      recordPaymentMutation.mutate();
    } else {
      // For Stripe/Sola, we would integrate with the actual processors
      // For now, we show a placeholder message
      toast.info("Processor payments coming soon - use manual payment for now");
    }
  };

  if (!invoice) return null;

  const balance = invoice.total; // This should account for previous payments

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Record Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoice_number} - Balance: {formatCurrency(balance)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PaymentTab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <Wallet className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="stripe" className="gap-2" disabled={stripeProcessors.length === 0}>
              <CreditCard className="h-4 w-4" />
              Stripe
            </TabsTrigger>
            <TabsTrigger value="sola" className="gap-2" disabled={cardknoxProcessors.length === 0}>
              <CreditCard className="h-4 w-4" />
              Sola
            </TabsTrigger>
          </TabsList>

          {/* Manual Payment Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Check number, transaction ID, etc."
              />
            </div>
          </TabsContent>

          {/* Stripe Payment Tab */}
          <TabsContent value="stripe" className="space-y-4 mt-4">
            {stripeProcessors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No Stripe processors configured</p>
                <p className="text-sm mt-1">Add a Stripe processor in Settings → Financial</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stripeProcessor">Select Processor *</Label>
                  <Select value={selectedProcessorId} onValueChange={setSelectedProcessorId}>
                    <SelectTrigger id="stripeProcessor">
                      <SelectValue placeholder="Select Stripe account" />
                    </SelectTrigger>
                    <SelectContent>
                      {stripeProcessors.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripeAmount">Amount *</Label>
                  <Input
                    id="stripeAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p>Card payment will be processed using the selected Stripe account.</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Sola/Cardknox Payment Tab */}
          <TabsContent value="sola" className="space-y-4 mt-4">
            {cardknoxProcessors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No Sola/Cardknox processors configured</p>
                <p className="text-sm mt-1">Add a Cardknox processor in Settings → Financial</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="solaProcessor">Select Processor *</Label>
                  <Select value={selectedProcessorId} onValueChange={setSelectedProcessorId}>
                    <SelectTrigger id="solaProcessor">
                      <SelectValue placeholder="Select Sola account" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardknoxProcessors.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solaAmount">Amount *</Label>
                  <Input
                    id="solaAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p>Card payment will be processed using the selected Sola/Cardknox account.</p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRecordPayment}
            disabled={!amount || recordPaymentMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
