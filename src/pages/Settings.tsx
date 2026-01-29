import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Building2, Users, Globe, CreditCard, Mail, FileDown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { UsersAdminsTab } from "@/components/settings/UsersAdminsTab";
import { WebsiteTab } from "@/components/settings/WebsiteTab";
import { FinancialTab } from "@/components/settings/FinancialTab";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { isShulowner } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings & Configuration</h1>
        <p className="text-muted-foreground">
          Manage your shul's settings, payment processors, website, and integrations
        </p>
      </motion.div>

      {/* Settings Tabs - Matching the reference design */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/30 p-1 h-auto flex-wrap">
          <TabsTrigger value="general" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Users className="h-4 w-4" />
            Users & Admins
          </TabsTrigger>
          <TabsTrigger value="website" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Globe className="h-4 w-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <CreditCard className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="communications" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <Mail className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            <FileDown className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersAdminsTab />
        </TabsContent>

        <TabsContent value="website">
          <WebsiteTab />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="communications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 text-muted-foreground"
          >
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Communications Settings</p>
            <p className="text-sm">Coming soon - Email & SMS configuration</p>
          </motion.div>
        </TabsContent>

        <TabsContent value="import">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 text-muted-foreground"
          >
            <FileDown className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Import & Export</p>
            <p className="text-sm">Coming soon - CSV import and data export</p>
          </motion.div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
