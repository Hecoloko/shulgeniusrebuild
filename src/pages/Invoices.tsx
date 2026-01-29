import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, BookOpen, CreditCard, Columns3, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";

export default function Invoices() {
  const { orgId, isLoading: orgLoading } = useCurrentOrg();
  const [activeTab, setActiveTab] = useState("invoices");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Fetch invoices with member info
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          member:members(first_name, last_name, email),
          invoice_items(*)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch donations
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ["donations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          member:members(first_name, last_name),
          campaign:campaigns(name)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch billing items (subscriptions)
  const { data: billingItems, isLoading: billingLoading } = useQuery({
    queryKey: ["billing-items-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("billing_items")
        .select("*")
        .eq("organization_id", orgId)
        .eq("type", "subscription")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Build line items from invoices
  const lineItems = invoices?.flatMap((invoice) =>
    (invoice.invoice_items || []).map((item: any) => ({
      ...item,
      invoice_number: invoice.invoice_number,
      member: invoice.member,
    }))
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "M/d/yyyy");
  };

  const isLoading = orgLoading || invoicesLoading || donationsLoading || billingLoading;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Invoices & Donations</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Enter Aliyahs
            </Button>
            <Button variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
            <Button className="btn-royal gap-2" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              + Invoice
            </Button>
          </div>
        </div>

        {/* Create Invoice Modal */}
        <CreateInvoiceModal open={showCreateModal} onOpenChange={setShowCreateModal} />

        {/* Invoice Detail Modal */}
        <InvoiceDetailModal
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
            <TabsTrigger 
              value="invoices" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              INVOICES
            </TabsTrigger>
            <TabsTrigger 
              value="donations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              DONATIONS
            </TabsTrigger>
            <TabsTrigger 
              value="subscriptions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              SUBSCRIPTIONS
            </TabsTrigger>
            <TabsTrigger 
              value="line-items"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              LINE ITEMS
            </TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Columns3 className="h-4 w-4" />
                    COLUMNS
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    EXPORT
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !invoices || invoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No invoices yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow 
                          key={invoice.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <TableCell className="font-mono text-sm">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {invoice.member?.first_name} {invoice.member?.last_name?.charAt(0)}
                          </TableCell>
                          <TableCell>{formatDate(invoice.created_at)}</TableCell>
                          <TableCell>
                            {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donations Tab */}
          <TabsContent value="donations">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Columns3 className="h-4 w-4" />
                    COLUMNS
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    EXPORT
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !donations || donations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No donations yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Donor</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell>{formatDate(donation.created_at)}</TableCell>
                          <TableCell>
                            {donation.member 
                              ? `${donation.member.first_name} ${donation.member.last_name?.charAt(0)}`
                              : donation.donor_name || "Anonymous"
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {donation.donor_email || "-"}
                          </TableCell>
                          <TableCell>
                            {donation.campaign?.name || "-"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(donation.amount)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {donation.payment_method?.replace("_", " ") || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status="completed" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !billingItems || billingItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No subscriptions yet</p>
                    <p className="text-sm mt-1">Create subscription billing items in Settings → Financial</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>-</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.billing_interval || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.is_active ? "active" : "cancelled"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="line-items">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Columns3 className="h-4 w-4" />
                    COLUMNS
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    EXPORT
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : lineItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No line items yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.invoice_number}
                          </TableCell>
                          <TableCell>
                            {item.member?.first_name} {item.member?.last_name?.charAt(0)}
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
      case "active":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "cancelled":
      case "void":
        return "bg-gray-100 text-gray-500 border-gray-200";
      case "pending":
      case "sent":
        return "bg-amber-50 text-amber-600 border-amber-200";
      case "overdue":
        return "bg-red-50 text-red-600 border-red-200";
      case "draft":
        return "bg-gray-50 text-gray-500 border-gray-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getStatusStyles()}`}>
      {status.toLowerCase()}
    </span>
  );
}
