import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Copy, ExternalLink, Info, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function WebsiteTab() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const orgId = roles.find(r => r.organization_id)?.organization_id;

  // Form state
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [slugError, setSlugError] = useState("");

  // Fetch organization for slug
  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("id, slug, name")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Sync form
  useEffect(() => {
    if (org) {
      setSlug(org.slug || "");
    }
  }, [org]);

  // Validate slug format
  const validateSlug = (value: string) => {
    if (!value) {
      setSlugError("Slug is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError("Only lowercase letters, numbers, and hyphens allowed");
      return false;
    }
    if (value.length < 3) {
      setSlugError("Must be at least 3 characters");
      return false;
    }
    setSlugError("");
    return true;
  };

  // Update slug mutation
  const slugMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!validateSlug(slug)) throw new Error("Invalid slug");
      
      const { error } = await supabase
        .from("organizations")
        .update({ slug })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      toast.success("Website URL updated");
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) {
        toast.error("This URL is already taken");
      } else {
        toast.error("Failed: " + err.message);
      }
    },
  });

  const publicUrl = slug ? `https://shulgenius.com/s/${slug}` : "";

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("URL copied to clipboard");
    }
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    if (cleaned) validateSlug(cleaned);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="premium-card">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="premium-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No organization assigned</p>
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
      {/* Public Website URL */}
      <Card className="premium-card border-l-4 border-l-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gold" />
            Public Website URL
          </CardTitle>
          <CardDescription>
            Configure your shul's public website address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slug Editor */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center">
                <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">
                  shulgenius.com/s/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="rounded-l-none"
                  placeholder="your-shul"
                />
              </div>
              <Button 
                onClick={() => slugMutation.mutate()}
                disabled={slugMutation.isPending || !!slugError || slug === org?.slug}
                className="btn-gold"
              >
                {slugMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            {slugError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {slugError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Only lowercase letters, numbers, and hyphens. Minimum 3 characters.
            </p>
          </div>

          {/* Current URL Display */}
          {publicUrl && (
            <div className="pt-4 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Your Public URL</Label>
              <div className="flex gap-2">
                <Input
                  value={publicUrl}
                  readOnly
                  className="bg-muted/50 font-mono text-sm"
                />
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Connect your own domain to your shul's website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted/30 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Custom domains require DNS configuration. You'll need to add CNAME records pointing to ShulGenius.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                placeholder="www.yourshul.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="font-mono flex-1"
              />
              <Button variant="outline" disabled>
                <Check className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your custom domain (e.g., www.yourshul.com)
            </p>
          </div>

          {/* DNS Instructions */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <p className="font-medium text-sm">DNS Configuration Required:</p>
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-muted">
                <span className="text-muted-foreground">Type</span>
                <span className="font-mono">CNAME</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-muted">
                <span className="text-muted-foreground">Name</span>
                <span className="font-mono">www</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Value</span>
                <span className="font-mono text-xs">proxy.shulgenius.com</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>No domain configured yet</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
