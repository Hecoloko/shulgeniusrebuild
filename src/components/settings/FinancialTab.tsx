import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, Plus, Trash2, Zap, 
  Loader2, Package, Check, Edit2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProcessorType = "stripe" | "cardknox";
type ItemType = "subscription" | "one_time";
type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly";

interface PaymentProcessor {
  id: string;
  organization_id: string;
  name: string;
  processor_type: ProcessorType;
  is_default: boolean;
  credentials: {
    ifields_key?: string;
    transaction_key?: string;
    account_id?: string;
    publishable_key?: string;
  };
  is_active: boolean;
  created_at: string;
}

export function FinancialTab() {
  const { orgId, isLoading: orgLoading, noOrgExists } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Dialog states
  const [processorOpen, setProcessorOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [deleteProcessorOpen, setDeleteProcessorOpen] = useState(false);
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState<PaymentProcessor | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // Processor form
  const [processorName, setProcessorName] = useState("");
  const [processorType, setProcessorType] = useState<ProcessorType>("cardknox");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [cardknoxIfieldsKey, setCardknoxIfieldsKey] = useState("");
  const [cardknoxTransactionKey, setCardknoxTransactionKey] = useState("");

  // Item form
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemType, setItemType] = useState<ItemType>("one_time");
  const [itemInterval, setItemInterval] = useState<BillingInterval>("monthly");

  // Fetch payment processors
  const { data: processors, isLoading: processorsLoading } = useQuery({
    queryKey: ["payment-processors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("payment_processors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentProcessor[];
    },
    enabled: !!orgId,
  });

  // Fetch billing items
  const { data: billingItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["billing-items", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("billing_items")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Add/Update processor mutation
  const processorMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!processorName.trim()) throw new Error("Processor name required");

      const credentials: Record<string, string> = {};
      if (processorType === "stripe") {
        if (!stripeAccountId && !stripePublishableKey) throw new Error("At least one Stripe credential required");
        if (stripeAccountId) credentials.account_id = stripeAccountId;
        if (stripePublishableKey) credentials.publishable_key = stripePublishableKey;
      } else {
        if (!cardknoxIfieldsKey || !cardknoxTransactionKey) throw new Error("Both Cardknox keys required");
        credentials.ifields_key = cardknoxIfieldsKey;
        credentials.transaction_key = cardknoxTransactionKey;
      }

      // Check if this is the first processor (make it default)
      const isFirst = !processors || processors.length === 0;

      if (editMode && selectedProcessor) {
        const { error } = await supabase
          .from("payment_processors")
          .update({
            name: processorName.trim(),
            processor_type: processorType,
            credentials,
          })
          .eq("id", selectedProcessor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_processors")
          .insert({
            organization_id: orgId,
            name: processorName.trim(),
            processor_type: processorType,
            credentials,
            is_default: isFirst,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-processors", orgId] });
      toast.success(editMode ? "Processor updated" : "Processor added successfully");
      setProcessorOpen(false);
      resetProcessorForm();
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Set default processor mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (processorId: string) => {
      if (!orgId) throw new Error("No organization");
      
      // First, unset all defaults for this org
      await supabase
        .from("payment_processors")
        .update({ is_default: false })
        .eq("organization_id", orgId);

      // Then set the new default
      const { error } = await supabase
        .from("payment_processors")
        .update({ is_default: true })
        .eq("id", processorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-processors", orgId] });
      toast.success("Default processor updated");
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Delete processor mutation
  const deleteProcessorMutation = useMutation({
    mutationFn: async (processorId: string) => {
      const { error } = await supabase
        .from("payment_processors")
        .update({ is_active: false })
        .eq("id", processorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-processors", orgId] });
      toast.success("Processor removed");
      setDeleteProcessorOpen(false);
      setSelectedProcessor(null);
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Add billing item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!itemName || !itemAmount) throw new Error("Name and amount required");

      const { error } = await supabase
        .from("billing_items")
        .insert({
          organization_id: orgId,
          name: itemName,
          description: itemDescription,
          amount: parseFloat(itemAmount),
          type: itemType,
          billing_interval: itemType === "subscription" ? itemInterval : null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-items", orgId] });
      toast.success("Billing item created");
      setItemOpen(false);
      resetItemForm();
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Delete billing item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("billing_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-items", orgId] });
      toast.success("Billing item deleted");
      setDeleteItemOpen(false);
      setSelectedItem(null);
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  const resetProcessorForm = () => {
    setProcessorName("");
    setStripeAccountId("");
    setStripePublishableKey("");
    setCardknoxIfieldsKey("");
    setCardknoxTransactionKey("");
    setProcessorType("cardknox");
    setEditMode(false);
    setSelectedProcessor(null);
  };

  const openEditProcessor = (processor: PaymentProcessor) => {
    setSelectedProcessor(processor);
    setEditMode(true);
    setProcessorName(processor.name);
    setProcessorType(processor.processor_type);
    if (processor.processor_type === "stripe") {
      setStripeAccountId(processor.credentials.account_id || "");
      setStripePublishableKey(processor.credentials.publishable_key || "");
    } else {
      setCardknoxIfieldsKey(processor.credentials.ifields_key || "");
      setCardknoxTransactionKey(processor.credentials.transaction_key || "");
    }
    setProcessorOpen(true);
  };

  const resetItemForm = () => {
    setItemName("");
    setItemDescription("");
    setItemAmount("");
    setItemType("one_time");
    setItemInterval("monthly");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const isLoading = orgLoading || processorsLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="premium-card">
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-20 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId || noOrgExists) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No organization available</p>
          <p className="text-sm mt-1">Create an organization in the General tab first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Payment Processors */}
      <Card className="premium-card border-l-4 border-l-gold">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold" />
              Payment Processors
            </CardTitle>
            <CardDescription>
              Connect multiple payment gateways and select your default
            </CardDescription>
          </div>

          {/* Add Processor Dialog */}
          <Dialog open={processorOpen} onOpenChange={(open) => {
            setProcessorOpen(open);
            if (!open) resetProcessorForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-royal" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Processor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit" : "Add"} Payment Processor</DialogTitle>
                <DialogDescription>
                  {editMode ? "Update processor credentials" : "Connect a new payment gateway"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="processor-name">Name *</Label>
                  <Input
                    id="processor-name"
                    placeholder="e.g., Primary Cardknox, Stripe Live"
                    value={processorName}
                    onChange={(e) => setProcessorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Processor Type</Label>
                  <Select 
                    value={processorType} 
                    onValueChange={(v) => setProcessorType(v as ProcessorType)}
                    disabled={editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardknox">Cardknox</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {processorType === "stripe" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-account">Account ID</Label>
                      <Input
                        id="stripe-account"
                        placeholder="acct_..."
                        value={stripeAccountId}
                        onChange={(e) => setStripeAccountId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-key">Publishable Key</Label>
                      <Input
                        id="stripe-key"
                        placeholder="pk_live_..."
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardknox-transaction">Transaction Key *</Label>
                      <Input
                        id="cardknox-transaction"
                        type="password"
                        placeholder="Your Cardknox Transaction Key"
                        value={cardknoxTransactionKey}
                        onChange={(e) => setCardknoxTransactionKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Found in Cardknox Portal → Account → Keys</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardknox-ifields">iFields Key *</Label>
                      <Input
                        id="cardknox-ifields"
                        placeholder="Your Cardknox iFields Key"
                        value={cardknoxIfieldsKey}
                        onChange={(e) => setCardknoxIfieldsKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Used for secure card tokenization</p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setProcessorOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="btn-gold"
                  onClick={() => processorMutation.mutate()}
                  disabled={processorMutation.isPending}
                >
                  {processorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editMode ? "Update" : "Add Processor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {!processors || processors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No payment processors configured</p>
              <p className="text-sm mt-1">Add a processor to start accepting payments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processors.map((processor) => (
                  <TableRow key={processor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {processor.is_default && <Zap className="h-4 w-4 text-gold" />}
                        {processor.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{processor.processor_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        processor.is_default 
                          ? "bg-success/10 text-success" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {processor.is_default ? "Default" : "Connected"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!processor.is_default && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(processor.id)}
                            disabled={setDefaultMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditProcessor(processor)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedProcessor(processor);
                            setDeleteProcessorOpen(true);
                          }}
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

      {/* Delete Processor Dialog */}
      <AlertDialog open={deleteProcessorOpen} onOpenChange={setDeleteProcessorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Processor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{selectedProcessor?.name}" from your organization. 
              Existing transactions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedProcessor && deleteProcessorMutation.mutate(selectedProcessor.id)}
            >
              {deleteProcessorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Billing Items */}
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Billing Items
            </CardTitle>
            <CardDescription>
              Create subscription plans and one-time charges for invoices
            </CardDescription>
          </div>

          {/* Add Item Dialog */}
          <Dialog open={itemOpen} onOpenChange={setItemOpen}>
            <DialogTrigger asChild>
              <Button className="btn-royal" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Billing Item</DialogTitle>
                <DialogDescription>
                  Add a subscription or one-time charge
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Name *</Label>
                  <Input
                    id="item-name"
                    placeholder="Gold Membership"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-desc">Description</Label>
                  <Input
                    id="item-desc"
                    placeholder="Optional description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-amount">Amount *</Label>
                    <Input
                      id="item-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={itemType} onValueChange={(v) => setItemType(v as ItemType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-Time</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {itemType === "subscription" && (
                  <div className="space-y-2">
                    <Label>Billing Interval</Label>
                    <Select value={itemInterval} onValueChange={(v) => setItemInterval(v as BillingInterval)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setItemOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="btn-gold"
                  onClick={() => addItemMutation.mutate()}
                  disabled={addItemMutation.isPending}
                >
                  {addItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {!billingItems || billingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No billing items created</p>
              <p className="text-sm mt-1">Add items to use in invoices</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.type === "subscription"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {item.type === "subscription" 
                          ? `${item.billing_interval}` 
                          : "One-time"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedItem(item);
                          setDeleteItemOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemOpen} onOpenChange={setDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedItem?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedItem && deleteItemMutation.mutate(selectedItem.id)}
            >
              {deleteItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
