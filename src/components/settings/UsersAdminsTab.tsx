import { useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Shield, Trash2, Crown, UserCheck, User, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

type RoleType = "shuladmin" | "shulmember";

const ROLE_CONFIG: Record<RoleType, { label: string; icon: typeof Crown; color: string }> = {
  shuladmin: { label: "Shul Admin", icon: Shield, color: "bg-primary text-primary-foreground" },
  shulmember: { label: "Shul Member", icon: User, color: "bg-muted text-muted-foreground" },
};

export function UsersAdminsTab() {
  const { roles, isShulowner } = useAuth();
  const queryClient = useQueryClient();
  const orgId = roles.find(r => r.organization_id)?.organization_id;

  // Dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("shulmember");

  // Fetch users with roles for this org
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["org-users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, organization_id")
        .eq("organization_id", orgId);
      
      if (error) throw error;
      
      const userIds = rolesData?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      return rolesData?.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        return {
          ...role,
          email: profile?.email || "—",
          name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile?.email?.split("@")[0] || "Unknown"
        };
      }) || [];
    },
    enabled: !!orgId,
  });

  // Invite mutation (placeholder - in real app would send invite email)
  const inviteMutation = useMutation({
    mutationFn: async () => {
      // In production, this would call an edge function to send invite email
      // For now, we'll show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("shulmember");
    },
    onError: (err: Error) => {
      toast.error("Failed to send invite: " + err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users", orgId] });
      toast.success("User removed from organization");
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (err: Error) => {
      toast.error("Failed to remove user: " + err.message);
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: RoleType }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users", orgId] });
      toast.success("Role updated successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to update role: " + err.message);
    },
  });

  const getRoleConfig = (role: string) => {
    return ROLE_CONFIG[role as RoleType] || ROLE_CONFIG.shulmember;
  };

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!orgId) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No organization assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gold" />
              User & Admin Management
            </CardTitle>
            <CardDescription>
              Manage who can access your shul's admin portal and their permissions
            </CardDescription>
          </div>

          {/* Invite Dialog */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="btn-royal" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shuladmin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Shul Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="shulmember">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Shul Member
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === "shuladmin" 
                      ? "Admins can manage members, invoices, and settings"
                      : "Members can view their own data and make payments"
                    }
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="btn-gold"
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteEmail || inviteMutation.isPending}
                >
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {!userRoles?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No users assigned to this organization</p>
              <p className="text-sm mt-1">Invite users to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.map((user) => {
                  const roleConfig = getRoleConfig(user.role);
                  const RoleIcon = roleConfig.icon;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => 
                            changeRoleMutation.mutate({ roleId: user.id, newRole: newRole as RoleType })
                          }
                          disabled={changeRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                <RoleIcon className="h-3.5 w-3.5" />
                                <span className="text-xs">{roleConfig.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shuladmin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Shul Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="shulmember">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Shul Member
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedUser?.name}</strong> from this organization? 
              They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
