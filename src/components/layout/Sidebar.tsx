import { forwardRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  Heart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Members", href: "/members", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Campaigns", href: "/campaigns", icon: Heart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Sidebar = forwardRef<HTMLElement>((_, ref) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, user, isShulowner } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <motion.aside
      ref={ref}
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-50"
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-gold">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">ShulGenius</h1>
                <p className="text-xs text-sidebar-foreground/60">Antigravity</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {collapsed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-gold mx-auto"
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
        )}
      </div>

      {/* Organization Badge */}
      <div className="px-4 py-4">
        <motion.div
          animate={{ 
            paddingLeft: collapsed ? 12 : 16,
            paddingRight: collapsed ? 12 : 16,
          }}
          className="bg-sidebar-accent rounded-xl py-3 flex items-center gap-3"
        >
          <Building2 className="w-5 h-5 text-gold shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {isShulowner ? "Platform Owner" : "Beth Israel"}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {isShulowner ? "Shulowner" : "Admin Portal"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-hidden">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.href}
                className={`
                  sidebar-nav-item
                  ${isActive ? "active" : ""}
                  ${collapsed ? "justify-center px-3" : ""}
                `}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-gold" : ""}`} />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User Info & Collapse Toggle */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 px-3 py-2"
          >
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </motion.div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl
            bg-sidebar-accent/50 hover:bg-sidebar-accent
            text-sidebar-foreground/70 hover:text-sidebar-foreground
            transition-all duration-200
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Collapse</span>
            </>
          )}
        </button>

        {!collapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl
              text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30
              transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </motion.button>
        )}
      </div>
    </motion.aside>
  );
});

Sidebar.displayName = "Sidebar";
