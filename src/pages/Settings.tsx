import { motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { RoleInfo } from "@/components/settings/RoleInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gold/10">
            <SettingsIcon className="h-6 w-6 text-gold" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your profile, organizations, and platform settings
        </p>
      </motion.div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-card">
            Profile
          </TabsTrigger>
          <TabsTrigger value="organizations" className="data-[state=active]:bg-card">
            Organizations
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-card">
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <RoleInfo />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
