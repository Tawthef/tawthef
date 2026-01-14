import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, TrendingUp, Clock, ArrowRight, Plus, FileText, Video, Gift, User, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCandidateStats, useCandidateApplications } from "@/hooks/useCandidateDashboard";
import { Link } from "react-router-dom";

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; className: string }> = {
    "applied": { label: "Applied", className: "bg-muted text-muted-foreground" },
    "agency_shortlisted": { label: "Shortlisted", className: "bg-primary/10 text-primary" },
    "employer_review": { label: "In Review", className: "bg-accent/10 text-accent" },
    "hired": { label: "Hired", className: "bg-success/10 text-success" },
    "rejected": { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  };
  const c = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={c.className + " border-0"}>{c.label}</Badge>;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Candidate Dashboard Component
const CandidateDashboard = () => {
  const { stats, isLoading: statsLoading } = useCandidateStats();
  const { data: applications, isLoading: appsLoading } = useCandidateApplications();
  const { profile } = useProfile();

  const statCards = [
    { label: "Applications", value: stats.applicationsSubmitted, icon: FileText, color: "primary" },
    { label: "Interviews", value: stats.interviewsScheduled, icon: Video, color: "accent" },
    { label: "Offers", value: stats.offersReceived, icon: Gift, color: "success" },
    { label: "Profile", value: `${stats.profileCompleteness}%`, icon: User, color: stats.profileCompleteness >= 70 ? "success" : "warning" },
  ];

  const isLoading = statsLoading || appsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-base sm:text-lg font-light">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
            </p>
          </div>
          <Link to="/dashboard/jobs">
            <Button className="w-full sm:w-fit shadow-lg shadow-primary/20 h-11 sm:h-14 px-6 sm:px-8">
              <Briefcase className="w-5 h-5 mr-2" />Browse Jobs
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {statCards.map((stat) => (
                <Card key={stat.label} className="card-dashboard">
                  <CardContent className="p-4 sm:p-6 lg:pt-8 lg:pb-8">
                    <div className="flex items-start justify-between">
                      <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
              {/* Recent Applications */}
              <Card className="card-dashboard">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
                  <CardTitle className="text-xl font-semibold">Recent Applications</CardTitle>
                  <Link to="/dashboard/applications">
                    <Button variant="ghost" size="sm" className="text-primary font-medium">
                      View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {applications && applications.length > 0 ? (
                    applications.slice(0, 4).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-5 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{app.job_title}</p>
                            <p className="text-sm text-muted-foreground font-light">{app.company_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(app.status)}
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(app.applied_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No applications yet</p>
                      <Link to="/dashboard/jobs">
                        <Button variant="link" className="mt-2">Browse jobs →</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profile Completion */}
              <Card className="card-dashboard">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
                  <CardTitle className="text-xl font-semibold">Complete Your Profile</CardTitle>
                  <Link to="/dashboard/profile">
                    <Button variant="ghost" size="sm" className="text-primary font-medium">
                      Edit <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profile strength</span>
                      <span className="font-medium text-foreground">{stats.profileCompleteness}%</span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stats.profileCompleteness >= 70 ? 'bg-success' : stats.profileCompleteness >= 40 ? 'bg-warning' : 'bg-destructive/50'
                          }`}
                        style={{ width: `${stats.profileCompleteness}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Complete these to improve job matching:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="px-3 py-1.5">Add skills</Badge>
                      <Badge variant="outline" className="px-3 py-1.5">Set experience</Badge>
                      <Badge variant="outline" className="px-3 py-1.5">Upload resume</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Employer Dashboard (existing)
const EmployerDashboard = () => {
  const employerStats = { activeJobs: 12, totalCandidates: 156, inPipeline: 48, avgTimeToHire: "18 days" };
  const statCards = [
    { label: "Active Jobs", value: employerStats.activeJobs, icon: Briefcase, trend: "+2 this week", color: "primary" },
    { label: "Total Candidates", value: employerStats.totalCandidates, icon: Users, trend: "+12 today", color: "primary" },
    { label: "In Pipeline", value: employerStats.inPipeline, icon: TrendingUp, trend: "8 pending", color: "accent" },
    { label: "Avg. Time to Hire", value: employerStats.avgTimeToHire, icon: Clock, trend: "-3 days", color: "success" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg font-light">Welcome back, here's what's happening today.</p>
          </div>
          <Button size="lg" className="w-fit shadow-lg shadow-primary/20 h-14 px-8"><Plus className="w-5 h-5 mr-2" />Post New Job</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="card-dashboard">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-light">{stat.trend}</p>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-${stat.color}/10 flex items-center justify-center`}>
                    <stat.icon className={`w-8 h-8 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Main Dashboard Router
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

  if (profile?.role === 'candidate') {
    return <CandidateDashboard />;
  }

  return <EmployerDashboard />;
};

export default Dashboard;
