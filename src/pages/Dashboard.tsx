import ActivityTimeline, { ActivityTimelineItem } from "@/components/ActivityTimeline";
import DashboardStatCard, { DashboardStatCardSkeleton } from "@/components/dashboard/DashboardStatCard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAgencyDashboard } from "@/hooks/useAgencyDashboard";
import { useCandidateApplications, useCandidateStats } from "@/hooks/useCandidateDashboard";
import { useEmployerDashboard } from "@/hooks/useEmployerDashboard";
import { useProfile } from "@/hooks/useProfile";
import { useProfileStrength } from "@/hooks/useProfileStrength";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle,
  FileText,
  Gift,
  Loader2,
  LucideIcon,
  Search,
  Upload,
  User,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
];

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  agency_shortlisted: "Shortlisted",
  hr_shortlisted: "HR Review",
  technical_shortlisted: "Tech Review",
  interview: "Interview",
  offer: "Offer",
  offer_sent: "Offer",
  offered: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  agency_shortlisted: "bg-primary/10 text-primary",
  hr_shortlisted: "bg-primary/10 text-primary",
  technical_shortlisted: "bg-primary/10 text-primary",
  interview: "bg-warning/10 text-warning",
  offer: "bg-success/10 text-success",
  offer_sent: "bg-success/10 text-success",
  offered: "bg-success/10 text-success",
  hired: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const getStatusBadge = (status: string) => {
  const label = STATUS_LABELS[status] || status;
  const style = STATUS_STYLES[status] || "bg-muted text-muted-foreground";
  return <Badge className={`${style} border-0 text-xs`}>{label}</Badge>;
};

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

const QuickActionsCard = ({ title, actions }: { title: string; actions: QuickAction[] }) => (
  <Card className="card-dashboard">
    <CardHeader className="pb-4">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {actions.map((action) => (
        <Link key={action.label} to={action.href}>
          <div className="flex items-center gap-3 rounded-xl border border-border/20 px-3 py-3 hover:bg-muted/20 transition-colors">
            <action.icon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{action.label}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
          </div>
        </Link>
      ))}
    </CardContent>
  </Card>
);

const DashboardSectionSkeleton = () => (
  <Card className="card-dashboard">
    <CardHeader className="pb-4">
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </CardContent>
  </Card>
);

