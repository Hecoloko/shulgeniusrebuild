import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Heart, TrendingUp, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { DonateModal } from "@/components/campaigns/DonateModal";

export default function PublicCampaign() {
  const { slug, campaignId } = useParams<{ slug: string; campaignId: string }>();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showDonateModal, setShowDonateModal] = useState(false);

  // Fetch organization by slug
  const { data: org, isLoading: orgLoading } = useQuery({
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

  // Fetch campaign
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ["public-campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
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
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  // Fetch donation count
  const { data: donorCount } = useQuery({
    queryKey: ["campaign-donors", campaignId],
    queryFn: async () => {
      if (!campaignId) return 0;
      const { count, error } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!campaignId,
  });

  // Countdown timer
  useEffect(() => {
    if (!campaign?.end_date) return;

    const endDate = new Date(campaign.end_date);

    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign?.end_date]);

  const isLoading = orgLoading || campaignLoading;
  const hasEnded = campaign?.end_date && new Date(campaign.end_date) < new Date();
  const raisedAmount = Number(campaign?.raised_amount) || 0;
  const goalAmount = Number(campaign?.goal_amount) || 1;
  const progressPercent = Math.min((raisedAmount / goalAmount) * 100, 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-64 mx-auto mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!org || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Campaign Not Found</h1>
          <p className="text-slate-400 mb-6">The campaign you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-background">
      {/* Navigation */}
      <PublicNavbar org={org} />

      {/* Hero Section */}
      <div className="text-center pt-12 pb-8 px-4">
        <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
          {org.name}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          {campaign.name}
        </h1>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Funds Raised Card */}
          <Card className="bg-background border shadow-lg mb-6">
            <CardContent className="pt-8 pb-6">
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-primary tracking-wider mb-2">FUNDS RAISED</p>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                  <span className="text-5xl font-bold text-foreground">
                    {formatCurrency(raisedAmount)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2">
                  {Math.round(progressPercent)}% of {formatCurrency(goalAmount)} goal
                </p>
              </div>

              {/* Progress Bar */}
              <Progress value={progressPercent} className="h-3 mb-8" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/50 border">
                  <CardContent className="pt-4 pb-3 text-center">
                    <Heart className="h-5 w-5 text-pink-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{donorCount}</p>
                    <p className="text-sm text-muted-foreground">Donors</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50 border">
                  <CardContent className="pt-4 pb-3 text-center">
                    <Target className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{formatCurrency(goalAmount)}</p>
                    <p className="text-sm text-muted-foreground">Goal</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Countdown or Status Card */}
          <Card className="bg-background border shadow-lg">
            <CardContent className="py-6">
              <div className="text-center">
                <Heart className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />

                {hasEnded ? (
                  <>
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      Fundraiser Ended
                    </h3>
                    <p className="text-muted-foreground">
                      All donations are welcome!
                    </p>
                  </>
                ) : campaign.end_date ? (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Remaining
                    </h3>
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{timeLeft.days}</div>
                        <div className="text-xs text-muted-foreground uppercase">Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{timeLeft.hours}</div>
                        <div className="text-xs text-muted-foreground uppercase">Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{timeLeft.minutes}</div>
                        <div className="text-xs text-muted-foreground uppercase">Mins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{timeLeft.seconds}</div>
                        <div className="text-xs text-muted-foreground uppercase">Secs</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      Ongoing Fund
                    </h3>
                    <p className="text-muted-foreground">
                      Donations are always appreciated
                    </p>
                  </>
                )}

                {/* Donate Button */}
                <Button
                  size="lg"
                  className="mt-6 w-full sm:w-auto px-12"
                  onClick={() => setShowDonateModal(true)}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Donate Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Donate Modal */}
          <DonateModal
            campaign={campaign}
            open={showDonateModal}
            onOpenChange={setShowDonateModal}
          />

          {/* Description */}
          {campaign.description && (
            <Card className="bg-background border shadow-lg mt-6">
              <CardContent className="py-6">
                <h3 className="font-semibold mb-2">About This Campaign</h3>
                <p className="text-muted-foreground">{campaign.description}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} {org.name}. Powered by ShulGenius.</p>
        </div>
      </footer>
    </div>
  );
}
