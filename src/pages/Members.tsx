import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Users, Plus, Search, CreditCard, Mail, Phone,
  Loader2, MoreHorizontal, ChevronRight, Wallet, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Members() {
  const { orgId, isLoading: orgLoading } = useCurrentOrg();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  
  // New member form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Add card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [selectedProcessor, setSelectedProcessor] = useState<string>("");

  // Fetch members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["members", orgId, search],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("members")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch organization settings for processor info
  const { data: settings } = useQuery({
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

  // Fetch organization for name and slug
  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch payment methods for selected member
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods", selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember?.id) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("member_id", selectedMember.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMember?.id,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!firstName || !lastName || !email) throw new Error("Name and email required");
      
      const { data, error } = await supabase
        .from("members")
        .insert({
          organization_id: orgId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      toast.success("Member added successfully");
      setAddMemberOpen(false);
      resetMemberForm();
      
      // Auto-create in Cardknox if configured
      if (settings?.cardknox_transaction_key) {
        createCardknoxCustomer(member);
      }
      
      // Send invite email
      sendMemberInviteEmail(member);
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Send member invite email
  const sendMemberInviteEmail = async (member: any) => {
    try {
      if (!org) return;
      
      const portalUrl = `${window.location.origin}/s/${org.slug}`;
      
      const response = await supabase.functions.invoke("send-email", {
        body: {
          type: "member_invite",
          to: member.email,
          shulName: org.name,
          memberName: `${member.first_name} ${member.last_name}`,
          portalUrl,
          adminEmail: org.email,
        },
      });
      
      if (response.error) {
        console.error("Email send error:", response.error);
      } else {
        toast.success("Invite email sent to " + member.email);
      }
    } catch (err) {
      console.error("Email error:", err);
    }
  };

  // Create Cardknox customer
  const createCardknoxCustomer = async (member: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await supabase.functions.invoke("cardknox-customer", {
        body: {
          action: "create_customer",
          organizationId: orgId,
          memberId: member.id,
          memberEmail: member.email,
          memberName: `${member.first_name} ${member.last_name}`,
        },
      });
      
      if (response.error) {
        console.error("Cardknox customer creation error:", response.error);
      } else {
        toast.success("Member synced to Cardknox");
      }
    } catch (err) {
      console.error("Cardknox sync error:", err);
    }
  };

  // Add card mutation (for Cardknox)
  const addCardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !cardNumber || !cardExp) {
        throw new Error("Card details required");
      }
      
      // For a real implementation, you'd use Cardknox iFields for secure tokenization
      // This is a simplified version that would need the iFields SDK integration
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      
      // In production, cardNumber would be tokenized client-side using iFields
      // For now, we'll simulate with a token
      const response = await supabase.functions.invoke("cardknox-customer", {
        body: {
          action: "save_card",
          organizationId: orgId,
          memberId: selectedMember.id,
          memberEmail: selectedMember.email,
          memberName: `${selectedMember.first_name} ${selectedMember.last_name}`,
          cardToken: cardNumber, // In production, this would be an iFields token
          cardExp: cardExp.replace("/", ""), // Convert MM/YY to MMYY
        },
      });
      
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods", selectedMember?.id] });
      toast.success("Card added successfully and synced to Cardknox");
      setAddCardOpen(false);
      resetCardForm();
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  const resetMemberForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  };

  const resetCardForm = () => {
    setCardNumber("");
    setCardExp("");
    setCardCvv("");
    setSelectedProcessor("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const availableProcessors = [];
  if (settings?.cardknox_transaction_key) {
    availableProcessors.push({ id: "cardknox", name: "Cardknox" });
  }
  if (settings?.stripe_account_id) {
    availableProcessors.push({ id: "stripe", name: "Stripe" });
  }

  const isLoading = orgLoading || membersLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-gold" />
              Members
            </h1>
            <p className="text-muted-foreground">
              Manage your congregation members and payment methods
            </p>
          </div>
          
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogTrigger asChild>
              <Button className="btn-royal">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>
                  Add a new member to your congregation
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Cohen"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email *</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="memberPhone">Phone</Label>
                  <Input
                    id="memberPhone"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="btn-gold"
                  onClick={() => addMemberMutation.mutate()}
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Members Table */}
        <Card className="premium-card">
          <CardContent className="p-0">
            {members && members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedMember(member)}
                    >
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.balance > 0 ? "destructive" : "secondary"}
                          className={member.balance === 0 ? "bg-success/10 text-success" : ""}
                        >
                          {formatCurrency(member.balance)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No members yet</p>
                <p className="text-sm mt-1">Add your first member to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Detail Sheet */}
        <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedMember?.first_name} {selectedMember?.last_name}
              </SheetTitle>
              <SheetDescription>
                Member details and payment methods
              </SheetDescription>
            </SheetHeader>

            {selectedMember && (
              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selectedMember.email}
                    </div>
                    {selectedMember.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedMember.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Account Balance
                  </h3>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedMember.balance)}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Payment Methods
                    </h3>
                    {availableProcessors.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddCardOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Card
                      </Button>
                    )}
                  </div>

                  {paymentMethods && paymentMethods.length > 0 ? (
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => (
                        <div
                          key={pm.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {pm.card_brand} •••• {pm.card_last_four}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Exp: {pm.exp_month}/{pm.exp_year} • {pm.processor}
                              </p>
                            </div>
                          </div>
                          {pm.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
                      <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payment methods on file</p>
                      {availableProcessors.length === 0 && (
                        <p className="text-xs mt-1">Configure a payment processor in Settings first</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Add Card Dialog */}
        <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Card</DialogTitle>
              <DialogDescription>
                Add a card for {selectedMember?.first_name} {selectedMember?.last_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Payment Processor</Label>
                <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select processor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProcessors.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProcessor === "cardknox" && (
                <>
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
                    <p>For production use, this would use Cardknox iFields for secure card entry.</p>
                    <p className="mt-1">Cards saved here sync directly to your Cardknox/Sola dashboard.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardExp">Expiration</Label>
                      <Input
                        id="cardExp"
                        placeholder="MM/YY"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCvv">CVV</Label>
                      <Input
                        id="cardCvv"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedProcessor === "stripe" && (
                <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
                  Stripe card entry coming soon. Configure Cardknox for immediate use.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCardOpen(false)}>
                Cancel
              </Button>
              <Button
                className="btn-gold"
                onClick={() => addCardMutation.mutate()}
                disabled={addCardMutation.isPending || !selectedProcessor || selectedProcessor === "stripe"}
              >
                {addCardMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
