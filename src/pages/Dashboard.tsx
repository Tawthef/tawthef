import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Users, TrendingUp, Clock, ArrowRight, Plus, FileText,
  Video, Gift, User, Loader2, CheckCircle, UserCheck, BarChart3,
  Building2, CreditCard, AlertCircle, XCircle
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCandidateStats, useCandidateApplications } from "@/hooks/useCandidateDashboard";
import { useEmployerDashboard } from "@/hooks/useEmployerDashboard";
import { useAgencyDashboard } from "@/hooks/useAgencyDashboard";
import { Link, useNavigate } from "react-router-dom";

// ─── Status Badge ────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; className: string }> = {
    applied: { label: "Applied", className: "bg-muted text-muted-foreground" },
    agency_shortlisted: { label: "Shortlisted", className: "bg-primary/10 text-primary" },
    hr_shortlisted: { label: "HR Review", className: "bg-blue-500/10 text-blue-400" },
    technical_shortlisted: { label: "Tech Review", className: "bg-cyan-500/10 text-cyan-400" },
    interview: { label: "Interview", className: "bg-accent/10 text-accent" },
    offer: { label: "Offer", className: "bg-warning/10 text-warning" },
    hired: { label: "Hired", className: "bg-success/10 text-success" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  };
  const c = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={c.className + " border-0 text-xs"}>{c.label}</Badge>;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── KPI Card ────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}
