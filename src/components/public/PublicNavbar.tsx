import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Heart, Grid3X3, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ShulSwitcher } from "./ShulSwitcher";

interface PublicNavbarProps {
  org: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  };
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function PublicNavbar({ org, activeTab, onTabChange }: PublicNavbarProps) {
  const { user, roles, isShulowner, signOut } = useAuth();
  const location = useLocation();

  // Check if user is admin of THIS specific organization
  const isOrgAdmin = roles?.some(
    r => r.organization_id === org.id && (r.role === 'shuladmin' || r.role === 'shulowner')
  ) || isShulowner;

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "donate", label: "Donate", icon: Heart },
  ];

  const isCampaignPage = location.pathname.includes('/campaign/');

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={`/s/${org.slug}`} className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {org.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="font-semibold text-foreground">{org.name}</span>
          </Link>

          {/* Nav Tabs - only show on non-campaign pages or with tab handler */}
          {!isCampaignPage && onTabChange && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* Campaign page nav links */}
          {isCampaignPage && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/s/${org.slug}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Shul Switcher - only for logged in users with multiple orgs */}
            {user && <ShulSwitcher currentOrgId={org.id} />}

            {/* Member Portal - always visible */}
            <Button variant="default" asChild className="hidden sm:flex gap-2 bg-primary hover:bg-primary/90">
              <Link to="/portal/login">
                <Grid3X3 className="h-4 w-4" />
                Member Portal
              </Link>
            </Button>

            {/* Admin Portal - only for admins of this org */}
            {user && isOrgAdmin && (
              <Button variant="outline" asChild className="hidden sm:flex gap-2">
                <Link to="/">
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}

            {/* Logout - only when logged in */}
            {user && (
              <Button variant="ghost" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
