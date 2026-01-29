import { motion } from "framer-motion";
import { CreditCard, FileText, UserPlus, Heart, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: "payment" | "invoice" | "member" | "donation";
  title: string;
  description: string;
  time: string;
  amount?: number;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "payment",
    title: "Payment Received",
    description: "David Goldstein paid Invoice #1042",
    time: "2 minutes ago",
    amount: 500,
  },
  {
    id: "2",
    type: "member",
    title: "New Member",
    description: "Sarah Levy joined as a Family Member",
    time: "15 minutes ago",
  },
  {
    id: "3",
    type: "donation",
    title: "Campaign Donation",
    description: "Anonymous donated to Building Fund",
    time: "1 hour ago",
    amount: 1000,
  },
  {
    id: "4",
    type: "invoice",
    title: "Invoice Sent",
    description: "Monthly dues sent to 45 members",
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "payment",
    title: "Payment Received",
    description: "Michael Rosen paid Invoice #1039",
    time: "3 hours ago",
    amount: 350,
  },
];

const iconMap = {
  payment: CreditCard,
  invoice: FileText,
  member: UserPlus,
  donation: Heart,
};

const colorMap = {
  payment: "bg-success/10 text-success",
  invoice: "bg-blue-100 text-blue-600",
  member: "bg-gold/10 text-gold",
  donation: "bg-pink-100 text-pink-600",
};

export function ActivityFeed() {
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
        {activities.map((activity, index) => {
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
        })}
      </div>
    </motion.div>
  );
}
