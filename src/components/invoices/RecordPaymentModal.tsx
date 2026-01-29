import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet, CreditCard, Info } from "lucide-react";

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

  // Fetch existing payments for this invoice to calculate balance
  const { data: existingPayments } = useQuery({
    queryKey: ["invoice-payments", invoice?.id],
    queryFn: async () => {
      if (!invoice?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoice.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoice?.id && open,
  });

  const stripeProcessors = processors?.filter((p) => p.processor_type === "stripe") || [];
  const cardknoxProcessors = processors?.filter((p) => p.processor_type === "cardknox") || [];

  // Calculate already paid amount and remaining balance
  const paidAmount = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const balance = invoice ? invoice.total - paidAmount : 0;

  // Set default amount to remaining balance when modal opens
  useEffect(() => {
    if (open && balance > 0) {
      setAmount(balance.toFixed(2));
    }
  }, [open, balance]);

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

      // Calculate new total paid including this payment
      const newTotalPaid = paidAmount + paymentAmount;
      
      // Determine new status based on total payments vs invoice total
      let newStatus: "paid" | "partially_paid";
      let paidAt: string | null = null;
      
      if (newTotalPaid >= invoice.total) {
        newStatus = "paid";
        paidAt = new Date().toISOString();
      } else {
        newStatus = "partially_paid";
      }

      await supabase
        .from("invoices")
        .update({ status: newStatus, paid_at: paidAt })
        .eq("id", invoice.id);

      return true;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice?.id] });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Record Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoice_number} - Balance: {formatCurrency(balance)}
          </DialogDescription>
        </DialogHeader>

        {/* Processor Recommendation Banner */}
        {(stripeProcessors.length > 0 || cardknoxProcessors.length > 0) && (
          <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">We recommend Sola for payments</p>
              <p className="text-muted-foreground">Lower fees and faster settlement times</p>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        {paidAmount > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Already Paid:</span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Remaining Balance:</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </div>
        )}

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