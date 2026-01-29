import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Building2, Save, Loader2, Upload, Image as ImageIcon, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GeneralTab() {
  const { user, roles, isShulowner } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the first organization the user has access to
  const orgIdFromRoles = roles.find(r => r.organization_id)?.organization_id;

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // For shulowner: Fetch first available organization if they don't have one in roles
  const { data: firstOrg, isLoading: loadingFirstOrg } = useQuery({
    queryKey: ["first-organization"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isShulowner && !orgIdFromRoles,
  });

  // Determine actual orgId to use
  const orgId = orgIdFromRoles || firstOrg?.id;

  // Fetch organization if we have an ID
  const { data: org, isLoading: loadingOrg } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const isLoading = loadingOrg || (isShulowner && loadingFirstOrg);

  // Sync form with fetched data
  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setSlug(org.slug || "");
      setEmail(org.email || "");
      setPhone(org.phone || "");
      setAddress(org.address || "");
      setLogoUrl(org.logo_url || "");
    }
  }, [org]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${orgId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Create organization mutation (for shulowner)
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Shul name is required");
      const slugToUse = slug.trim() || generateSlug(name);
      
      const { data, error } = await supabase
        .from("organizations")
        .insert({ 
          name: name.trim(), 
          slug: slugToUse,
          email: email || null, 
          phone: phone || null, 
          address: address || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["first-organization"] });
      queryClient.invalidateQueries({ queryKey: ["organization", data.id] });
      setIsCreating(false);
      toast.success("Organization created successfully!");
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase
        .from("organizations")
        .update({ 
          name, 
          email, 
          phone, 
          address,
          logo_url: logoUrl 
        })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      toast.success("Shul information updated");
    },
    onError: (err: Error) => {
      toast.error("Failed: " + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No org exists and user can create one (shulowner)
  if (!orgId && isShulowner) {
    if (!isCreating) {
      return (
        <Card className="premium-card">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gold opacity-70" />
            <h3 className="text-lg font-semibold mb-2">Welcome to ShulGenius!</h3>
            <p className="text-muted-foreground mb-6">
              Create your first organization to get started managing your shul.
            </p>
            <Button onClick={() => setIsCreating(true)} className="btn-gold">
              <Plus className="h-4 w-4 mr-2" />
              Create Your Shul
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Show create form
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="premium-card border-l-4 border-l-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gold" />
              Create Your Organization
            </CardTitle>
            <CardDescription>Enter your shul's basic information to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="create-name">Shul Name *</Label>
                <Input
                  id="create-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Congregation Beth Israel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-slug">URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">shulgenius.com/</span>
                  <Input
                    id="create-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="beth-israel"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@yourshul.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-address">Address</Label>
                <Textarea
                  id="create-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City, State 12345"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="btn-gold">
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Organization
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // No org and not shulowner
  if (!orgId) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No organization assigned yet</p>
          <p className="text-sm mt-1">Contact a platform admin to get access to an organization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Branding Card */}
      <Card className="premium-card border-l-4 border-l-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gold" />
            Shul Branding
          </CardTitle>
          <CardDescription>Upload your shul's logo for public pages and communications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 overflow-hidden">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Shul logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: 200x200px, PNG or JPG, max 2MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>Update your shul's contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="shul-name">Shul Name *</Label>
              <Input
                id="shul-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Congregation Beth Israel"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shul-email">Email</Label>
                <Input
                  id="shul-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@yourshul.org"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shul-phone">Phone</Label>
                <Input
                  id="shul-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shul-address">Address</Label>
              <Textarea
                id="shul-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State 12345"
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={updateMutation.isPending} className="btn-gold">
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
