import { motion } from "framer-motion";
import CountUp from "react-countup";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  change,
  icon: Icon,
  iconColor = "text-gold",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4 }}
      className="stat-card group"
    >
      {/* Background Gradient on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-muted ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          {change && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3 }}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                ${change.trend === "up" ? "bg-success/10 text-success" : ""}
                ${change.trend === "down" ? "bg-destructive/10 text-destructive" : ""}
                ${change.trend === "neutral" ? "bg-muted text-muted-foreground" : ""}
              `}
            >
              {change.trend === "up" && "↑"}
              {change.trend === "down" && "↓"}
              {change.value}%
            </motion.div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {prefix}
            <CountUp
              end={value}
              duration={2}
              delay={delay}
              separator=","
              decimals={prefix === "$" ? 0 : 0}
            />
            {suffix}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
      </div>

      {/* Decorative Corner */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-gold/10 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}
