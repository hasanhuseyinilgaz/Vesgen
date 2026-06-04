import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface NotificationsButtonProps {
  sidebarOpen: boolean;
  className?: string;
}

export function NotificationsPopover({ sidebarOpen, className }: NotificationsButtonProps) {
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className={cn(
        "relative flex items-center justify-center p-0 h-10 transition-all duration-300 rounded-xl group overflow-visible",
        sidebarOpen ? (className || "w-10") : "w-10",
        unreadCount > 0 
          ? "bg-destructive/15 text-destructive hover:bg-destructive/25 shadow-[0_0_15px_rgba(220,38,38,0.4)] ring-1 ring-destructive/50" 
          : "bg-primary/10 text-primary hover:bg-primary/20"
      )}
      onClick={() => navigate('/notifications')}
      title={t('dashboard.notifications') || 'Bildirimler'}
    >
      <div className="h-full w-full flex items-center justify-center relative">
        <Bell className={cn("h-5 w-5 opacity-90", unreadCount > 0 && "animate-pulse")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4.5 w-4.5 px-1 min-w-[18px] bg-destructive text-white text-[10px] font-black rounded-full shadow-sm border-[1.5px] border-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Button>
  );
}
