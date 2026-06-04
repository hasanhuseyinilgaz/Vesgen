import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppNotification } from '../types/electron';

interface NotificationContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  toggleRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Since the user requested a nice sound, we can provide a small sound file, but due to encoding complexity of a real good sound here, I'll use a better approach: modern AudioContext synthetic beep or a generic web notification sound. 
// Synthesizing a nice modern "ding" using Web Audio API:
const playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        // A nice high pitch soft ping (G5 then E6)
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
        oscillator.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
        
        // Envelope
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio play failed:", e);
    }
};

import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { t } = useTranslation();

  const [pendingToasts, setPendingToasts] = useState<(string | number)[]>([]);

  const loadNotifications = async () => {
    if (!window.electronAPI) return;
    const data = await window.electronAPI.notificationsGet();
    setNotifications(data || []);
  };

  useEffect(() => {
    const handleFocus = () => {
      if (pendingToasts.length > 0) {
        const currentPending = [...pendingToasts];
        setPendingToasts([]);
        // Dismiss background toasts after 5 seconds of being back in focus
        setTimeout(() => {
          currentPending.forEach(id => toast.dismiss(id));
        }, 5000);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [pendingToasts]);

  useEffect(() => {
    loadNotifications();

    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onAppNotification((newNotif) => {
        setNotifications((prev) => {
            const newList = [newNotif, ...prev];
            if (newList.length > 5000) newList.length = 5000;
            return newList;
        });
        
        // Show real-time toast
        const title = t(newNotif.titleKey, newNotif.data);
        const body = t(newNotif.bodyKey, newNotif.data);
        const isFocused = document.hasFocus();
        const toastDuration = isFocused ? 5000 : Infinity;

        let toastId: string | number;
        if (newNotif.type === 'error') {
          toastId = toast.error(title, { description: body, duration: toastDuration });
        } else if (newNotif.type === 'warning') {
          toastId = toast.warning(title, { description: body, duration: toastDuration });
        } else if (newNotif.type === 'success') {
          toastId = toast.success(title, { description: body, duration: toastDuration });
        } else {
          toastId = toast.info(title, { description: body, duration: toastDuration });
        }

        if (!isFocused) {
          setPendingToasts(prev => [...prev, toastId]);
        }

        // Play notification sound
        playNotificationSound();
      });
      return () => unsubscribe();
    }
  }, [t]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.notificationsMarkAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const toggleRead = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.notificationsToggleRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.notificationsMarkAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.notificationsClearAll();
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, toggleRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
