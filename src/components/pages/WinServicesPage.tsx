import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ServerCog, Search, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WindowsServerResource } from "@/types";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import DataTable from "@/components/DataTable";

interface WinServicesPageProps {
  server: WindowsServerResource;
}

export default function WinServicesPage({ server }: WinServicesPageProps) {
  const { t } = useTranslation();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.winGetServices(server);
      if (res.success && res.data) {
        setServices(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        setError(res.message || t("dashboard.connFailed"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [server]);

  const filteredServices = services.filter((s: any) => 
    s.Name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { name: "Status", label: t("jobs.status") },
    { name: "DisplayName", label: t("dataTable.rowDetailsTitleInfo") },
    { name: "Name", label: t("jobs.jobName") },
  ];

  const renderStatus = (status: number | string) => {
    const s = String(status);
    if (s === "4" || s === "Running") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/20 text-success border border-success/30 inline-flex items-center">{t("jobs.running")}</div>;
    if (s === "1" || s === "Stopped") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border inline-flex items-center opacity-70">{t("jobs.canceled")}</div>;
    if (s === "2" || s === "StartPending") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30 inline-flex items-center animate-pulse">{t("common.loading")}</div>;
    return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-outline text-foreground border border-border inline-flex items-center">{s}</div>;
  };

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar">
        <PageHeader
          title={t("dashboard.services")}
          icon={ServerCog}
          description={`${server?.alias || server?.name || ''} ${t("maintenance.allDatabase")}`}
          showRecordCount={true}
          recordCount={filteredServices.length}
          onRefresh={fetchServices}
          loading={loading}
        />

        <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("components.searchableSidebar.searchPlaceholder")}
              className="pl-9 bg-background/50 border-input/50 focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setSearchTerm("")} className="shrink-0">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
            Hata: {error}
          </div>
        )}

        <div className="flex-1 min-h-0">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                <p className="text-sm font-medium">Servisler listeleniyor, lütfen bekleyin...</p>
             </div>
           ) : (
             <DataTable
               data={filteredServices.map((s: any) => ({
                 ...s,
                 Status: renderStatus(s.Status)
               }))}
               columns={columns}
               title={t("dashboard.services")}
             />
           )}
        </div>
      </div>
    </PageLayout>
  );
}
