import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  active_processor: string | null;
  stripe_account_id: string | null;
  stripe_publishable_key: string | null;
  cardknox_account_id: string | null;
  cardknox_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

export function useOrganizations() {
  const { user, isShulowner, roles } = useAuth();
  const queryClient = useQueryClient();

  // Get all organizations the user has access to
  const orgsQuery = useQuery({
    queryKey: ["organizations", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user?.id,
  });

  // Get settings for all accessible organizations
  const settingsQuery = useQuery({
    queryKey: ["organization_settings", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("organization_settings")
        .select("*");

      if (error) throw error;
      return data as OrganizationSettings[];
    },
    enabled: !!user?.id,
  });

  const updateOrganization = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: OrganizationUpdate }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update organization: " + error.message);
    },
  });

  const createOrganization = useMutation({
    mutationFn: async (org: { name: string; slug: string; email?: string; phone?: string; address?: string }) => {
      // First create the organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert(org)
        .select()
        .single();

      if (orgError) throw orgError;

      // Then create default settings for it
      const { error: settingsError } = await supabase
        .from("organization_settings")
        .insert({ organization_id: orgData.id });

      if (settingsError) {
        // Rollback org creation if settings fail
        await supabase.from("organizations").delete().eq("id", orgData.id);
        throw settingsError;
      }

      return orgData as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      toast.success("Organization created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create organization: " + error.message);
    },
  });

  const updateSettings = useMutation({
    mutationFn: async ({ orgId, updates }: { orgId: string; updates: Partial<OrganizationSettings> }) => {
      const { data, error } = await supabase
        .from("organization_settings")
        .update(updates)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  return {
    organizations: orgsQuery.data || [],
    settings: settingsQuery.data || [],
    isLoading: orgsQuery.isLoading || settingsQuery.isLoading,
    error: orgsQuery.error || settingsQuery.error,
    updateOrganization: updateOrganization.mutate,
    createOrganization: createOrganization.mutate,
    updateSettings: updateSettings.mutate,
    isUpdating: updateOrganization.isPending || updateSettings.isPending,
    isCreating: createOrganization.isPending,
    isShulowner,
    roles,
  };
}
