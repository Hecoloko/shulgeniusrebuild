import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";

export default function Campaigns() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Campaigns</h1>
        <p className="text-muted-foreground">Coming in Phase 2</p>
      </motion.div>
    </DashboardLayout>
  );
}
