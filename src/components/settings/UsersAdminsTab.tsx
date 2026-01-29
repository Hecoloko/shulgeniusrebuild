import { motion } from "framer-motion";
import { Users, UserPlus, Shield, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function UsersAdminsTab() {
  const { roles } = useAuth();
  const orgId = roles.find(r => r.organization_id)?.organization_id;

  // Fetch users with roles for this org
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["org-users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      // Get all user roles for this org
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, organization_id")
        .eq("organization_id", orgId);
      
      if (error) throw error;
      
      // Get profile data for each user
      const userIds = rolesData?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      // Combine roles with profile data
      return rolesData?.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        return {
          ...role,
          email: profile?.email || "—",
          name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile?.email || "Unknown"
        };
      }) || [];
    },
    enabled: !!orgId,
  });

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
          <Button className="btn-royal" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Admin/Role
          </Button>
        </CardHeader>
        <CardContent>
          {!userRoles?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No users assigned to this organization</p>
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
                {userRoles.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                        {user.role === "shuladmin" ? "Shul Admin" : user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
    </motion.div>
  );
}
