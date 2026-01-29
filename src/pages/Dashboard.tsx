import { motion } from "framer-motion";
import { Users, FileText, DollarSign, Heart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CampaignProgress } from "@/components/dashboard/CampaignProgress";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {greeting}, {user?.email?.split("@")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Active Members"
              value={stats?.activeMembers || 0}
              icon={Users}
              delay={0.1}
            />
            <StatCard
              title="Active Campaigns"
              value={stats?.activeCampaigns || 0}
              icon={Heart}
              iconColor="text-pink-500"
              delay={0.15}
            />
            <StatCard
              title="Open Invoices"
              value={stats?.openInvoices || 0}
              prefix="$"
              icon={FileText}
              iconColor="text-blue-500"
              delay={0.2}
            />
            <StatCard
              title="Revenue This Month"
              value={stats?.revenueThisMonth || 0}
              prefix="$"
              icon={DollarSign}
              iconColor="text-success"
              delay={0.25}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          <CampaignProgress />
        </div>
      </div>
    </DashboardLayout>
  );
}
