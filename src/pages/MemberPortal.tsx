import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Calendar, Heart, FileText, CreditCard, Receipt,
  ChevronDown, LogOut, Building2, User, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AddCardModal } from "@/components/members/AddCardModal";
import { DonateModal } from "@/components/campaigns/DonateModal";

type PortalTab = "home" | "invoices" | "cards" | "schedule" | "donate";

export default function MemberPortal() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PortalTab>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedDonationCampaign, setSelectedDonationCampaign] = useState<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/portal/login");
    }
  }, [user, authLoading, navigate]);

  // Fetch member's organizations (they can belong to multiple)
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["member-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("members")
        .select(`
          id,
          first_name,
          last_name,
          email,
          balance,
          organization_id,
          organizations (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Use selected membership or first membership as default
  const currentMember = selectedMembershipId
    ? memberships?.find(m => m.id === selectedMembershipId)
    : memberships?.[0];
  const currentOrg = currentMember?.organizations;

  // Set initial selection when memberships load
  useEffect(() => {
    if (memberships && memberships.length > 0 && !selectedMembershipId) {
      setSelectedMembershipId(memberships[0].id);
    }
  }, [memberships, selectedMembershipId]);

  // Fetch invoices for current member
  const { data: invoices } = useQuery({
    queryKey: ["member-invoices", currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("member_id", currentMember.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentMember?.id,
  });

  // Fetch payments for current member
  const { data: payments } = useQuery({
    queryKey: ["member-payments", currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", currentMember.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentMember?.id,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["member-payment-methods", currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("member_id", currentMember.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentMember?.id,
  });

  // Fetch campaigns for donation
  const { data: campaigns } = useQuery({
    queryKey: ["member-campaigns", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_processors(
            processor_id,
            is_primary,
            processor:payment_processors(
              id,
              name,
              processor_type
            )
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Calculate dynamic balance
  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const totalPaid = payments?.reduce((sum, pmt) => sum + (pmt.amount || 0), 0) || 0;
  const calculatedBalance = Math.max(0, totalInvoiced - totalPaid);

  const handleSignOut = async () => {
    await signOut();
    navigate("/portal/login");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "cards", label: "Payment Methods", icon: CreditCard },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "donate", label: "Donate", icon: Heart },
  ];

  if (authLoading || membershipsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>No Membership Found</CardTitle>
            <CardDescription>
              You don't have any active memberships. Please contact your shul administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Org Logo & Name */}
            <div className="flex items-center gap-3">
              {currentOrg?.logo_url ? (
                <img
                  src={currentOrg.logo_url}
                  alt={currentOrg.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <span className="font-semibold text-foreground hidden sm:block">
                {currentOrg?.name}
              </span>
            </div>

            {/* Desktop Nav with Dropdown */}
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    {navItems.find((n) => n.id === activeTab)?.label || "Menu"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setActiveTab(item.id as PortalTab)}
                      className={activeTab === item.id ? "bg-muted" : ""}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Multi-shul switcher */}
              {memberships && memberships.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Switch Shul</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {memberships.map((m: any) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => setSelectedMembershipId(m.id)}
                        className={selectedMembershipId === m.id ? "bg-muted" : ""}
                      >
                        {m.organizations?.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">
                      {currentMember.first_name} {currentMember.last_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {currentMember.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t bg-background"
            >
              <div className="px-4 py-2 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as PortalTab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* HOME TAB */}
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">
                  Welcome, {currentMember.first_name}!
                </h1>
                <p className="text-muted-foreground">
                  Member of {currentOrg?.name}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Receipt className="h-5 w-5 text-primary" />
                      Account Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${calculatedBalance > 0 ? "text-destructive" : "text-success"}`}>
                      {formatCurrency(calculatedBalance)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {calculatedBalance > 0 ? "Amount due" : "Paid in full"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{invoices?.length || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {invoices?.filter((i) => i.status === "sent").length || 0} pending
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{paymentMethods?.length || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cards on file
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setActiveTab("invoices")} variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  <Button onClick={() => setActiveTab("cards")} variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Cards
                  </Button>
                  <Button onClick={() => setActiveTab("donate")} className="bg-gold text-foreground hover:bg-gold/90">
                    <Heart className="h-4 w-4 mr-2" />
                    Make Donation
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* INVOICES TAB */}
          {activeTab === "invoices" && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Your Invoices</h2>

              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => (
                    <Card key={invoice.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(invoice.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(invoice.total)}</p>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No invoices yet</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* CARDS TAB */}
          {activeTab === "cards" && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Payment Methods</h2>

              {paymentMethods && paymentMethods.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {paymentMethods.map((pm: any) => (
                    <Card key={pm.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <CreditCard className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {pm.card_brand || "Card"} •••• {pm.card_last_four}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {pm.exp_month}/{pm.exp_year}
                            </p>
                          </div>
                          {pm.is_default && (
                            <Badge variant="secondary" className="ml-auto">
                              Default
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No payment methods on file</p>
                    <p className="text-sm mt-1">
                      Contact your shul to add a payment method
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Schedule</h2>
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Schedule coming soon</p>
                  <p className="text-sm mt-1">
                    Contact your shul for service times
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DONATE TAB */}
          {activeTab === "donate" && (
            <motion.div
              key="donate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Make a Donation</h2>
              <p className="text-muted-foreground">
                Support {currentOrg?.name} with a tax-deductible donation
              </p>

              {campaigns && campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.map((campaign: any) => (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {campaign.description}
                          </p>
                        )}
                        {campaign.goal_amount && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="font-medium">
                                {formatCurrency(campaign.raised_amount)}
                              </span>
                              <span className="text-muted-foreground">
                                of {formatCurrency(campaign.goal_amount)} goal
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full">
                              <div
                                className="h-2 bg-gold rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    (campaign.raised_amount / campaign.goal_amount) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <Button
                          className="mt-4 bg-gold text-foreground hover:bg-gold/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDonationCampaign(campaign);
                          }}
                        >
                          Donate Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No active campaigns</p>
                    <p className="text-sm mt-1">
                      Contact your shul to make a donation
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {currentOrg?.name}. Powered by ShulGenius.</p>
        </div>
      </footer>
      {/* Add Card Modal */}
      <AddCardModal
        open={showAddCard}
        onOpenChange={setShowAddCard}
        member={currentMember || null}
      />

      {/* Donate Modal */}
      <DonateModal
        campaign={selectedDonationCampaign}
        open={!!selectedDonationCampaign}
        onOpenChange={(open) => !open && setSelectedDonationCampaign(null)}
        memberId={currentMember?.id}
        initialMemberData={currentMember ? {
          first_name: currentMember.first_name,
          last_name: currentMember.last_name,
          email: currentMember.email
        } : undefined}
      />
    </div>
  );
}
