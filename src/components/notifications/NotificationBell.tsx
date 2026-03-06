import { useAuth } from "@/context/AuthContext";
import { useNotificationActions, useRecentNotifications, useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: recentNotifications = [], isLoading } = useRecentNotifications(5);
  const { markAsRead, markAllAsRead, isMarkingAllAsRead, isMarkingAsRead } = useNotificationActions();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error("[NotificationBell] Failed to mark notification as read:", error);
      toast({
        title: "Update failed",
        description: "Could not mark notification as read.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("[NotificationBell] Failed to mark all as read:", error);
      toast({
        title: "Update failed",
        description: "Could not mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-xl">
          <Bell className="w-4 lg:w-5 h-4 lg:h-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] font-semibold text-accent-foreground flex items-center justify-center border border-card">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <NotificationDropdown
        notifications={recentNotifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        isMarking={isMarkingAllAsRead || isMarkingAsRead}
        onMarkAllAsRead={() => {
          void handleMarkAllAsRead();
        }}
        onNotificationClick={(notification) => {
          void handleNotificationClick(notification.id, notification.is_read);
        }}
      />
    </DropdownMenu>
  );
};

export default NotificationBell;
