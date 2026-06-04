import { Bell, Check, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import PageHeader from "@/components/PageHeader";
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function NotificationsPage() {
  const { notifications, unreadCount, toggleRead, markAllAsRead, clearAll } = useNotifications();
  const { t } = useTranslation();

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-6 w-6 text-warning" />;
      case 'error': return <AlertCircle className="h-6 w-6 text-destructive" />;
      case 'success': return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      default: return <Info className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full w-full bg-background p-6 lg:p-8">
      {/* Header Section */}
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
        icon={Bell}
        badges={unreadCount > 0 ? [{ label: t("notifications.notification"), value: t("notifications.unreadCount", { count: unreadCount }) }] : undefined}
        showFilterButton={false}
        showRefreshButton={false}
        showLimitSelector={false}
        showRecordCount={false}
        customActions={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="h-9 font-medium" onClick={markAllAsRead}>
                <Check className="h-3.5 w-3.5 mr-2" />
                {t("notifications.markAllAsRead")}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 font-medium text-destructive hover:bg-destructive hover:text-white" onClick={clearAll}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t("notifications.clearHistory")}
              </Button>
            )}
          </>
        }
      />

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto mt-6 pr-2 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="bg-muted/50 p-6 rounded-full mb-4 border border-border/50">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{t("notifications.emptyHistory")}</h3>
            <p className="text-sm mt-1 text-center max-w-sm">
              {t("notifications.emptyHistoryDesc")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {notifications.map((notif) => {
              const displayTitle = notif.titleKey ? t(notif.titleKey, notif.data) : notif.title;
              const displayBody = notif.bodyKey ? t(notif.bodyKey, notif.data) : notif.body;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200 border group",
                    !notif.read 
                      ? "bg-card/80 shadow-sm border-primary/20" 
                      : "bg-muted/10 border-border/40 opacity-80"
                  )}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary" />
                  )}
                  
                  {/* Left Icon */}
                  <div className="shrink-0 p-2.5 rounded-lg bg-background/80 border shadow-sm flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col min-w-0 flex-1 justify-center">
                    <div className="flex justify-between items-center gap-4 mb-0.5">
                      <h3 className={cn("text-base font-semibold truncate", !notif.read ? "text-foreground" : "text-foreground/80")}>
                        {displayTitle}
                      </h3>
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-md">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {displayBody}
                    </p>
                  </div>

                  {/* Right Actions - Centered vertically in the whole card */}
                  <div className="shrink-0 flex items-center justify-center ml-2 border-l border-border/30 pl-4 h-10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-10 w-10 rounded-full transition-all duration-200",
                            "opacity-0 group-hover:opacity-100",
                            notif.read ? "hover:bg-primary/10 text-muted-foreground hover:text-primary" : "hover:bg-destructive/10 text-primary hover:text-destructive"
                          )}
                          onClick={() => toggleRead(notif.id)}
                        >
                          {notif.read ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{notif.read ? t("notifications.markAsUnread") : t("notifications.markAsRead")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
