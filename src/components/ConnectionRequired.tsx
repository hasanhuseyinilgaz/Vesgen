import { Database, RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useDatabaseContext } from "@/contexts/DatabaseContext";

export default function ConnectionRequired() {
  const { t } = useTranslation();
  const { refreshConnection, isConnectingDb } = useDatabaseContext();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full glass-card p-10 rounded-3xl border-destructive/20 bg-destructive/5 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 relative">
          <Database className="w-10 h-10 text-destructive opacity-40" />
          <WifiOff className="w-8 h-8 text-destructive absolute -bottom-1 -right-1" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("common.noConnection", "Veritabanı Bağlantısı Yok")}
        </h2>
        
        <p className="text-muted-foreground mb-8">
          {t("common.noConnectionDesc", "Bu sayfadaki verileri görebilmek için aktif bir veritabanı bağlantısı gereklidir. Lütfen VPN veya ağ bağlantınızı kontrol edin.")}
        </p>

        <Button 
          onClick={() => refreshConnection()} 
          disabled={isConnectingDb}
          className="w-full h-12 text-base shadow-lg shadow-primary/20"
        >
          {isConnectingDb ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Database className="w-5 h-5 mr-2" />
          )}
          {isConnectingDb ? t("common.connecting", "Bağlanılıyor...") : t("common.tryReconnect", "Yeniden Bağlanmayı Dene")}
        </Button>
      </div>
    </div>
  );
}
