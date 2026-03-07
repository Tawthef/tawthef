import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CalendarClock,
  CreditCard,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
  AdminSubscription,
  AdminSubscriptionStatus,
  AdminSubscriptionStatusFilter,
  useAdminSubscriptions,
} from "@/hooks/useAdminSubscriptions";
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

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: AdminSubscriptionStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatBillingCycle = (cycle: "monthly" | "quarterly" | "yearly") =>
  cycle.charAt(0).toUpperCase() + cycle.slice(1);

const getStatusClass = (status: AdminSubscriptionStatus) => {
  if (status === "active") return "bg-success/10 text-success border-success/20";
  if (status === "suspended") return "bg-warning/10 text-warning border-warning/20";
  if (status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

const AdminSubscriptions = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminSubscriptionStatusFilter>("all");

  const {
    subscriptions,
    pagination,
    isLoading,
    isFetching,
    error,
    updateSubscriptionStatus,
    extendSubscription,
    isUpdatingStatus,
    isExtending,
  } = useAdminSubscriptions({
    page,
    limit: ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
    search,
    status: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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

  const runStatusAction = async (subscription: AdminSubscription, nextStatus: AdminSubscriptionStatus) => {
    try {
      await updateSubscriptionStatus({
        subscriptionId: subscription.id,
        organizationId: subscription.organization_id,
        nextStatus,
        planName: subscription.plan_name,
      });
      toast({
        title: "Subscription updated",
        description: `${subscription.company_name} subscription is now ${nextStatus}.`,
      });
    } catch (actionError: any) {
      toast({
        title: "Failed to update subscription",
        description: actionError?.message || "Could not update subscription status.",
        variant: "destructive",
      });
    }
  };

  const runExtendAction = async (subscription: AdminSubscription) => {
    try {
      await extendSubscription({
        subscriptionId: subscription.id,
        organizationId: subscription.organization_id,
        currentEndDate: subscription.end_date,
        planName: subscription.plan_name,
        days: 30,
      });
      toast({
        title: "Subscription extended",
        description: `${subscription.company_name} subscription was extended by 30 days.`,
      });
    } catch (actionError: any) {
      toast({
        title: "Failed to extend subscription",
        description: actionError?.message || "Could not extend subscription.",
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
            Subscriptions
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage recruiter subscription plans.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription Plans ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdminSubscriptionStatusFilter)}>
                  <SelectTrigger className="w-full sm:w-44 h-10">
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
                Failed to load subscriptions. Please try again.
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No subscriptions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-3 px-6 font-medium">Company</th>
                      <th className="text-left py-3 px-4 font-medium">Plan Name</th>
                      <th className="text-left py-3 px-4 font-medium">Job Posting Slots</th>
                      <th className="text-left py-3 px-4 font-medium">Resume Search Access</th>
                      <th className="text-left py-3 px-4 font-medium">Billing Cycle</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Start Date</th>
                      <th className="text-left py-3 px-4 font-medium">Expiry Date</th>
                      <th className="text-right py-3 px-6 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-foreground">{subscription.company_name}</td>
                        <td className="py-4 px-4 text-muted-foreground">{subscription.plan_name}</td>
                        <td className="py-4 px-4 text-muted-foreground">{subscription.job_posting_slots}</td>
                        <td className="py-4 px-4">
                          <Badge
                            variant="outline"
                            className={
                              subscription.resume_search_access
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground border-border"
                            }
                          >
                            {subscription.resume_search_access ? "Enabled" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{formatBillingCycle(subscription.billing_cycle)}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getStatusClass(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground text-xs">{formatDate(subscription.start_date)}</td>
                        <td className="py-4 px-4 text-muted-foreground text-xs">{formatDate(subscription.end_date)}</td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                disabled={subscription.status === "active" || isUpdatingStatus}
                                onClick={() => runStatusAction(subscription, "active")}
                              >
                                Activate Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={subscription.status === "suspended" || isUpdatingStatus}
                                onClick={() => runStatusAction(subscription, "suspended")}
                              >
                                Suspend Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isExtending}
                                onClick={() => runExtendAction(subscription)}
                              >
                                <CalendarClock className="w-4 h-4 mr-2" />
                                Extend Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={subscription.status === "cancelled" || isUpdatingStatus}
                                onClick={() => runStatusAction(subscription, "cancelled")}
                              >
                                Cancel Subscription
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
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
    </DashboardLayout>
  );
};

export default AdminSubscriptions;
