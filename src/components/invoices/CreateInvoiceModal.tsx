import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LineItem {
  id: string;
  billing_item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceModal({ open, onOpenChange }: CreateInvoiceModalProps) {
  const { orgId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Form state
  const [memberId, setMemberId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), billing_item_id: "", description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  // Fetch members
  const { data: members } = useQuery({
    queryKey: ["members-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("last_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Fetch campaigns
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Fetch billing items for line item selection
  const { data: billingItems } = useQuery({
    queryKey: ["billing-items-select", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("billing_items")
        .select("id, name, amount, description")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Calculate total
  const invoiceTotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `INV-${timestamp}`;
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !memberId) throw new Error("Missing required fields");

      // Filter out empty line items
      const validLineItems = lineItems.filter((item) => item.description && item.unit_price > 0);
      if (validLineItems.length === 0) throw new Error("At least one line item is required");

      const subtotal = validLineItems.reduce((sum, item) => sum + item.total, 0);

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: orgId,
          member_id: memberId,
          invoice_number: generateInvoiceNumber(),
          due_date: dueDate || null,
          notes: notes || null,
          subtotal,
          tax: 0,
          total: subtotal,
          status: sendEmail ? "sent" : "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = validLineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      toast.success("Invoice created successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });

  const resetForm = () => {
    setMemberId("");
    setCampaignId("");
    setDueDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    setNotes("");
    setSendEmail(true);
    setLineItems([
      { id: crypto.randomUUID(), billing_item_id: "", description: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  // Handle billing item selection
  const handleBillingItemChange = (lineItemId: string, billingItemId: string) => {
    const billingItem = billingItems?.find((bi) => bi.id === billingItemId);
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              billing_item_id: billingItemId,
              description: billingItem?.name || "",
              unit_price: billingItem?.amount || 0,
              total: (billingItem?.amount || 0) * item.quantity,
            }
          : item
      )
    );
  };

  // Handle quantity change
  const handleQuantityChange = (lineItemId: string, quantity: number) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? { ...item, quantity, total: item.unit_price * quantity }
          : item
      )
    );
  };

  // Handle price change
  const handlePriceChange = (lineItemId: string, price: number) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? { ...item, unit_price: price, total: price * item.quantity }
          : item
      )
    );
  };

  // Add line item
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), billing_item_id: "", description: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Invoice</DialogTitle>
          <DialogDescription>Create an invoice for a member</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Member and Campaign Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member">Member *</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="member" className="border-2 border-primary/30">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign *</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger id="campaign">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-1/2"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional invoice notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 bg-muted/50 px-3 py-2 text-sm font-medium text-primary">
                <div className="col-span-5">Item</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t items-center">
                  <div className="col-span-5">
                    <Select
                      value={item.billing_item_id}
                      onValueChange={(value) => handleBillingItemChange(item.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {billingItems?.map((bi) => (
                          <SelectItem key={bi.id} value={bi.id}>
                            {bi.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 font-mono text-sm">
                    {formatCurrency(item.total)}
                  </div>
                  <div className="col-span-1">
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                Send invoice email to member
              </Label>
            </div>

            <div className="text-right">
              <span className="text-muted-foreground mr-2">Total:</span>
              <span className="text-2xl font-semibold">{formatCurrency(invoiceTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createInvoiceMutation.mutate()}
              disabled={!memberId || createInvoiceMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
