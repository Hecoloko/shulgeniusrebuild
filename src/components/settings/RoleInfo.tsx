import { motion } from "framer-motion";
import { Shield, Crown, Users, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const roleConfig = {
  shulowner: {
    label: "Platform Owner",
    description: "Full platform access with ability to create and manage all organizations",
    icon: Crown,
    color: "bg-gold/10 text-gold border-gold/30",
  },
  shuladmin: {
    label: "Organization Admin",
    description: "Full access to manage a specific organization",
    icon: Shield,
    color: "bg-primary/10 text-primary border-primary/30",
  },
  shulmember: {
    label: "Member",
    description: "Access to personal profile and organization membership",
    icon: Users,
    color: "bg-muted text-muted-foreground border-border",
  },
};

export function RoleInfo() {
  const { roles, isShulowner } = useAuth();

  const primaryRole = isShulowner ? "shulowner" : roles[0]?.role || "shulmember";
  const config = roleConfig[primaryRole as keyof typeof roleConfig] || roleConfig.shulmember;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            Role & Permissions
          </CardTitle>
          <CardDescription>
            Your access level and assigned organizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Role */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${config.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <Badge variant="outline" className={config.color}>
                    {primaryRole}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
              </div>
            </div>
          </div>

          {/* Role Details */}
          {roles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Your Roles</h4>
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {role.organization_id ? `Organization: ${role.organization_id.slice(0, 8)}...` : "Platform-wide"}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {role.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Permissions Summary */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Permissions</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "View Members", allowed: true },
                { label: "Edit Members", allowed: primaryRole !== "shulmember" },
                { label: "Manage Invoices", allowed: primaryRole !== "shulmember" },
                { label: "View Donations", allowed: primaryRole !== "shulmember" },
                { label: "Manage Campaigns", allowed: primaryRole !== "shulmember" },
                { label: "Create Organizations", allowed: isShulowner },
              ].map((perm) => (
                <div
                  key={perm.label}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                    perm.allowed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{perm.allowed ? "✓" : "—"}</span>
                  <span>{perm.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
