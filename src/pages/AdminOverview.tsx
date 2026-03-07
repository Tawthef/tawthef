import { Navigate } from "react-router-dom";
import {
  Briefcase,
  CreditCard,
  FileText,
  Loader2,
  UserPlus,
  UserRoundCog,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ActivityTimeline from "@/components/ActivityTimeline";
import DashboardStatCard, { DashboardStatCardSkeleton } from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdminPlatformMetrics } from "@/hooks/useAdminPlatformMetrics";
import { useProfile } from "@/hooks/useProfile";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatPlan = (value: string) =>
  value?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";

const formatNumber = (value: number) => value.toLocaleString("en-US");

const AdminOverview = () => {
  const { profile } = useProfile();
  const { data, isLoading, error, activity, isActivityLoading, activityError, kpisError } = useAdminDashboard();
  const {
    totalCandidates,
    totalRecruiters,
    activeJobs,
    totalApplications,
    newRegistrations,
    subscriptionSummary,
    applicationsTrend,
    isMetricsLoading,
    isApplicationsTrendLoading,
    error: metricsError,
  } = useAdminPlatformMetrics();

  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <DashboardStatCardSkeleton key={index} />
            ))}
          </div>
          <Card className="card-dashboard">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="card-dashboard">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-72 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || activityError || kpisError || metricsError || !data) {
    return (
      <DashboardLayout>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-destructive mx-auto animate-spin" />
            <p className="text-destructive">Failed to load admin dashboard data. Please try again.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const totalSubscriptions =
    subscriptionSummary.active + subscriptionSummary.trial + subscriptionSummary.expired;

  const kpiCards = [
    {
      title: "Total Candidates",
      value: formatNumber(totalCandidates),
      icon: Users,
      trendText: "Registered job seekers",
      trendTone: "neutral" as const,
    },
    {
      title: "Total Recruiters",
      value: formatNumber(totalRecruiters),
      icon: UserRoundCog,
      trendText: "Employers and agencies",
      trendTone: "neutral" as const,
    },
    {
      title: "Active Job Postings",
      value: formatNumber(activeJobs),
      icon: Briefcase,
      trendText: "Jobs with open status",
      trendTone: "neutral" as const,
    },
    {
      title: "Applications Submitted",
      value: formatNumber(totalApplications),
      icon: FileText,
      trendText: "Total applications on platform",
      trendTone: "neutral" as const,
    },
    {
      title: "New User Registrations",
      value: formatNumber(newRegistrations),
      icon: UserPlus,
      trendText: "Last 30 days",
      trendTone: "up" as const,
    },
    {
      title: "Subscription Summary",
      value: formatNumber(totalSubscriptions),
      icon: CreditCard,
      trendText: `Active: ${formatNumber(subscriptionSummary.active)}  Trial: ${formatNumber(subscriptionSummary.trial)}  Expired: ${formatNumber(subscriptionSummary.expired)}`,
      trendTone: "neutral" as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor core platform metrics, subscription health, and hiring activity.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isMetricsLoading
            ? Array.from({ length: 6 }).map((_, index) => <DashboardStatCardSkeleton key={index} />)
            : kpiCards.map((card) => <DashboardStatCard key={card.title} {...card} />)}
        </section>

        <section>
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Applications Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {isApplicationsTrendLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : applicationsTrend.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={applicationsTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        name="Applications"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">No applications trend data available yet.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Platform Activity Chart</CardTitle>
            </CardHeader>
            <CardContent>
              {data.growth.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.growth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="new_users" name="New Users" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="new_jobs" name="New Jobs" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="new_subscriptions" name="New Subscriptions" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">No activity chart data available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Subscription Health</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expiring_subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No subscriptions expiring soon.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Recruiter</th>
                        <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Expiry</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expiring_subscriptions.slice(0, 8).map((subscription) => (
                        <tr key={subscription.id} className="border-b border-border/10">
                          <td className="py-2 pr-3">{subscription.organization_name || "Unknown"}</td>
                          <td className="py-2 pr-3">{formatPlan(subscription.plan_type)}</td>
                          <td className="py-2 pr-3">{formatDate(subscription.end_date)}</td>
                          <td className="py-2">
                            <Badge className={subscription.days_remaining <= 7 ? "bg-destructive/10 text-destructive border-0" : "bg-warning/10 text-warning border-0"}>
                              {subscription.days_remaining <= 7 ? "Expiring soon" : "Active"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivityTimeline
            className="lg:col-span-2"
            title="Recent Hiring Activity"
            activities={activity}
            isLoading={isActivityLoading}
            emptyMessage="No hiring activity yet."
          />

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recent Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Jobs</p>
                {data.recent_jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="text-sm">
                    <p className="font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.organization_name}</p>
                  </div>
                ))}
                {data.recent_jobs.length === 0 && <p className="text-sm text-muted-foreground">No recent jobs.</p>}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Hires</p>
                {data.recent_hires.slice(0, 3).map((hire) => (
                  <div key={hire.id} className="text-sm">
                    <p className="font-medium truncate">{hire.candidate_name}</p>
                    <p className="text-xs text-muted-foreground">{hire.job_title}</p>
                  </div>
                ))}
                {data.recent_hires.length === 0 && <p className="text-sm text-muted-foreground">No recent hires.</p>}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Subscriptions</p>
                {data.recent_subscriptions.slice(0, 3).map((subscription) => (
                  <div key={subscription.id} className="text-sm">
                    <p className="font-medium truncate">{subscription.organization_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPlan(subscription.plan_type)}</p>
                  </div>
                ))}
                {data.recent_subscriptions.length === 0 && <p className="text-sm text-muted-foreground">No recent subscriptions.</p>}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminOverview;
