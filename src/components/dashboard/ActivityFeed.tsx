import { motion } from "framer-motion";
import { CreditCard, FileText, UserPlus, Heart, Clock } from "lucide-react";
import { useActivityFeed, ActivityType } from "@/hooks/useActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<ActivityType, typeof CreditCard> = {
  payment: CreditCard,
  invoice: FileText,
  member: UserPlus,
  donation: Heart,
};

const colorMap: Record<ActivityType, string> = {
  payment: "bg-success/10 text-success",
  invoice: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-gold/10 text-gold",
  donation: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
};

export function ActivityFeed() {
  const { data: activities, isLoading } = useActivityFeed(5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="premium-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : activities && activities.length > 0 ? (
          activities.map((activity, index) => {
            const Icon = iconMap[activity.type];
            const colorClass = colorMap[activity.type];

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="activity-item"
              >
                <div className={`p-2.5 rounded-xl ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </p>
                    {activity.amount && (
                      <span className="text-sm font-semibold text-success shrink-0">
                        +${activity.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
