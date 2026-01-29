import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, Plus, Play, Clock, Trash2, Edit, Zap, 
  Loader2, DollarSign, Package, RefreshCw, Check, X
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

export function FinancialTab() {
  const { orgId, isLoading: orgLoading, noOrgExists } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Dialog states
  const [processorOpen, setProcessorOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Processor form
  const [processorType, setProcessorType] = useState<ProcessorType>("stripe");
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

  // Fetch organization settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["org-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  // Build processors list
  const processors = [];
  if (settings?.stripe_account_id) {
    processors.push({
      id: "stripe",
      name: "Stripe",
      type: "Stripe",
      accountId: settings.stripe_account_id,
      isActive: settings.active_processor === "stripe"
    });
  }
  if (settings?.cardknox_ifields_key) {
    processors.push({
      id: "cardknox",
      name: "Cardknox",
      type: "Cardknox",
      accountId: settings.cardknox_ifields_key,
      isActive: settings.active_processor === "cardknox"
    });
  }

  // Add/Update processor mutation
  const processorMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");

      const updateData: any = {};
      if (processorType === "stripe") {
        if (!stripeAccountId) throw new Error("Stripe Account ID required");
        updateData.stripe_account_id = stripeAccountId;
        updateData.stripe_publishable_key = stripePublishableKey;
      } else {
        if (!cardknoxIfieldsKey || !cardknoxTransactionKey) throw new Error("Cardknox credentials required");
        updateData.cardknox_ifields_key = cardknoxIfieldsKey;
        updateData.cardknox_transaction_key = cardknoxTransactionKey;
      }

      // Check if settings exist
      if (settings) {
        const { error } = await supabase
          .from("organization_settings")
          .update(updateData)
          .eq("organization_id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert({ organization_id: orgId, ...updateData });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings", orgId] });
      toast.success(`${processorType === "stripe" ? "Stripe" : "Cardknox"} connected successfully`);
      setProcessorOpen(false);
      resetProcessorForm();
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Set default processor mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (processor: ProcessorType) => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase
        .from("organization_settings")
        .update({ active_processor: processor })
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings", orgId] });
      toast.success("Default processor updated");
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
    setStripeAccountId("");
    setStripePublishableKey("");
    setCardknoxIfieldsKey("");
    setCardknoxTransactionKey("");
    setProcessorType("stripe");
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

  const isLoading = orgLoading || settingsLoading || itemsLoading;

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
              Connect payment gateways and select your default processor
            </CardDescription>
          </div>

          {/* Add Processor Dialog */}
          <Dialog open={processorOpen} onOpenChange={setProcessorOpen}>
            <DialogTrigger asChild>
              <Button className="btn-royal" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Processor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Payment Processor</DialogTitle>
                <DialogDescription>
                  Add your payment gateway credentials
                </DialogDescription>
              </DialogHeader>

              <Tabs value={processorType} onValueChange={(v) => setProcessorType(v as ProcessorType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stripe">Stripe</TabsTrigger>
                  <TabsTrigger value="cardknox">Cardknox</TabsTrigger>
                </TabsList>

                <TabsContent value="stripe" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripe-account">Account ID *</Label>
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
                </TabsContent>

                <TabsContent value="cardknox" className="space-y-4 pt-4">
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
                </TabsContent>
              </Tabs>

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
                  Connect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {processors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No payment processors configured</p>
              <p className="text-sm mt-1">Add a processor to start accepting payments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processor</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processors.map((processor) => (
                  <TableRow key={processor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {processor.isActive && <Zap className="h-4 w-4 text-gold" />}
                        {processor.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {processor.accountId.slice(0, 15)}...
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        processor.isActive 
                          ? "bg-success/10 text-success" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {processor.isActive ? "Default" : "Connected"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {!processor.isActive && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(processor.id as ProcessorType)}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                    placeholder="Annual family membership"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-amount">Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="item-amount"
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        className="pl-9"
                        value={itemAmount}
                        onChange={(e) => setItemAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={itemType} onValueChange={(v) => setItemType(v as ItemType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-time</SelectItem>
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
                  disabled={addItemMutation.isPending || !itemName || !itemAmount}
                >
                  {addItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {!billingItems?.length ? (
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
                  <TableHead>Interval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.type === "subscription" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {item.type === "subscription" ? (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Recurring
                          </span>
                        ) : "One-time"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {item.billing_interval || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
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

      {/* Recurring Billing Info */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automated Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Automated Schedule</p>
              <p className="text-sm text-muted-foreground">
                Recurring billing runs automatically every day at 2:00 AM UTC. 
                The system processes all active subscriptions with due dates of today or earlier.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Item Confirmation */}
      <AlertDialog open={deleteItemOpen} onOpenChange={setDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedItem?.name}</strong>? 
              This cannot be undone.
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