const CandidateDashboard = () => {
  const { profile } = useProfile();
  const { stats, isLoading: isStatsLoading } = useCandidateStats();
  const { data: applications = [], isLoading: isAppsLoading } = useCandidateApplications();
  const { data: profileStrength, isLoading: isStrengthLoading } = useProfileStrength(profile?.id);

  const profilePercentage = profileStrength?.percentage ?? stats?.profileCompleteness ?? 0;
  const missingSectionsCount = profileStrength?.missingSections?.length || 0;

  const candidateChartData = [
    {
      name: "Applied",
      value: applications.filter((app) => app.status === "applied").length,
    },
    {
      name: "Shortlisted",
      value: applications.filter((app) =>
        ["agency_shortlisted", "hr_shortlisted", "technical_shortlisted"].includes(app.status),
      ).length,
    },
    {
      name: "Interview",
      value: applications.filter((app) => app.status === "interview").length,
    },
    {
      name: "Offer",
      value: applications.filter((app) => ["offer", "offer_sent", "offered"].includes(app.status)).length,
    },
    {
      name: "Rejected",
      value: applications.filter((app) => app.status === "rejected").length,
    },
  ].filter((entry) => entry.value > 0);

  const candidateActivities: ActivityTimelineItem[] = applications.slice(0, 10).map((application) => ({
    id: application.id,
    action_type: "application",
    description: `Applied for ${application.job_title}`,
    created_at: application.applied_at,
  }));

  const cards = [
    {
      title: "Applications submitted",
      value: stats?.applicationsSubmitted ?? 0,
      icon: FileText,
      trendText: "Total submitted",
      trendTone: "neutral" as const,
    },
    {
      title: "Interviews scheduled",
      value: stats?.interviewsScheduled ?? 0,
      icon: Video,
      trendText: "Upcoming interviews",
      trendTone: "neutral" as const,
    },
    {
      title: "Offers received",
      value: stats?.offersReceived ?? 0,
      icon: Gift,
      trendText: "Offer stage progress",
      trendTone: "up" as const,
    },
    {
      title: "Profile strength",
      value: `${profilePercentage}%`,
      icon: User,
      trendText: missingSectionsCount > 0 ? `${missingSectionsCount} sections missing` : "Profile is complete",
      trendTone: missingSectionsCount > 0 ? ("down" as const) : ("up" as const),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Candidate Dashboard</h1>
          <p className="text-muted-foreground">
            Track your applications, profile strength, and interview progress.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isStatsLoading || isStrengthLoading
            ? Array.from({ length: 4 }).map((_, index) => <DashboardStatCardSkeleton key={index} />)
            : cards.map((card) => <DashboardStatCard key={card.title} {...card} />)}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isAppsLoading ? (
            <div className="lg:col-span-2">
              <DashboardSectionSkeleton />
            </div>
          ) : (
            <Card className="card-dashboard lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Application Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No applications yet.</p>
                    <Link to="/dashboard/jobs" className="inline-block mt-3">
                      <Button size="sm">Browse Jobs</Button>
                    </Link>
                  </div>
                ) : candidateChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Status distribution will appear once applications move through stages.</p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={candidateChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={2}
                          >
                            {candidateChartData.map((entry, index) => (
                              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [value, "Applications"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3">
                      {candidateChartData.map((entry, index) => (
                        <div key={entry.name} className="rounded-lg bg-muted/20 px-2 py-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="text-muted-foreground">{entry.name}</span>
                          </div>
                          <p className="font-semibold mt-1">{entry.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <QuickActionsCard
            title="Quick Actions"
            actions={[
              { label: "Browse Jobs", href: "/dashboard/jobs", icon: Briefcase },
              { label: "Update Profile", href: "/dashboard/profile", icon: User },
              { label: "Upload CV", href: "/dashboard/cv-builder", icon: Upload },
            ]}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAppsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl bg-muted/10 p-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : applications.length > 0 ? (
                applications.slice(0, 5).map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between rounded-xl border border-border/20 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{application.job_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{application.company_name}</p>
                    </div>
                    <div className="text-right ml-3">
                      {getStatusBadge(application.status)}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(application.applied_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">No applications yet.</p>
                  <Link to="/dashboard/jobs" className="inline-block mt-3">
                    <Button size="sm">Browse Jobs</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <ActivityTimeline
            title="Recent Activity"
            activities={candidateActivities}
            isLoading={isAppsLoading}
            emptyMessage="No activity yet."
          />
        </section>
      </div>
    </DashboardLayout>
  );
};

const EmployerDashboard = () => {
  const { stats, isLoading, activity, isActivityLoading, topAiMatches, isTopAiMatchesLoading } = useEmployerDashboard();

  const cards = [
    {
      title: "Active jobs",
      value: stats?.activeJobs ?? 0,
      icon: Briefcase,
      trendText: "Open requisitions",
      trendTone: "neutral" as const,
    },
    {
      title: "Total applicants",
      value: stats?.totalApplicants ?? 0,
      icon: Users,
      trendText: "Across all jobs",
      trendTone: "neutral" as const,
    },
    {
      title: "Shortlisted candidates",
      value: stats?.shortlisted ?? 0,
      icon: UserCheck,
      trendText: "Ready for next step",
      trendTone: "up" as const,
    },
    {
      title: "Interviews scheduled",
      value: stats?.inInterview ?? 0,
      icon: Video,
      trendText: "In active process",
      trendTone: "neutral" as const,
    },
    {
      title: "Offers sent",
      value: stats?.offersSent ?? 0,
      icon: CheckCircle,
      trendText: "Offer stage",
      trendTone: "up" as const,
    },
  ];

  const pipelineData = [
    { name: "Applicants", value: stats?.totalApplicants ?? 0 },
    { name: "Shortlisted", value: stats?.shortlisted ?? 0 },
    { name: "Interview", value: stats?.inInterview ?? 0 },
    { name: "Offer", value: stats?.offersSent ?? 0 },
    { name: "Hired", value: stats?.hired ?? 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Employer Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor hiring pipeline performance and take action from one place.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => <DashboardStatCardSkeleton key={index} />)
            : cards.map((card) => <DashboardStatCard key={card.title} {...card} />)}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="lg:col-span-2">
              <DashboardSectionSkeleton />
            </div>
          ) : (
            <Card className="card-dashboard lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Hiring Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.activeJobs ?? 0) === 0 ? (
                  <div className="py-10 text-center">
                    <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No active job postings.</p>
                    <Link to="/dashboard/jobs" className="inline-block mt-3">
                      <Button size="sm">Create Job</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipelineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [value, "Candidates"]} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <QuickActionsCard
            title="Quick Actions"
            actions={[
              { label: "Create Job", href: "/dashboard/jobs", icon: Briefcase },
              { label: "Search CVs", href: "/dashboard/resume-search", icon: Search },
              { label: "View Talent Pools", href: "/dashboard/talent-pools", icon: Users },
            ]}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityTimeline
            title="Recent Hiring Activity"
            activities={activity}
            isLoading={isActivityLoading}
            emptyMessage="No hiring activity yet."
          />

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Top AI Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isTopAiMatchesLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-xl bg-muted/10 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </div>
                ))
              ) : topAiMatches.length > 0 ? (
                topAiMatches.map((match) => (
                  <div key={`${match.jobId}-${match.candidateId}`} className="rounded-xl border border-border/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{match.candidateName}</p>
                        <p className="text-xs text-muted-foreground truncate">{match.jobTitle}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0">{match.score}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Updated {formatDate(match.updatedAt)}</p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <UserCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">No AI matches yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

const AgencyDashboard = () => {
  const { stats, isLoading, recentSubmissions, activity, isActivityLoading } = useAgencyDashboard();

  const cards = [
    {
      title: "Jobs managed",
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      trendText: "Open client jobs",
      trendTone: "neutral" as const,
    },
    {
      title: "Candidates submitted",
      value: stats?.candidatesSubmitted ?? 0,
      icon: Users,
      trendText: "Total submissions",
      trendTone: "neutral" as const,
    },
    {
      title: "Client approvals",
      value: stats?.hrShortlisted ?? 0,
      icon: CheckCircle,
      trendText: "Approved by client",
      trendTone: "up" as const,
    },
    {
      title: "Interviews scheduled",
      value: stats?.inInterview ?? 0,
      icon: Video,
      trendText: "Interview stage",
      trendTone: "neutral" as const,
    },
  ];

  const performanceData = [
    { name: "Submitted", value: stats?.candidatesSubmitted ?? 0 },
    { name: "Shortlisted", value: (stats?.agencyShortlisted ?? 0) + (stats?.hrShortlisted ?? 0) },
    { name: "Interview", value: stats?.inInterview ?? 0 },
    { name: "Hired", value: stats?.hired ?? 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Agency Dashboard</h1>
          <p className="text-muted-foreground">
            Manage client submissions and hiring progress with consistent visibility.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <DashboardStatCardSkeleton key={index} />)
            : cards.map((card) => <DashboardStatCard key={card.title} {...card} />)}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="lg:col-span-2">
              <DashboardSectionSkeleton />
            </div>
          ) : (
            <Card className="card-dashboard lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Submission Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.candidatesSubmitted ?? 0) === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No candidate submissions yet.</p>
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [value, "Candidates"]} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <QuickActionsCard
            title="Quick Actions"
            actions={[
              { label: "Submit Candidate", href: "/dashboard/candidates", icon: UserCheck },
              { label: "Search CVs", href: "/dashboard/resume-search", icon: Search },
              { label: "Manage Client Jobs", href: "/dashboard/jobs", icon: Briefcase },
            ]}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityTimeline
            title="Recent Hiring Activity"
            activities={activity}
            isLoading={isActivityLoading}
            emptyMessage="No hiring activity yet."
          />

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-xl bg-muted/10 p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </div>
                ))
              ) : recentSubmissions.length > 0 ? (
                recentSubmissions.slice(0, 5).map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-border/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{submission.candidateName}</p>
                        <p className="text-xs text-muted-foreground truncate">{submission.jobTitle}</p>
                      </div>
                      <div className="text-right ml-2">
                        {getStatusBadge(submission.status)}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(submission.appliedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">No candidate submissions yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

const Dashboard = () => {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile?.role || !["candidate", "employer", "agency", "admin", "expert"].includes(profile.role)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Account Not Configured</h2>
              <p className="text-muted-foreground text-sm">
                Your account does not have a valid role. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  switch (profile.role) {
    case "candidate":
      return <CandidateDashboard />;
    case "employer":
      return <EmployerDashboard />;
    case "agency":
      return <AgencyDashboard />;
    case "admin":
      return <Navigate to="/dashboard/admin/overview" replace />;
    case "expert":
      return <Navigate to="/dashboard/reviews" replace />;
    default:
      return <CandidateDashboard />;
  }
};

export default Dashboard;
