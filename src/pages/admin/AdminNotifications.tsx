import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Archive,
  Bell,
  Loader2,
  MoreHorizontal,
  Search,
  Send,
  Shield,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_NOTIFICATIONS_PAGE_SIZE,
  AdminNotificationItem,
  AdminNotificationStatus,
  AdminNotificationType,
  useAdminNotifications,
} from "@/hooks/useAdminNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPE_FILTER_OPTIONS: Array<{ label: string; value: "all" | AdminNotificationType }> = [
  { label: "All", value: "all" },
  { label: "System", value: "system" },
  { label: "Recruiter", value: "recruiter" },
  { label: "Candidate", value: "candidate" },
  { label: "Announcement", value: "announcement" },
];

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: "all" | AdminNotificationStatus }> = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Archived", value: "archived" },
];

const RECIPIENT_OPTIONS: Array<{ label: string; value: "all" | "recruiters" | "candidates" }> = [
  { label: "All users", value: "all" },
  { label: "Recruiters only", value: "recruiters" },
  { label: "Candidates only", value: "candidates" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getTypeClass = (type: AdminNotificationType) => {
  if (type === "announcement") return "bg-primary/10 text-primary border-primary/20";
  if (type === "recruiter") return "bg-accent/10 text-accent border-accent/20";
  if (type === "candidate") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusClass = (status: AdminNotificationStatus) => {
  if (status === "archived") return "bg-muted text-muted-foreground border-border";
  return "bg-success/10 text-success border-success/20";
};

const AdminNotifications = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AdminNotificationType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminNotificationStatus>("all");

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    type: "system" as AdminNotificationType,
    recipient: "all" as "all" | "recruiters" | "candidates",
  });

  const {
    notifications,
    pagination,
    isLoading,
    isFetching,
    error,
    sendNotification,
    deleteNotification,
    resendNotification,
    archiveNotification,
    isSending,
    isDeleting,
    isResending,
    isArchiving,
  } = useAdminNotifications({
    page,
    limit: ADMIN_NOTIFICATIONS_PAGE_SIZE,
    search,
    type: typeFilter,
    status: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  const totalLabel = useMemo(() => pagination.total.toLocaleString("en-US"), [pagination.total]);

  if (isProfileLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const runSendNotification = async () => {
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and message are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendNotification({
        title: sendForm.title,
        message: sendForm.message,
        type: sendForm.type,
        recipient: sendForm.recipient,
      });
      toast({
        title: "Notification sent",
        description: "System alert has been delivered.",
      });
      setSendDialogOpen(false);
      setSendForm({
        title: "",
        message: "",
        type: "system",
        recipient: "all",
      });
    } catch (sendError: any) {
      toast({
        title: "Send failed",
        description: sendError?.message || "Could not send notification.",
        variant: "destructive",
      });
    }
  };

  const runDelete = async (notificationId: string) => {
    try {
      await deleteNotification({ notificationId });
      toast({
        title: "Notification deleted",
        description: "Notification record was deleted.",
      });
    } catch (deleteError: any) {
      toast({
        title: "Delete failed",
        description: deleteError?.message || "Could not delete notification.",
        variant: "destructive",
      });
    }
  };

  const runResend = async (notification: AdminNotificationItem) => {
    try {
      await resendNotification({ notification });
      toast({
        title: "Notification resent",
        description: "Notification was resent successfully.",
      });
    } catch (resendError: any) {
      toast({
        title: "Resend failed",
        description: resendError?.message || "Could not resend notification.",
        variant: "destructive",
      });
    }
  };

  const runArchive = async (notificationId: string) => {
    try {
      await archiveNotification({ notificationId });
      toast({
        title: "Notification archived",
        description: "Notification has been archived.",
      });
    } catch (archiveError: any) {
      toast({
        title: "Archive failed",
        description: archiveError?.message || "Could not archive notification.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Notifications Management
          </h1>
          <p className="text-muted-foreground">
            Send platform alerts and manage existing notification records.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title or message..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | AdminNotificationType)}>
                  <SelectTrigger className="w-full sm:w-40 h-10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | AdminNotificationStatus)}>
                  <SelectTrigger className="w-full sm:w-40 h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setSendDialogOpen(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Send System Alert
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="py-14 text-center text-destructive text-sm">
                Failed to load notifications.
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No notifications found for the selected filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeClass(notification.type)}>
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{notification.recipient}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(notification.status)}>
                          {notification.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(notification.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              disabled={isResending}
                              onClick={() => runResend(notification)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={notification.status === "archived" || isArchiving}
                              onClick={() => runArchive(notification.id)}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDeleting}
                              onClick={() => runDelete(notification.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/20">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
                {isFetching ? " - Updating..." : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage || isFetching}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          setSendDialogOpen(open);
          if (!open) {
            setSendForm((prev) => ({
              ...prev,
              title: "",
              message: "",
            }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send System Alert</DialogTitle>
            <DialogDescription>
              Broadcast a system, recruiter, candidate, or announcement notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={sendForm.title}
              onChange={(event) => setSendForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title"
            />
            <Input
              value={sendForm.message}
              onChange={(event) => setSendForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Message"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                value={sendForm.type}
                onValueChange={(value) => setSendForm((prev) => ({ ...prev, type: value as AdminNotificationType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTER_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sendForm.recipient}
                onValueChange={(value) =>
                  setSendForm((prev) => ({ ...prev, recipient: value as "all" | "recruiters" | "candidates" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Recipient" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={runSendNotification} disabled={isSending}>
                {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminNotifications;
