import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Users, Plus, Search, Mail, Phone,
  Loader2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Members() {
  const { orgId, isLoading: orgLoading } = useCurrentOrg();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  
  // New member form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

  // Fetch organization settings for Cardknox check
  const { data: settings } = useQuery({
    queryKey: ["org-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organization_settings")
        .select("cardknox_transaction_key")
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

  // Send member invite email with password setup link
  const sendMemberInviteEmail = async (member: any) => {
    try {
      if (!org) return;
      
      // Get the invite token from the member record
      const { data: memberWithToken } = await supabase
        .from("members")
        .select("invite_token")
        .eq("id", member.id)
        .single();
      
      const setupUrl = memberWithToken?.invite_token 
        ? `${window.location.origin}/portal/setup?token=${memberWithToken.invite_token}`
        : null;
      
      const response = await supabase.functions.invoke("send-email", {
        body: {
          type: "member_invite",
          to: member.email,
          shulName: org.name,
          memberName: `${member.first_name} ${member.last_name}`,
          setupUrl,
          portalUrl: `${window.location.origin}/portal`,
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

  const resetMemberForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

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
                      onClick={() => navigate(`/members/${member.id}`)}
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
      </motion.div>
    </DashboardLayout>
  );
}
