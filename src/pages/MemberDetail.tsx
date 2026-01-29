import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft, LayoutDashboard, LogOut, Mail, Phone, MapPin,
  DollarSign, FileText, CreditCard, Users, Calendar, Receipt,
  Pencil, Plus, Loader2, Building2, Trash2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AddCardModal } from "@/components/members/AddCardModal";
import { AddSubscriptionModal } from "@/components/members/AddSubscriptionModal";

export default function MemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId } = useCurrentOrg();
  const { signOut } = useAuth();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [addSubscriptionOpen, setAddSubscriptionOpen] = useState(false);
  const [processingSubscriptionId, setProcessingSubscriptionId] = useState<string | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<{
    id: string;
    campaignName: string;
    amount: number;
    frequency: string;
  } | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch member details
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["member-detail", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch organization
  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch invoices for this member
  const { data: invoices } = useQuery({
    queryKey: ["member-invoices", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  // Fetch payments for this member
  const { data: payments } = useQuery({
    queryKey: ["member-payments", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  // Fetch payment methods for this member
  const { data: paymentMethods } = useQuery({
    queryKey: ["member-payment-methods", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("member_id", memberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  // Fetch subscriptions for this member
  const { data: subscriptions } = useQuery({
    queryKey: ["member-subscriptions", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, campaigns(name)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  const { data: familyMembers } = useQuery({
    queryKey: ["family-members", memberId, member?.family_head_id],
    queryFn: async () => {
      if (!memberId || !orgId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("organization_id", orgId)
        .or(`family_head_id.eq.${memberId},family_head_id.eq.${member?.family_head_id || memberId},id.eq.${member?.family_head_id || memberId}`)
        .neq("id", memberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && !!orgId,
  });

  // Calculate totals
  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const totalPaid = payments?.reduce((sum, pmt) => sum + (pmt.amount || 0), 0) || 0;
  const outstanding = member?.balance || 0;

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("No member ID");
      const { error } = await supabase
        .from("members")
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          phone: editPhone || null,
          address: editAddress || null,
          notes: editNotes || null,
        })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-detail", memberId] });
      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update: " + err.message);
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!memberId || !orgId) throw new Error("Missing data");
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        member_id: memberId,
        organization_id: orgId,
        amount,
        payment_method: "manual",
        notes: paymentNotes || null,
      });
      if (paymentError) throw paymentError;

      // Update member balance
      const { error: balanceError } = await supabase
        .from("members")
        .update({ balance: Math.max(0, (member?.balance || 0) - amount) })
        .eq("id", memberId);
      if (balanceError) throw balanceError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-detail", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-payments", memberId] });
      toast.success("Payment recorded successfully");
      setRecordPaymentOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
    },
    onError: (err: Error) => {
      toast.error("Failed to record payment: " + err.message);
    },
  });

  // Test billing mutation - process a subscription payment
  const testBillingMutation = useMutation({
    mutationFn: async (subscription: {
      id: string;
      total_amount: number;
      campaigns: { name: string } | null;
    }) => {
      if (!memberId || !orgId) throw new Error("Missing data");

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          subscriptionId: subscription.id,
          memberId: memberId,
          organizationId: orgId,
          amount: Number(subscription.total_amount),
          description: `${subscription.campaigns?.name || "Subscription"} - Test billing`,
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["member-subscriptions", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-invoices", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-payments", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-detail", memberId] });
      toast.success(`Payment processed successfully! Transaction ID: ${data.transactionId}`);
      setProcessingSubscriptionId(null);
    },
    onError: (err: Error) => {
      toast.error("Payment failed: " + err.message);
      setProcessingSubscriptionId(null);
    },
  });

  // Delete subscription mutation
  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-subscriptions", memberId] });
      toast.success("Subscription deleted successfully");
      setDeletingSubscription(null);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete subscription: " + err.message);
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", paymentMethodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-payment-methods", memberId] });
      toast.success("Card deleted successfully");
      setDeletingCardId(null);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete card: " + err.message);
    },
  });

  const openEditDialog = () => {
    if (member) {
      setEditFirstName(member.first_name);
      setEditLastName(member.last_name);
      setEditEmail(member.email);
      setEditPhone(member.phone || "");
      setEditAddress(member.address || "");
      setEditNotes(member.notes || "");
      setEditProfileOpen(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (memberLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Member Not Found</CardTitle>
            <CardDescription>The member you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/members">Back to Members</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{org?.name || "Organization"}</p>
                <p className="text-xs text-muted-foreground">Member Details</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="gap-2">
                <Link to="/members">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Members
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">Dashboard</Link>
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Member Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {member.first_name} {member.last_name}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Account Balance</p>
                  <p className={`text-3xl font-bold ${outstanding > 0 ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(outstanding)}
                  </p>
                  <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-3 gap-2">
                        <DollarSign className="h-4 w-4" />
                        Record Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                          Record a manual payment for {member.first_name} {member.last_name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="Payment notes..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => recordPaymentMutation.mutate()}
                          disabled={recordPaymentMutation.isPending}
                        >
                          {recordPaymentMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Record Payment
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Invoiced</p>
                    <p className="font-semibold">{formatCurrency(totalInvoiced)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="font-semibold text-success">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className={`font-semibold ${outstanding > 0 ? "text-destructive" : "text-success"}`}>
                      {formatCurrency(outstanding)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start bg-background border-b rounded-none h-auto p-0">
              <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Profile
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Invoices
              </TabsTrigger>
              <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Payments
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Subscriptions
              </TabsTrigger>
              <TabsTrigger value="cards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Cards
              </TabsTrigger>
              <TabsTrigger value="family" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Family
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>View and manage member details</CardDescription>
                  </div>
                  <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openEditDialog} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update member information
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input
                              value={editFirstName}
                              onChange={(e) => setEditFirstName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                              value={editLastName}
                              onChange={(e) => setEditLastName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Textarea
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => updateMemberMutation.mutate()}
                          disabled={updateMemberMutation.isPending}
                        >
                          {updateMemberMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-foreground">{member.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="text-foreground">{member.phone || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="text-foreground">{member.address || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Additional Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Membership Type</p>
                          <p className="text-foreground">{member.membership_type || "Individual"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Member Since</p>
                          <p className="text-foreground">{formatDate(member.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {member.notes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Notes</p>
                            <p className="text-foreground">{member.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>{invoices?.length || 0} invoice(s)</CardDescription>
                  </div>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Button>
                </CardHeader>
                <CardContent>
                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(invoice.created_at)}
                              {invoice.due_date && ` • Due ${formatDate(invoice.due_date)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                            <Badge
                              variant={
                                invoice.status === "paid"
                                  ? "default"
                                  : invoice.status === "overdue"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>{payments?.length || 0} payment(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments && payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(payment.created_at)}
                              {payment.payment_method && ` • ${payment.payment_method}`}
                            </p>
                            {payment.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{payment.notes}</p>
                            )}
                          </div>
                          <Badge variant="default" className="bg-success">Paid</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No payments recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Subscriptions</CardTitle>
                    <CardDescription>
                      {subscriptions?.filter(s => s.is_active).length || 0} active subscription(s)
                    </CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => setAddSubscriptionOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Subscription
                  </Button>
                </CardHeader>
                <CardContent>
                  {subscriptions && subscriptions.length > 0 ? (
                    <div className="space-y-3">
                      {subscriptions.map((sub) => {
                        const campaignName = (sub.campaigns as { name: string } | null)?.name || "General";
                        const canTestBilling = sub.billing_method === "auto_cc" && sub.payment_method_id && sub.is_active;
                        const isProcessing = processingSubscriptionId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{campaignName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(Number(sub.total_amount))} • {sub.frequency.replace("_", " ")}
                                  {sub.payment_type === "installments" && 
                                    ` • ${sub.installments_paid}/${sub.installments_total} paid`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Test Billing Button - only for Auto CC with linked payment method */}
                              {canTestBilling && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  disabled={isProcessing || testBillingMutation.isPending}
                                  onClick={() => {
                                    setProcessingSubscriptionId(sub.id);
                                    testBillingMutation.mutate({
                                      id: sub.id,
                                      total_amount: sub.total_amount,
                                      campaigns: sub.campaigns as { name: string } | null,
                                    });
                                  }}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Zap className="h-3 w-3" />
                                  )}
                                  Test Billing
                                </Button>
                              )}

                              {/* Delete Button with Confirmation */}
                              <AlertDialog 
                                open={deletingSubscription?.id === sub.id}
                                onOpenChange={(open) => !open && setDeletingSubscription(null)}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeletingSubscription({
                                      id: sub.id,
                                      campaignName,
                                      amount: Number(sub.total_amount),
                                      frequency: sub.frequency,
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this subscription?
                                      <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <p className="font-medium">{deletingSubscription?.campaignName}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {deletingSubscription && formatCurrency(deletingSubscription.amount)} / {deletingSubscription?.frequency.replace("_", " ")}
                                        </p>
                                      </div>
                                      <p className="mt-4 text-destructive font-medium">
                                        This action cannot be undone.
                                      </p>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => {
                                        if (deletingSubscription) {
                                          deleteSubscriptionMutation.mutate(deletingSubscription.id);
                                        }
                                      }}
                                      disabled={deleteSubscriptionMutation.isPending}
                                    >
                                      {deleteSubscriptionMutation.isPending && (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      )}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <Badge variant={sub.billing_method === "auto_cc" ? "default" : "secondary"}>
                                {sub.billing_method === "auto_cc" ? "Auto CC" : "Invoiced"}
                              </Badge>
                              <Badge variant={sub.is_active ? "default" : "destructive"}>
                                {sub.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No active subscriptions</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Subscription Modal */}
              <AddSubscriptionModal
                member={member}
                open={addSubscriptionOpen}
                onOpenChange={setAddSubscriptionOpen}
              />
            </TabsContent>

            {/* Cards Tab */}
            <TabsContent value="cards" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>{paymentMethods?.length || 0} card(s) on file</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={() => setAddCardOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Card
                  </Button>
                </CardHeader>
                <CardContent>
                  {paymentMethods && paymentMethods.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {paymentMethods.map((pm) => {
                        const displayName = pm.nickname 
                          ? `${pm.nickname} - ${pm.card_brand || "Card"} •••• ${pm.card_last_four}`
                          : `${pm.card_brand || "Card"} •••• ${pm.card_last_four}`;
                        
                        return (
                          <div
                            key={pm.id}
                            className="flex items-center gap-4 p-4 border rounded-lg"
                          >
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <CreditCard className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{displayName}</p>
                              <p className="text-sm text-muted-foreground">
                                Expires {pm.exp_month}/{pm.exp_year}
                              </p>
                            </div>
                            {pm.is_default && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <AlertDialog 
                              open={deletingCardId === pm.id}
                              onOpenChange={(open) => !open && setDeletingCardId(null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingCardId(pm.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this payment method?
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                      <p className="font-medium">{displayName}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Expires {pm.exp_month}/{pm.exp_year}
                                      </p>
                                    </div>
                                    <p className="mt-4 text-destructive font-medium">
                                      This action cannot be undone.
                                    </p>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deletePaymentMethodMutation.mutate(pm.id)}
                                    disabled={deletePaymentMethodMutation.isPending}
                                  >
                                    {deletePaymentMethodMutation.isPending && (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No payment methods on file</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Add Card Modal */}
              <AddCardModal
                member={member}
                open={addCardOpen}
                onOpenChange={setAddCardOpen}
              />
            </TabsContent>

            {/* Family Tab */}
            <TabsContent value="family" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Family Members</CardTitle>
                    <CardDescription>Linked family accounts</CardDescription>
                  </div>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Link Family Member
                  </Button>
                </CardHeader>
                <CardContent>
                  {familyMembers && familyMembers.length > 0 ? (
                    <div className="space-y-3">
                      {familyMembers.map((fm) => (
                        <div
                          key={fm.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/members/${fm.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {fm.first_name} {fm.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{fm.email}</p>
                            </div>
                          </div>
                          <Badge variant={fm.is_active ? "default" : "secondary"}>
                            {fm.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No family members linked</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
