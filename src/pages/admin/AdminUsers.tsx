import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Activity,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import {
  ADMIN_USERS_PAGE_SIZE,
  AdminUser,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const USER_TYPE_OPTIONS: Array<{ label: string; value: AdminUserTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Candidates", value: "candidates" },
  { label: "Recruiters", value: "recruiters" },
  { label: "Admins", value: "admins" },
];

const STATUS_OPTIONS: Array<{ label: string; value: "all" | AdminUserStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
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

const getRoleLabel = (role: string) => {
  if (role === "candidate") return "Candidate";
  if (role === "employer") return "Employer";
  if (role === "agency") return "Agency";
  if (role === "admin") return "Admin";
  return role;
};

const getRoleBadgeClass = (role: string) => {
  if (role === "candidate") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (role === "employer" || role === "agency") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  if (role === "admin") return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusBadgeClass = (status: AdminUserStatus) =>
  status === "suspended"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-success/10 text-success border-success/20";

const getStatusLabel = (status: AdminUserStatus) =>
  status === "suspended" ? "Suspended" : "Active";

const AdminUsers = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<AdminUserTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUserStatus>("all");

  const [selectedRoleUser, setSelectedRoleUser] = useState<AdminUser | null>(null);
  const [pendingRole, setPendingRole] = useState<AdminUserRole>("candidate");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);

  const [selectedResetUser, setSelectedResetUser] = useState<AdminUser | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [selectedActivityUser, setSelectedActivityUser] = useState<AdminUser | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activitySummary, setActivitySummary] = useState<{
    accountCreated: string | null;
    lastLogin: string | null;
    jobsPosted: number;
    applicationsSubmitted: number;
    interviewsScheduled: number;
    messagesSent: number;
    auditEvents: number;
  } | null>(null);

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
    status: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, userTypeFilter, statusFilter]);

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

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const nextStatus: AdminUserStatus = user.status === "suspended" ? "active" : "suspended";
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

  const openRoleDialog = (user: AdminUser) => {
    setSelectedRoleUser(user);
    setPendingRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const confirmRoleUpdate = async () => {
    if (!selectedRoleUser) return;

    try {
      await updateUserRole({ userId: selectedRoleUser.id, role: pendingRole });
      toast({
        title: "Role updated",
        description: `${selectedRoleUser.full_name || selectedRoleUser.email || "User"} is now ${getRoleLabel(pendingRole)}.`,
      });
      setIsRoleConfirmOpen(false);
      setIsRoleDialogOpen(false);
      setSelectedRoleUser(null);
    } catch (mutationError: any) {
      toast({
        title: "Failed to update role",
        description: mutationError?.message || "Could not update user role.",
        variant: "destructive",
      });
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedResetUser?.email) return;

    try {
      await resetUserPassword({ email: selectedResetUser.email });
      toast({
        title: "Reset email sent",
        description: `Password reset instructions were sent to ${selectedResetUser.email}.`,
      });
      setIsResetConfirmOpen(false);
      setSelectedResetUser(null);
    } catch (mutationError: any) {
      toast({
        title: "Failed to send reset email",
        description: mutationError?.message || "Could not send password reset email.",
        variant: "destructive",
      });
    }
  };

  const openActivityDialog = async (user: AdminUser) => {
    try {
      setSelectedActivityUser(user);
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Users Management
          </h1>
          <p className="text-muted-foreground">
            Manage users, roles, account status, and platform activity.
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
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | AdminUserStatus)}>
                  <SelectTrigger className="w-full sm:w-40 h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
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
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="py-14 text-center text-destructive text-sm">
                Failed to load users. Please try again.
              </div>
            ) : users.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No users found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-3 px-6 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Role</th>
                      <th className="text-left py-3 px-4 font-medium">Recruiter</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Created Date</th>
                      <th className="text-left py-3 px-4 font-medium">Last Login</th>
                      <th className="text-right py-3 px-6 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentUser = user.id === profile?.id;
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-border/10 hover:bg-muted/5 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="font-medium text-foreground">
                              {user.full_name || "Unknown User"}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">
                            {user.email || "Unavailable"}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">
                            {user.organization_name || "-"}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={getStatusBadgeClass(user.status)}>
                              {getStatusLabel(user.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground text-xs">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="py-4 px-4 text-muted-foreground text-xs">
                            {formatDate(user.last_login)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActivitySummary(null);
                                    openActivityDialog(user);
                                  }}
                                >
                                  <Activity className="w-4 h-4 mr-2" />
                                  View Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isCurrentUser}
                                  onClick={() => openRoleDialog(user)}
                                >
                                  <UserCog className="w-4 h-4 mr-2" />
                                  Assign Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isCurrentUser || isUpdatingStatus}
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  {user.status === "suspended" ? (
                                    <UserCheck className="w-4 h-4 mr-2" />
                                  ) : (
                                    <UserX className="w-4 h-4 mr-2" />
                                  )}
                                  {user.status === "suspended" ? "Activate Account" : "Suspend Account"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!user.email || isResettingPassword}
                                  onClick={() => {
                                    setSelectedResetUser(user);
                                    setIsResetConfirmOpen(true);
                                  }}
                                >
                                  <KeyRound className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
        open={isRoleDialogOpen}
        onOpenChange={(open) => {
          setIsRoleDialogOpen(open);
          if (!open) {
            setSelectedRoleUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User Role</DialogTitle>
            <DialogDescription>
              Change the user role for {selectedRoleUser?.full_name || selectedRoleUser?.email || "this user"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Role</p>
            <Select value={pendingRole} onValueChange={(value) => setPendingRole(value as AdminUserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setIsRoleConfirmOpen(true)}
              disabled={!selectedRoleUser || pendingRole === selectedRoleUser.role || isUpdatingRole}
            >
              {isUpdatingRole ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isRoleConfirmOpen} onOpenChange={setIsRoleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change role to {getRoleLabel(pendingRole)} for {selectedRoleUser?.full_name || selectedRoleUser?.email || "this user"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleUpdate}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Password Reset Email</AlertDialogTitle>
            <AlertDialogDescription>
              Send a reset password email to {selectedResetUser?.email || "this user"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetPassword}>Send Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <DialogContent className="sm:max-w-2xl">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Account Created</p>
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
                  <p className="text-xs uppercase text-muted-foreground">Jobs Posted</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.jobsPosted}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Applications Submitted</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.applicationsSubmitted}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Interviews Scheduled</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.interviewsScheduled}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Messages Sent</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.messagesSent}</p>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">Audit Events</p>
                  <p className="text-lg font-bold mt-2">{activitySummary.auditEvents}</p>
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
