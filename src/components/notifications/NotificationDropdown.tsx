import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { NotificationItem, formatNotificationTime, getNotificationTypeClass, getNotificationTypeLabel } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { BellRing, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isMarking: boolean;
  onNotificationClick: (notification: NotificationItem) => void;
  onMarkAllAsRead: () => void;
}

const NotificationDropdown = ({
  notifications,
  unreadCount,
  isLoading,
  isMarking,
  onNotificationClick,
  onMarkAllAsRead,
}: NotificationDropdownProps) => {
  return (
    <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card">
        <div>
          <p className="font-semibold text-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllAsRead}
          disabled={unreadCount === 0 || isMarking}
        >
          {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark all read"}
        </Button>
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => onNotificationClick(notification)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors",
                !notification.is_read && "bg-primary/5"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-sm font-medium", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>
                    {notification.title}
                  </p>
                  {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge className={cn("border text-[10px]", getNotificationTypeClass(notification.type))}>
                    {getNotificationTypeLabel(notification.type)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{formatNotificationTime(notification.created_at)}</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-8 text-center">
            <BellRing className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border/50 bg-card">
        <Button asChild variant="ghost" className="w-full justify-center">
          <Link to="/dashboard/notifications">View all notifications</Link>
        </Button>
      </div>
    </DropdownMenuContent>
  );
};

export default NotificationDropdown;
