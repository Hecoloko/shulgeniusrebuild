import { forwardRef, ReactNode } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Bell, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = forwardRef<HTMLDivElement, DashboardLayoutProps>(
  ({ children }, ref) => {
    const { user, isShulowner } = useAuth();

    return (
      <div ref={ref} className="min-h-screen bg-background">
        <Sidebar />
        
        {/* Main Content Area */}
        <motion.main
          initial={false}
          animate={{ marginLeft: 280 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="min-h-screen"
        >
          {/* Top Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center justify-between px-8 py-4">
              {/* Search */}
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search members, invoices, campaigns..."
                  className="search-input"
                />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full" />
                </button>

                {/* User Menu */}
                <div className="flex items-center gap-3 pl-4 border-l border-border">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-royal-light flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-foreground">
                      {user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isShulowner ? "Shulowner" : "Shuladmin"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-8">
            {children}
          </div>
        </motion.main>
      </div>
    );
  }
);

DashboardLayout.displayName = "DashboardLayout";
