import { TerminalSquare } from "lucide-react";
import { WindowsServerResource } from "@/types";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import { useTranslation } from "react-i18next";

interface WinTerminalPageProps {
  server: WindowsServerResource;
}

export default function WinTerminalPage({ server }: WinTerminalPageProps) {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar">
        <PageHeader
          title={t("dashboard.terminal")}
          icon={TerminalSquare}
          description={`${server?.alias || server?.name || ''} SSH Terminal`}
          showRecordCount={false}
        />

        <div className="flex-1 flex flex-col items-center justify-center bg-card/40 border glass-card rounded-3xl p-12 text-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <TerminalSquare className="w-8 h-8" />
             </div>
             <h3 className="text-2xl font-black tracking-tight">{t("dashboard.terminal")}</h3>
             <p className="text-muted-foreground max-w-md mx-auto">
               {t("dashboard.terminalNotAvailable")}
             </p>
        </div>
      </div>
    </PageLayout>
  );
}
