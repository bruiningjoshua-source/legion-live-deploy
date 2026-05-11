import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationManager({ user }) {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications enabled!');
        
        // Save preference
        if (user) {
          await base44.auth.updateMe({
            push_notifications_enabled: true,
            notification_preferences: {
              new_follower: true,
              gifts_received: true,
              stream_start: true,
              mentions: true,
              direct_messages: true
            }
          });
        }

        // Show a test notification
        new Notification('Legion Live', {
          body: 'Notifications are now enabled!',
          icon: '/icon-192.png',
          badge: '/badge-72.png'
        });
      } else if (result === 'denied') {
        toast.error('Notification permission denied. You can enable it in browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  }, [isSupported, user]);

  const disableNotifications = useCallback(async () => {
    if (user) {
      await base44.auth.updateMe({
        push_notifications_enabled: false
      });
    }
    toast.success('Notifications disabled');
  }, [user]);

  // Send local notification
  const sendNotification = useCallback((title, options = {}) => {
    if (permission !== 'granted') return;

    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      ...options
    });
  }, [permission]);

  if (!isSupported) {
    return null;
  }

  return {
    permission,
    requestPermission,
    disableNotifications,
    sendNotification,
    isSupported
  };
}

// Hook to use notifications
export function useNotifications(user) {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return false;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const sendNotification = (title, body, options = {}) => {
    if (permission !== 'granted') return;
    
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      ...options
    });
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    isEnabled: permission === 'granted'
  };
}

// Notification banner component
export function NotificationBanner({ user }) {
  const { permission, isSupported, requestPermission } = useNotifications(user);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('notification_banner_dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('notification_banner_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-amber-600/20 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-amber-400" />
        <div>
          <p className="text-amber-100 font-medium text-sm">Enable Notifications</p>
          <p className="text-amber-400/70 text-xs">Get notified when your favorite creators go live!</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-amber-400/70 hover:text-amber-200"
        >
          Later
        </Button>
        <Button
          size="sm"
          onClick={requestPermission}
          className="bg-amber-600 hover:bg-amber-700"
        >
          Enable
        </Button>
      </div>
    </div>
  );
}