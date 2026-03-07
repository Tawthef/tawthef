import { Navigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Briefcase,
  FileText,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import DashboardStatCard, { DashboardStatCardSkeleton } from "@/components/dashboard/DashboardStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AdminAnalytics = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { analytics, isLoading, error } = useAdminAnalytics();

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <DashboardStatCardSkeleton key={index} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="card-dashboard">
                <CardHeader>
                  <Skeleton className="h-5 w-44" />
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

  if (error || !analytics) {
    return (
      <DashboardLayout>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-destructive mx-auto animate-spin" />
            <p className="text-destructive">Failed to load platform analytics. Please try again.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const kpis = [
    {
      title: "Total Candidates",
      value: analytics.totalCandidates.toLocaleString("en-US"),
      icon: Users,
      trendText: "Registered candidate accounts",
      trendTone: "neutral" as const,
    },
    {
      title: "Total Recruiters",
      value: analytics.totalRecruiters.toLocaleString("en-US"),
      icon: Shield,
      trendText: "Employers and agencies",
      trendTone: "neutral" as const,
    },
    {
      title: "Active Jobs",
      value: analytics.activeJobs.toLocaleString("en-US"),
      icon: Briefcase,
      trendText: "Jobs currently open",
      trendTone: "neutral" as const,
    },
    {
      title: "Applications Submitted",
      value: analytics.applicationsSubmitted.toLocaleString("en-US"),
      icon: FileText,
      trendText: "Total applications on platform",
      trendTone: "up" as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Platform Analytics
          </h1>
          <p className="text-muted-foreground">
            Track growth, application trends, recruiter activity, and engagement.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <DashboardStatCard key={kpi.title} {...kpi} />
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Candidate Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.candidateGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Job Posting Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.jobPostingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-dashboard lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Application Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.applicationVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recruiter Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Jobs Posted</p>
                <p className="text-2xl font-bold">{analytics.recruiterActivity.jobsPosted}</p>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Applications Reviewed</p>
                <p className="text-2xl font-bold">{analytics.recruiterActivity.applicationsReviewed}</p>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Interviews Scheduled</p>
                <p className="text-2xl font-bold">{analytics.recruiterActivity.interviewsScheduled}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Platform Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Daily Logins</p>
                <p className="text-2xl font-bold">{analytics.platformEngagement.dailyLogins}</p>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.platformEngagement.activeUsers}</p>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{analytics.platformEngagement.messagesSent}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
