import { motion } from "framer-motion";
import { Globe, Copy, ExternalLink, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WebsiteTab() {
  const { roles } = useAuth();
  const orgId = roles.find(r => r.organization_id)?.organization_id;

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

  const publicUrl = org?.slug ? `https://shulgenius.com/s/${org.slug}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("URL copied to clipboard");
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
      {/* Public Website Card */}
      <Card className="premium-card border-l-4 border-l-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gold" />
            Your Public Website
          </CardTitle>
          <CardDescription>
            Share this link with your community to access your shul's public page
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button className="btn-royal">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
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
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>
              Custom domains require DNS configuration.{" "}
              <a href="#" className="text-primary hover:underline">View setup guide ↗</a>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <Input
              id="domain"
              placeholder="www.yourshul.com"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter your custom domain (e.g., www.yourshul.com)
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>No domain configured</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
