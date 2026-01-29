import { motion } from "framer-motion";
import { Users, FileText, DollarSign, Heart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CampaignProgress } from "@/components/dashboard/CampaignProgress";

export default function Dashboard() {
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
          Good morning, Rabbi Cohen
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening at Beth Israel today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Members"
          value={248}
          icon={Users}
          change={{ value: 12, trend: "up" }}
          delay={0.1}
        />
        <StatCard
          title="Active Campaigns"
          value={3}
          icon={Heart}
          iconColor="text-pink-500"
          delay={0.15}
        />
        <StatCard
          title="Open Invoices"
          value={18450}
          prefix="$"
          icon={FileText}
          iconColor="text-blue-500"
          change={{ value: 8, trend: "down" }}
          delay={0.2}
        />
        <StatCard
          title="Revenue This Month"
          value={32750}
          prefix="$"
          icon={DollarSign}
          iconColor="text-success"
          change={{ value: 23, trend: "up" }}
          delay={0.25}
        />
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
