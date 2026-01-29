import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, ChevronDown, CreditCard, Settings2, Loader2 } from "lucide-react";
import { useOrganizations, Organization, OrganizationSettings as OrgSettings } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function CreateOrganizationDialog({ 
  isOpen, 
  onOpenChange, 
  onCreate, 
  isCreating 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onCreate: (org: { name: string; slug: string; email?: string }) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), email: email || undefined });
    setName("");
    setSlug("");
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Add a new synagogue to your platform
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name *</Label>
            <Input
              id="org-name"
              placeholder="Beth Israel Synagogue"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">URL Slug</Label>
            <Input
              id="org-slug"
              placeholder="beth-israel"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            />
            <p className="text-xs text-muted-foreground">Used for unique identification</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              type="email"
              placeholder="office@bethisrael.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || isCreating} className="btn-gold">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationCard({ 
  org, 
  settings,
  onUpdate,
  onUpdateSettings,
  isUpdating,
}: { 
  org: Organization; 
  settings?: OrgSettings;
  onUpdate: (updates: Partial<Organization>) => void;
  onUpdateSettings: (updates: Partial<OrgSettings>) => void;
  isUpdating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: org.name,
    email: org.email || "",
    phone: org.phone || "",
    address: org.address || "",
  });

  const handleSave = () => {
    onUpdate(editData);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border/50 rounded-xl overflow-hidden bg-card"
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">{org.name}</p>
                <p className="text-sm text-muted-foreground">{org.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {settings?.active_processor || "No Processor"}
              </Badge>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-6 border-t border-border/30">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Processor
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Active Processor</Label>
                  <Select
                    value={settings?.active_processor || "stripe"}
                    onValueChange={(value) => onUpdateSettings({ active_processor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="cardknox">Cardknox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings?.active_processor === "stripe" && (
                  <div className="space-y-2">
                    <Label>Stripe Account ID</Label>
                    <Input
                      value={settings?.stripe_account_id || ""}
                      placeholder="acct_..."
                      onChange={(e) => onUpdateSettings({ stripe_account_id: e.target.value })}
                    />
                  </div>
                )}
                {settings?.active_processor === "cardknox" && (
                  <div className="space-y-2">
                    <Label>Cardknox Account ID</Label>
                    <Input
                      value={settings?.cardknox_account_id || ""}
                      placeholder="Enter account ID"
                      onChange={(e) => onUpdateSettings({ cardknox_account_id: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={isUpdating} size="sm" className="btn-gold">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}

export function OrganizationSettings() {
  const { 
    organizations, 
    settings, 
    isLoading, 
    updateOrganization, 
    createOrganization,
    updateSettings,
    isUpdating, 
    isCreating,
    isShulowner 
  } = useOrganizations();
  
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gold" />
              Organizations
            </CardTitle>
            <CardDescription>
              Manage your synagogues and their settings
            </CardDescription>
          </div>
          {isShulowner && (
            <>
              <Button onClick={() => setDialogOpen(true)} className="btn-gold" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
              <CreateOrganizationDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                onCreate={createOrganization}
                isCreating={isCreating}
              />
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {organizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No organizations yet</p>
              {isShulowner && (
                <p className="text-sm mt-1">Create your first organization to get started</p>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {organizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  org={org}
                  settings={settings.find((s) => s.organization_id === org.id)}
                  onUpdate={(updates) => updateOrganization({ id: org.id, updates })}
                  onUpdateSettings={(updates) => updateSettings({ orgId: org.id, updates })}
                  isUpdating={isUpdating}
                />
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
