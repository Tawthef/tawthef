import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  NotificationFilter,
  NotificationItem,
  formatNotificationTime,
  getNotificationTypeClass,
  getNotificationTypeLabel,
  useNotificationActions,
  useNotificationsHistory,
  useUnreadNotificationCount,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { BellRing, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 12;

const FILTERS: Array<{ label: string; value: NotificationFilter }> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "System", value: "system" },
  { label: "Applications", value: "applications" },
  { label: "Interviews", value: "interviews" },
  { label: "Offers", value: "offers" },
  { label: "Messages", value: "messages" },
];

const NotificationsPage = () => {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const {
    data: history,
    isLoading,
    isFetching,
  } = useNotificationsHistory({
    filter: activeFilter,
    page,
    pageSize: PAGE_SIZE,
  });
  const { markAsRead, markAllAsRead, isMarkingAllAsRead } = useNotificationActions();

  const notifications = useMemo(() => history?.notifications || [], [history?.notifications]);
  const total = history?.total || 0;
  const totalPages = history?.totalPages || 1;

  const handleFilterChange = (nextFilter: NotificationFilter) => {
    setActiveFilter(nextFilter);
    setPage(1);
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.is_read) return;
    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error("[NotificationsPage] Failed to mark notification as read:", error);
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
      console.error("[NotificationsPage] Failed to mark all notifications as read:", error);
      toast({
        title: "Update failed",
        description: "Could not mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Real-time updates about applications, interviews, offers, and system events.
            </p>
          </div>
          <Button
            onClick={() => {
              void handleMarkAllAsRead();
            }}
            disabled={unreadCount === 0 || isMarkingAllAsRead}
          >
            {isMarkingAllAsRead ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Mark all as read
          </Button>
        </div>

        <Card className="card-float border-0">
          <CardContent className="p-4 lg:p-5 flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant={activeFilter === filter.value ? "default" : "outline"}
                onClick={() => handleFilterChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
            <div className="ml-auto text-sm text-muted-foreground">
              {total} result{total === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void handleNotificationClick(notification);
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "transition-colors border cursor-pointer",
                  notification.is_read ? "border-border/60 hover:bg-muted/30" : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                )}
              >
                <CardContent className="p-5 lg:p-6 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{notification.title}</h3>
                        {!notification.is_read && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">Unread</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("border", getNotificationTypeClass(notification.type))}>
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatNotificationTime(notification.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-16 text-center">
              <BellRing className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-semibold text-foreground">No notifications found</h3>
              <p className="text-muted-foreground mt-2">
                Try a different filter or check back later for new updates.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <Badge variant="outline">
            Page {page} / {totalPages}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
