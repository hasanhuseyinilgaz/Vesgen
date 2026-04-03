import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Database, Server, Activity, ShieldCheck, Heart } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import OverviewHeader from "@/components/overview/OverviewHeader";
import QuickActions from "@/components/overview/QuickActions";
import ResourceFleet from "@/components/overview/ResourceFleet";
import CustomTabs from "@/components/ui/custom-tabs";
import { Tenant } from "@/types";

interface OverviewPageProps {
  tenant: Tenant | null;
}

export default function OverviewPage({ tenant }: OverviewPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const databases = tenant?.databases || [];
  const servers = tenant?.windowsServers || [];

  const tabs = [
    { value: "overview", label: t("dashboard.tabOverview"), icon: LayoutDashboard },
    { value: "databases", label: t("dashboard.tabDatabases"), icon: Database },
    { value: "servers", label: t("dashboard.tabServers"), icon: Server },
  ];

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 md:gap-8 p-4 md:p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar bg-transparent">
        
        {/* Header Section */}
        <OverviewHeader 
          tenant={tenant} 
          dbCount={databases.length} 
          serverCount={servers.length} 
        />

        {/* Dynamic Tabs Section */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
             <CustomTabs 
                activeTab={activeTab} 
                onTabChange={(val) => setActiveTab(val as string)} 
                tabs={tabs}
             />
             
             <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <div className="flex items-center gap-1.5">
                   <ShieldCheck className="w-3 h-3 text-success" />
                   <span>{t("dashboard.systemSecure")}</span>
                </div>
                <div className="h-4 w-px bg-border/40" />
                <div className="flex items-center gap-1.5">
                   <Activity className="w-3 h-3 text-primary" />
                   <span>{t("dashboard.uptime")}: 99.9%</span>
                </div>
             </div>
          </div>

          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
                <QuickActions />
                <ResourceFleet databases={databases.slice(0, 4)} servers={servers.slice(0, 4)} />
                
                {/* Global Stats or Health Check Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                   <div className="glass-card border border-border/30 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center text-success">
                         <ShieldCheck className="w-7 h-7" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-tighter">{t("dashboard.healthGood")}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{t("dashboard.healthDesc")}</p>
                   </div>
                   <div className="glass-card border border-border/30 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                         <Activity className="w-7 h-7" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-tighter">{t("dashboard.performanceOptimal")}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{t("dashboard.performanceDesc")}</p>
                   </div>
                   <div className="glass-card bg-card/20 border border-border/30 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                         <Heart className="w-7 h-7" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-tighter">{t("dashboard.sustainability")}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{t("dashboard.sustainabilityDesc")}</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "databases" && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <ResourceFleet databases={databases} servers={[]} />
              </div>
            )}

            {activeTab === "servers" && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <ResourceFleet databases={[]} servers={servers} />
              </div>
            )}
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-auto pt-12 text-center">
           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
              Vesgen © 2026 • Monitoring & Administration Control Center
           </p>
        </div>
      </div>
    </PageLayout>
  );
}
