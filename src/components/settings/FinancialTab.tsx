import { motion } from "framer-motion";
import { CreditCard, Plus, Play, Clock, Trash2, Edit, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function FinancialTab() {
  const { roles } = useAuth();
  const orgId = roles.find(r => r.organization_id)?.organization_id;

  // Fetch organization settings
  const { data: settings, isLoading } = useQuery({
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

  // Build processors list from settings
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
  if (settings?.cardknox_account_id) {
    processors.push({
      id: "cardknox",
      name: "Cardknox",
      type: "Cardknox",
      accountId: settings.cardknox_account_id,
      isActive: settings.active_processor === "cardknox"
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="premium-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
      className="space-y-6"
    >
      {/* Recurring Billing Management */}
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Recurring Billing Management
            </CardTitle>
            <CardDescription>
              Manually trigger billing or view automated billing history
            </CardDescription>
          </div>
          <Button className="btn-royal">
            <Play className="h-4 w-4 mr-2" />
            Run Billing Now
          </Button>
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

      {/* Payment Processors */}
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Processors
            </CardTitle>
            <CardDescription>
              Manage payment processor accounts and link them to campaigns
            </CardDescription>
          </div>
          <Button className="btn-royal" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Processor
          </Button>
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
                  <TableHead>Account Name</TableHead>
                  <TableHead>Processor Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processors.map((processor) => (
                  <TableRow key={processor.id}>
                    <TableCell className="font-medium">{processor.name}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded border text-xs font-medium">
                        {processor.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {processor.isActive && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gold">
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
    </motion.div>
  );
}
