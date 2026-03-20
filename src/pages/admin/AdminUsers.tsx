import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity, KeyRound, Loader2, Search, Shield, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import {
  ADMIN_USERS_PAGE_SIZE,
  AdminUser,
  AdminUserActivity,
  AdminUserRole,
  AdminUserStatus,
  AdminUserTypeFilter,
  useAdminUsers,
} from "@/hooks/useAdminUsers";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const USER_TYPE_OPTIONS: Array<{ label: string; value: AdminUserTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Candidate", value: "candidate" },
  { label: "Employer", value: "employer" },
  { label: "Agency", value: "agency" },
  { label: "Admin", value: "admin" },
];

const ROLE_OPTIONS: Array<{ label: string; value: AdminUserRole }> = [
  { label: "Candidate", value: "candidate" },
  { label: "Employer", value: "employer" },
  { label: "Agency", value: "agency" },
  { label: "Admin", value: "admin" },
];

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

const getRoleBadgeClass = (role: string) => {
  if (role === "candidate") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (role === "employer") return "bg-primary/10 text-primary border-primary/20";
  if (role === "agency") return "bg-accent/10 text-accent border-accent/20";
  if (role === "admin") return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusBadgeClass = (status: AdminUserStatus) =>
  status === "suspended"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-success/10 text-success border-success/20";

const getStatusLabel = (status: AdminUserStatus) => (status === "suspended" ? "Suspended" : "Active");

const AdminUsers = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<AdminUserTypeFilter>("all");

  const [selectedActivityUser, setSelectedActivityUser] = useState<AdminUser | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activitySummary, setActivitySummary] = useState<AdminUserActivity | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const {
    users,
    pagination,
    isLoading,
    isFetching,
    error,
    updateUserStatus,
    updateUserRole,
    resetUserPassword,
    getUserActivity,
    isUpdatingStatus,
    isUpdatingRole,
    isResettingPassword,
    isLoadingActivity,
  } = useAdminUsers({
    page,
    limit: ADMIN_USERS_PAGE_SIZE,
    search,
    userType: userTypeFilter,
    status: "all",
  });

  useEffect(() => {
    setPage(1);
  }, [search, userTypeFilter]);

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

  const handleToggleStatus = async (user: AdminUser, checked: boolean) => {
    const nextStatus: AdminUserStatus = checked ? "active" : "suspended";

    try {
      await updateUserStatus({ userId: user.id, status: nextStatus });
      toast({
        title: "User status updated",
        description: `${user.full_name || user.email || "User"} is now ${getStatusLabel(nextStatus).toLowerCase()}.`,
      });
    } catch (mutationError: any) {
      toast({
        title: "Failed to update status",
        description: mutationError?.message || "Could not update user status.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (user: AdminUser, nextRole: AdminUserRole) => {
    if (nextRole === user.role) return;

    try {
      await updateUserRole({ userId: user.id, role: nextRole });
      toast({
        title: "Role updated",
        description: `${user.full_name || user.email || "User"} is now ${nextRole}.`,
      });
    } catch (mutationError: any) {
      toast({
        title: "Failed to update role",
        description: mutationError?.message || "Could not update user role.",
        variant: "destructive",
      });
    }
  };

  const openActivityDialog = async (user: AdminUser) => {
    try {
      setSelectedActivityUser(user);
      setActivitySummary(null);
      setIsActivityDialogOpen(true);
      const summary = await getUserActivity({ userId: user.id });
      setActivitySummary(summary);
    } catch (activityError: any) {
      setActivitySummary(null);
      toast({
        title: "Failed to load activity",
        description: activityError?.message || "Could not fetch user activity summary.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    if (!user.email) {
      toast({
        title: "Email unavailable",
        description: "This user does not have an email address available for password reset.",
        variant: "destructive",
      });
      return;
    }

    try {
      setResettingUserId(user.id);
      await resetUserPassword({ email: user.email });
      toast({
        title: "Password reset sent",
        description: `A Supabase password reset email was sent to ${user.email}.`,
      });
    } catch (resetError: any) {
      toast({
        title: "Failed to send reset",
        description: resetError?.message || "Could not trigger the password reset email.",
        variant: "destructive",
      });
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Users Management
          </h1>
          <p className="text-muted-foreground">
            Manage platform users, account status, roles, and basic activity.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Platform Users ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={userTypeFilter} onValueChange={(value) => setUserTypeFilter(value as AdminUserTypeFilter)}>
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Role Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-6 py-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-muted/40" />
                ))}
              </div>
            ) : error ? (
              <div className="py-14 text-center text-destructive text-sm">
                Failed to load users. Please try again.
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <Users className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting the search term or role filter.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created date</TableHead>
                        <TableHead>Controls</TableHead>
                        <TableHead className="text-right">Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const isCurrentUser = user.id === profile?.id;
                        const isResettingThisUser = resettingUserId === user.id && isResettingPassword;

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name || "Unknown User"}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email || "Unavailable"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStatusBadgeClass(user.status)}>
                                {getStatusLabel(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDate(user.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex min-w-[320px] flex-col gap-3 lg:min-w-0">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) => handleRoleChange(user, value as AdminUserRole)}
                                    disabled={isCurrentUser || isUpdatingRole}
                                  >
                                    <SelectTrigger className="h-9 w-[150px]">
                                      <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLE_OPTIONS.map((roleOption) => (
                                        <SelectItem key={roleOption.value} value={roleOption.value}>
                                          {roleOption.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={user.status === "active"}
                                      onCheckedChange={(checked) => handleToggleStatus(user, checked)}
                                      disabled={isCurrentUser || isUpdatingStatus}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {user.status === "active" ? "Active" : "Suspended"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResetPassword(user)}
                                    disabled={!user.email || isResettingThisUser}
                                  >
                                    {isResettingThisUser ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <KeyRound className="mr-2 h-4 w-4" />
                                    )}
                                    Reset Password
                                  </Button>

                                  {isCurrentUser && (
                                    <Badge variant="outline" className="text-xs">
                                      Current admin
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => openActivityDialog(user)}>
                                <Activity className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/20">
                  <p className="text-xs text-muted-foreground">
                    Showing {users.length} of {totalLabel} users. Page {pagination.page} of {pagination.totalPages}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={(open) => {
          setIsActivityDialogOpen(open);
          if (!open) {
            setSelectedActivityUser(null);
            setActivitySummary(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Activity</DialogTitle>
            <DialogDescription>
              Summary for {selectedActivityUser?.full_name || selectedActivityUser?.email || "selected user"}.
            </DialogDescription>
          </DialogHeader>

          {isLoadingActivity ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : activitySummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Created</p>
                  <p className="text-sm font-semibold mt-2">{formatDate(activitySummary.accountCreated)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Last Login</p>
                  <p className="text-sm font-semibold mt-2">{formatDate(activitySummary.lastLogin)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Logins</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.loginCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Applications</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.applicationsSubmitted}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">
              Activity data is not available for this user.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminUsers;
