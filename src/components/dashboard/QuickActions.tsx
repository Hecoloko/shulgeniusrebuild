import { motion } from "framer-motion";
import { Plus, Send, UserPlus, FileText } from "lucide-react";

const actions = [
  {
    label: "New Invoice",
    icon: FileText,
    color: "btn-royal",
  },
  {
    label: "Add Member",
    icon: UserPlus,
    color: "btn-gold",
  },
  {
    label: "Send Reminder",
    icon: Send,
    color: "bg-muted hover:bg-muted/80 text-foreground",
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="premium-card p-6"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`${action.color} flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200`}
            >
              <Icon className="w-5 h-5" />
              {action.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
