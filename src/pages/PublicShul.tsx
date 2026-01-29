import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Home, Calendar, Heart, Users, Grid3X3, LogOut,
  ArrowRight, Sparkles, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

type TabType = "home" | "schedule" | "donate";

export default function PublicShul() {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Fetch organization by slug
  const { data: org, isLoading, error } = useQuery({
    queryKey: ["public-org", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch active campaigns for donation
  const { data: campaigns } = useQuery({
    queryKey: ["public-campaigns", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!org?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-64 mx-auto mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!org || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Shul Not Found</h1>
          <p className="text-muted-foreground mb-6">The shul you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "donate", label: "Donate", icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {org.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="font-semibold text-foreground">{org.name}</span>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button variant="default" className="hidden sm:flex gap-2 bg-primary hover:bg-primary/90">
                <Grid3X3 className="h-4 w-4" />
                Member Portal
              </Button>
              {user && (
                <>
                  <Button variant="ghost" asChild className="hidden sm:flex gap-2">
                    <Link to="/">
                      <Grid3X3 className="h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={() => signOut()} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === item.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            {/* Welcome Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-background shadow-sm">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium">WELCOME TO OUR COMMUNITY</span>
            </div>

            {/* Hero Title */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground tracking-tight">
                {org.name}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground italic font-serif">
                A Place of Prayer & Community
              </p>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join us for prayer, learning, and community. Experience the warmth and
              tradition of our congregation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => setActiveTab("schedule")}
                className="bg-foreground text-background hover:bg-foreground/90 gap-2"
              >
                View Schedule
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setActiveTab("donate")}
                className="border-gold text-foreground hover:bg-gold/10"
              >
                Make a Donation
              </Button>
            </div>

            {/* Contact Info */}
            {(org.address || org.phone || org.email) && (
              <div className="pt-12 grid sm:grid-cols-3 gap-6 text-sm text-muted-foreground">
                {org.address && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Location</p>
                    <p>{org.address}</p>
                  </div>
                )}
                {org.phone && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Phone</p>
                    <p>{org.phone}</p>
                  </div>
                )}
                {org.email && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Email</p>
                    <p>{org.email}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "schedule" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-center mb-8">Schedule</h2>
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Schedule information coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact the shul for service times.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "donate" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-center mb-2">Make a Donation</h2>
            <p className="text-center text-muted-foreground mb-8">
              Support {org.name} with a tax-deductible donation
            </p>

            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-6 rounded-xl border bg-background hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {campaign.description}
                          </p>
                        )}
                        {campaign.goal_amount && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                ${campaign.raised_amount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">
                                of ${campaign.goal_amount.toLocaleString()} goal
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full mt-2">
                              <div
                                className="h-2 bg-gold rounded-full"
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
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  General donations coming soon.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contact the shul to make a donation.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {org.name}. Powered by ShulGenius.</p>
        </div>
      </footer>
    </div>
  );
}
