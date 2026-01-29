import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Heart, Target } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: "drive" | "fund";
  raised: number;
  goal: number;
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Building Renovation Fund",
    type: "fund",
    raised: 125000,
    goal: 200000,
  },
  {
    id: "2",
    name: "High Holiday Appeal",
    type: "drive",
    raised: 45000,
    goal: 50000,
  },
  {
    id: "3",
    name: "Youth Programs",
    type: "fund",
    raised: 8500,
    goal: 25000,
  },
];

export function CampaignProgress() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="premium-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Active Campaigns</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Manage
        </button>
      </div>

      <div className="space-y-6">
        {campaigns.map((campaign, index) => {
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
                  <div className={`p-1.5 rounded-lg ${campaign.type === "drive" ? "bg-gold/10 text-gold" : "bg-pink-100 text-pink-600"}`}>
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
                  animate={{ width: `${progress}%` }}
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
        })}
      </div>
    </motion.div>
  );
}
