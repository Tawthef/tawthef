import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity, Loader2, Search, Shield } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import {
  ADMIN_AUDIT_LOGS_PAGE_SIZE,
  useAdminAuditLogs,
} from "@/hooks/useAdminAuditLogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTION_OPTIONS = [
  { label: "All", value: "all" },
  { label: "User Suspended", value: "user_suspended" },
  { label: "Role Changed", value: "role_changed" },
  { label: "Recruiter Verified", value: "organization_verified" },
  { label: "Subscription Modified", value: "subscription_modified" },
  { label: "Job Created", value: "job_created" },
  { label: "Job Updated", value: "job_updated" },
  { label: "Job Deleted", value: "job_deleted" },
  { label: "Job Flagged", value: "job_flagged" },
  { label: "Candidate Applied", value: "candidate_applied" },
  { label: "Candidate Profile Viewed", value: "candidate_profile_viewed" },
  { label: "Candidate Shortlisted", value: "candidate_shortlisted" },
  { label: "User Login", value: "user_login" },
  { label: "User Logout", value: "user_logout" },
  { label: "Password Reset", value: "password_reset" },
];

const ENTITY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "User", value: "user" },
  { label: "Recruiter", value: "organization" },
  { label: "Subscription", value: "subscription" },
  { label: "Job", value: "job" },
  { label: "Candidate", value: "candidate" },
  { label: "Auth", value: "auth" },
];

const prettifyText = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminAuditLogs = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");

  const { logs, pagination, isLoading, isFetching, error } = useAdminAuditLogs({
    page,
    limit: ADMIN_AUDIT_LOGS_PAGE_SIZE,
    search,
    action: actionFilter,
    entityType: entityTypeFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, entityTypeFilter]);

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track admin, job, candidate, and authentication events.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Audit Events ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search action, user, recruiter..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-52 h-10">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.map((option) => (
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
                Failed to load audit logs. Please try again.
              </div>
            ) : logs.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No audit events found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-3 px-6 font-medium">Action</th>
                      <th className="text-left py-3 px-4 font-medium">Entity Type</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Recruiter</th>
                      <th className="text-left py-3 px-4 font-medium">Metadata</th>
                      <th className="text-left py-3 px-6 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border/10 align-top hover:bg-muted/5 transition-colors">
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {prettifyText(log.action)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{prettifyText(log.entity_type)}</td>
                        <td className="py-4 px-4 text-muted-foreground">{log.user_name}</td>
                        <td className="py-4 px-4 text-muted-foreground">{log.organization_name}</td>
                        <td className="py-4 px-4 text-xs">
                          <pre className="bg-muted/30 rounded-md p-2 whitespace-pre-wrap break-all max-w-[360px]">
                            {JSON.stringify(log.metadata || {}, null, 2)}
                          </pre>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDateTime(log.created_at)}
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

export default AdminAuditLogs;
