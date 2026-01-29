import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Heart, Target } from "lucide-react";
import { useActiveCampaigns } from "@/hooks/useActiveCampaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function CampaignProgress() {
  const { data: campaigns, isLoading } = useActiveCampaigns(3);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="premium-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Active Campaigns</h2>
        <button 
          onClick={() => navigate("/campaigns")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage
        </button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign, index) => {
            const progress = (campaign.raised / campaign.goal) * 100;
            
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${campaign.type === "drive" ? "bg-gold/10 text-gold" : "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"}`}>
                      {campaign.type === "drive" ? (
                        <Target className="w-4 h-4" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{campaign.name}</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {campaign.type}
                  </span>
                </div>

                <div className="campaign-progress">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1.5, delay: 0.7 + index * 0.1, ease: "easeOut" }}
                    className="campaign-progress-fill"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-semibold">
                    $<CountUp end={campaign.raised} duration={2} delay={0.7 + index * 0.1} separator="," />
                  </span>
                  <span className="text-muted-foreground">
                    of ${campaign.goal.toLocaleString()} goal
                  </span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active campaigns</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
