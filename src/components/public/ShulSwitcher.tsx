import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Building2, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ShulSwitcherProps {
  currentOrgId: string;
}

export function ShulSwitcher({ currentOrgId }: ShulSwitcherProps) {
  const { roles } = useAuth();
  const navigate = useNavigate();

  // Get all unique org IDs from user's roles
  const orgIds = [...new Set(
    roles
      ?.filter(r => r.organization_id)
      .map(r => r.organization_id) || []
  )];

  // Fetch organization details for all user's orgs
  const { data: userOrgs } = useQuery({
    queryKey: ["user-organizations", orgIds],
    queryFn: async () => {
      if (orgIds.length === 0) return [];
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .in("id", orgIds);
      if (error) throw error;
      return data || [];
    },
    enabled: orgIds.length > 1, // Only fetch if user has multiple orgs
    staleTime: 5 * 60 * 1000,
  });

  // Don't show if user has 0 or 1 org
  if (!userOrgs || userOrgs.length <= 1) {
    return null;
  }

  const currentOrg = userOrgs.find(o => o.id === currentOrgId);
  
  // Get role for each org
  const getOrgRole = (orgId: string) => {
    const role = roles?.find(r => r.organization_id === orgId)?.role;
    if (role === 'shuladmin' || role === 'shulowner') return 'Admin';
    return 'Member';
  };

  const handleSwitch = (slug: string) => {
    navigate(`/s/${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-background">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline max-w-32 truncate">
            {currentOrg?.name || "Switch Shul"}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        {userOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.slug)}
            className={`flex items-center justify-between cursor-pointer ${
              org.id === currentOrgId ? "bg-accent" : ""
            }`}
          >
            <span className="truncate">{org.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {getOrgRole(org.id) === 'Admin' ? (
                <Shield className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {getOrgRole(org.id)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