const KpiCard = ({ label, value, icon: Icon, color, trend }: KpiCardProps) => (
  <Card className="card-dashboard">
    <CardContent className="p-4 sm:p-6 pt-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">{value}</p>
          {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-${color}/10 flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const KpiSkeleton = () => (
  <Card className="card-dashboard">
    <CardContent className="p-4 sm:p-6 pt-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-2xl" />
      </div>
    </CardContent>
  </Card>
);

// ─── CANDIDATE DASHBOARD ─────────────────────────────────────────
const CandidateDashboard = () => {
  const { stats, isLoading: statsLoading } = useCandidateStats();
  const { data: applications, isLoading: appsLoading } = useCandidateApplications();
  const { profile } = useProfile();

  const statCards: KpiCardProps[] = [
    { label: "Applications", value: stats?.applicationsSubmitted ?? 0, icon: FileText, color: "primary" },
    { label: "Interviews", value: stats?.interviewsScheduled ?? 0, icon: Video, color: "accent" },
    { label: "Offers", value: stats?.offersReceived ?? 0, icon: Gift, color: "success" },
    {
      label: "Profile",
      value: `${stats?.profileCompleteness ?? 0}%`,
      icon: User,
      color: (stats?.profileCompleteness ?? 0) >= 70 ? "success" : "warning",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-base sm:text-lg font-light">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!
            </p>
          </div>
          <Link to="/dashboard/jobs">
            <Button className="w-full sm:w-fit shadow-lg shadow-primary/20 h-11 sm:h-12 px-6 sm:px-8">
              <Briefcase className="w-4 h-4 mr-2" /> Browse Jobs
            </Button>
          </Link>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : statCards.map(s => <KpiCard key={s.label} {...s} />)}
        </div>

        {/* Lower panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Recent Applications */}
          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Recent Applications</CardTitle>
              <Link to="/dashboard/applications">
                <Button variant="ghost" size="sm" className="text-primary font-medium text-xs">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {appsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/10">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : applications && applications.length > 0 ? (
                applications.slice(0, 5).map(app => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{app.job_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.company_name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {getStatusBadge(app.status)}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(app.applied_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No applications yet</p>
                  <p className="text-xs mt-1">Start by browsing available jobs</p>
                  <Link to="/dashboard/jobs">
                    <Button variant="link" className="mt-2 text-sm">Browse jobs →</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Strength */}
          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Profile Strength</CardTitle>
              <Link to="/dashboard/profile">
                <Button variant="ghost" size="sm" className="text-primary font-medium text-xs">
                  Edit <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold">{stats?.profileCompleteness ?? 0}%</span>
                </div>
                <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${(stats?.profileCompleteness ?? 0) >= 70 ? "bg-success" :
                        (stats?.profileCompleteness ?? 0) >= 40 ? "bg-warning" : "bg-destructive/50"
                      }`}
                    style={{ width: `${stats?.profileCompleteness ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Add skills", done: (stats?.profileCompleteness ?? 0) > 0 },
                  { label: "Set experience", done: (stats?.profileCompleteness ?? 0) >= 30 },
                  { label: "Upload resume", done: (stats?.profileCompleteness ?? 0) >= 70 },
                  { label: "Add keywords", done: (stats?.profileCompleteness ?? 0) >= 50 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 ${item.done ? "text-success" : "text-muted-foreground/30"}`} />
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
              <Link to="/dashboard/profile">
                <Button variant="outline" className="w-full rounded-xl" size="sm">
                  Complete My Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── EMPLOYER DASHBOARD ──────────────────────────────────────────
const EmployerDashboard = () => {
  const { profile } = useProfile();
  const { stats, isLoading, activity, isActivityLoading } = useEmployerDashboard();
  const navigate = useNavigate();

  const statCards: KpiCardProps[] = [
    { label: "Active Jobs", value: stats?.activeJobs ?? 0, icon: Briefcase, color: "primary" },
    { label: "Total Applicants", value: stats?.totalApplicants ?? 0, icon: Users, color: "primary" },
    { label: "Shortlisted", value: stats?.shortlisted ?? 0, icon: UserCheck, color: "accent" },
    { label: "In Interview", value: stats?.inInterview ?? 0, icon: Video, color: "success" },
    { label: "Hired", value: stats?.hired ?? 0, icon: CheckCircle, color: "success" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "destructive" },
  ];

  const planLabel: Record<string, string> = {
    job_slot_basic: "Basic Plan",
    job_slot_pro: "Pro Plan",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-base sm:text-lg font-light">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!
            </p>
          </div>
          <Link to="/dashboard/jobs">
            <Button className="w-full sm:w-fit shadow-lg shadow-primary/20 h-11 sm:h-12 px-6 sm:px-8">
              <Plus className="w-4 h-4 mr-2" /> Post New Job
            </Button>
          </Link>
        </div>

        {/* Subscription status banner */}
        {!isLoading && (
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border ${stats?.subscriptionActive
              ? "bg-success/5 border-success/20"
              : "bg-warning/5 border-warning/20"
            }`}>
            <div className="flex items-center gap-3">
              <CreditCard className={`w-5 h-5 ${stats?.subscriptionActive ? "text-success" : "text-warning"}`} />
              <div>
                <p className="text-sm font-medium">
                  {stats?.subscriptionActive
                    ? `${planLabel[stats.subscriptionPlan!] || stats.subscriptionPlan} — ${stats.jobSlotsUsed}/${stats.jobSlotsLimit} slots used`
                    : "No active subscription"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.subscriptionActive ? "Your plan is active" : "Subscribe to post jobs and access candidates"}
                </p>
              </div>
            </div>
            {!stats?.subscriptionActive && (
              <Button size="sm" className="w-fit" onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            )}
          </div>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            : statCards.map(s => <KpiCard key={s.label} {...s} />)}
        </div>

        {/* Activity + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
              <Link to="/dashboard/candidates">
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isActivityLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))
              ) : activity.length > 0 ? (
                activity.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2 text-right">
                      {getStatusBadge(item.status || "applied")}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(item.date)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No applications yet</p>
                  <p className="text-xs mt-1">Post a job to start receiving applications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-dashboard">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Post New Job", href: "/dashboard/jobs", icon: Plus },
                { label: "Search Talent", href: "/dashboard/talent-search", icon: Users },
                { label: "View Pipeline", href: "/dashboard/pipeline", icon: TrendingUp },
                { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
                { label: "Manage Subscription", href: "/pricing", icon: CreditCard },
              ].map(action => (
                <Link key={action.label} to={action.href} className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/20 hover:bg-muted/20 hover:border-border/40 transition-all cursor-pointer">
                    <action.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── AGENCY DASHBOARD ────────────────────────────────────────────
const AgencyDashboard = () => {
  const { profile } = useProfile();
  const { stats, isLoading, recentSubmissions } = useAgencyDashboard();

  const statCards: KpiCardProps[] = [
    { label: "Jobs Posted", value: stats?.totalJobs ?? 0, icon: Briefcase, color: "primary" },
    { label: "Total Submitted", value: stats?.candidatesSubmitted ?? 0, icon: Users, color: "primary" },
    { label: "Agency Shortlisted", value: stats?.agencyShortlisted ?? 0, icon: UserCheck, color: "accent" },
    { label: "In Interview", value: stats?.inInterview ?? 0, icon: Video, color: "success" },
    { label: "Hired", value: stats?.hired ?? 0, icon: CheckCircle, color: "success" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-base sm:text-lg font-light">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!
            </p>
          </div>
          <Link to="/dashboard/candidates">
            <Button className="w-full sm:w-fit shadow-lg shadow-primary/20 h-11 sm:h-12 px-6 sm:px-8">
              <Plus className="w-4 h-4 mr-2" /> Submit Candidate
            </Button>
          </Link>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            : statCards.map(s => <KpiCard key={s.label} {...s} />)}
        </div>

        {/* Pipeline bar */}
        {!isLoading && stats && stats.candidatesSubmitted > 0 && (
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Pipeline Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                {[
                  { count: stats.agencyShortlisted, color: "bg-primary" },
                  { count: stats.hrShortlisted, color: "bg-blue-500" },
                  { count: stats.inInterview, color: "bg-accent" },
                  { count: stats.hired, color: "bg-success" },
                  { count: stats.rejected, color: "bg-destructive/60" },
                ].filter(s => s.count > 0).map((seg, i) => (
                  <div
                    key={i}
                    className={`${seg.color} h-full transition-all`}
                    style={{ flex: seg.count }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {[
                  { label: "Agency Shortlisted", color: "bg-primary", count: stats.agencyShortlisted },
                  { label: "HR Shortlisted", color: "bg-blue-500", count: stats.hrShortlisted },
                  { label: "Interview", color: "bg-accent", count: stats.inInterview },
                  { label: "Hired", color: "bg-success", count: stats.hired },
                  { label: "Rejected", color: "bg-destructive/60", count: stats.rejected },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    {item.label}: <span className="font-medium text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <Card className="lg:col-span-2 card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-lg font-semibold">Recent Submissions</CardTitle>
              <Link to="/dashboard/submissions">
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))
              ) : recentSubmissions.length > 0 ? (
                recentSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sub.candidateName}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.jobTitle}</p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2 text-right">
                      {getStatusBadge(sub.status)}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(sub.appliedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No submissions yet</p>
                  <p className="text-xs mt-1">Submit candidates to open job requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-dashboard">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Browse Job Requests", href: "/dashboard/jobs", icon: Briefcase },
                { label: "Search Talent", href: "/dashboard/talent-search", icon: Users },
                { label: "All Submissions", href: "/dashboard/submissions", icon: FileText },
                { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
                { label: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
              ].map(action => (
                <Link key={action.label} to={action.href} className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/20 hover:bg-muted/20 hover:border-border/40 transition-all">
                    <action.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── MAIN ROUTER ─────────────────────────────────────────────────
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
                Your account doesn't have a valid role. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  switch (profile.role) {
    case "employer": return <EmployerDashboard />;
    case "agency": return <AgencyDashboard />;
    case "expert":
    case "admin":
    case "candidate":
    default: return <CandidateDashboard />;
  }
};

export default Dashboard;
