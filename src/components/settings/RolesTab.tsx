import { motion } from "framer-motion";
import { Shield, Crown, Users, Building2, Check, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const roleConfig: Record<string, { label: string; description: string; icon: typeof Crown; colorClass: string }> = {
  shulowner: {
    label: "Platform Owner",
    description: "Full platform access with ability to create and manage all organizations",
    icon: Crown,
    colorClass: "bg-gold/10 text-gold",
  },
  shuladmin: {
    label: "Organization Admin",
    description: "Full access to manage a specific organization",
    icon: Shield,
    colorClass: "bg-primary/10 text-primary",
  },
  shulmember: {
    label: "Member",
    description: "Access to personal profile and organization membership",
    icon: Users,
    colorClass: "bg-muted text-muted-foreground",
  },
};

const permissions = [
  { label: "View Members", roles: ["shulowner", "shuladmin", "shulmember"] },
  { label: "Edit Members", roles: ["shulowner", "shuladmin"] },
  { label: "Manage Invoices", roles: ["shulowner", "shuladmin"] },
  { label: "View Donations", roles: ["shulowner", "shuladmin"] },
  { label: "Manage Campaigns", roles: ["shulowner", "shuladmin"] },
  { label: "Create Organizations", roles: ["shulowner"] },
];

export function RolesTab() {
  const { roles, isShulowner } = useAuth();

  const primaryRole = isShulowner ? "shulowner" : (roles[0]?.role || "shulmember");
  const config = roleConfig[primaryRole] || roleConfig.shulmember;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Current Role Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            Your Role
          </CardTitle>
          <CardDescription>Current access level and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${config.colorClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.colorClass}`}>
                    {primaryRole}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignments */}
      {roles.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-lg">Role Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {role.organization_id ? `Org: ${role.organization_id.slice(0, 8)}...` : "Platform-wide"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                  {role.role}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Permissions Grid */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-lg">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {permissions.map((perm) => {
              const hasPermission = perm.roles.includes(primaryRole);
              return (
                <div
                  key={perm.label}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                    hasPermission ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hasPermission ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  <span>{perm.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
