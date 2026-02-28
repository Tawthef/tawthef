import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, DollarSign, CreditCard, Building2, Users, Briefcase,
    FileText, TrendingUp, Clock, AlertTriangle, UserCheck, CheckCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
    AreaChart, Area,
} from 'recharts';

const PLAN_COLORS: Record<string, string> = {
    revenue_basic: 'hsl(220, 80%, 55%)',
    revenue_pro: 'hsl(250, 70%, 55%)',
    revenue_resume: 'hsl(145, 70%, 45%)',
};

const GROWTH_COLORS = {
    new_users: 'hsl(220, 80%, 55%)',
    new_jobs: 'hsl(145, 70%, 45%)',
    new_subscriptions: 'hsl(280, 60%, 55%)',
};

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

const formatPlan = (plan: string) =>
    plan?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString()}`;

const AdminOverview = () => {
    const { profile } = useProfile();
    const { data, isLoading, error } = useAdminDashboard();

    if (profile?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !data) {
        return (
            <DashboardLayout>
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-8 text-center">
                        <p className="text-destructive">Failed to load admin dashboard. Please try again.</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    const { revenue, stats, growth, expiring_subscriptions, recent_jobs, recent_hires, recent_subscriptions } = data;

    const revenuePieData = [
        { name: 'Job Slot Basic', value: revenue.revenue_basic, color: PLAN_COLORS.revenue_basic },
        { name: 'Job Slot Pro', value: revenue.revenue_pro, color: PLAN_COLORS.revenue_pro },
        { name: 'Resume Search', value: revenue.revenue_resume, color: PLAN_COLORS.revenue_resume },
    ].filter(r => r.value > 0);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                        Platform Overview
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        System-wide metrics, revenue, and activity monitoring
                    </p>
                </div>

                {/* KPI Cards — Row 1: Revenue & Subscriptions */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <KPICard
                        label="Total Revenue"
                        value={formatCurrency(revenue.total_revenue)}
                        icon={DollarSign}
                        color="success"
                    />
                    <KPICard
                        label="Active Subscriptions"
                        value={String(revenue.active_subscriptions)}
                        icon={CreditCard}
                        color="primary"
                    />
                    <KPICard
                        label="Expiring Soon"
                        value={String(revenue.expiring_soon)}
                        icon={AlertTriangle}
                        color="warning"
                        subtitle="Within 7 days"
                    />
                    <KPICard
                        label="Organizations"
                        value={String(stats.total_organizations)}
                        icon={Building2}
                        color="accent"
                    />
                </div>

                {/* KPI Cards — Row 2: Platform Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                    <KPICard
                        label="Employers"
                        value={String(stats.total_employers)}
                        icon={Building2}
                        color="primary"
                    />
                    <KPICard
                        label="Agencies"
                        value={String(stats.total_agencies)}
                        icon={Users}
                        color="accent"
                    />
                    <KPICard
                        label="Candidates"
                        value={String(stats.total_candidates)}
                        icon={UserCheck}
                        color="success"
                    />
                    <KPICard
                        label="Total Jobs"
                        value={String(stats.total_jobs)}
                        icon={Briefcase}
                        color="primary"
                    />
                    <KPICard
                        label="Applications"
                        value={String(stats.total_applications)}
                        icon={FileText}
                        color="accent"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue Breakdown Pie */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Revenue by Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {revenuePieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={revenuePieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: $${value}`}
                                        >
                                            {revenuePieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: number) => [`$${value}`, 'Revenue']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                                    No revenue data yet
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Growth Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Platform Growth (12 Months)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {growth.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={GROWTH_COLORS.new_users} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={GROWTH_COLORS.new_users} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradJobs" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={GROWTH_COLORS.new_jobs} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={GROWTH_COLORS.new_jobs} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={GROWTH_COLORS.new_subscriptions} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={GROWTH_COLORS.new_subscriptions} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            height={36}
                                            formatter={(value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        />
                                        <Area type="monotone" dataKey="new_users" stroke={GROWTH_COLORS.new_users} fill="url(#gradUsers)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="new_jobs" stroke={GROWTH_COLORS.new_jobs} fill="url(#gradJobs)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="new_subscriptions" stroke={GROWTH_COLORS.new_subscriptions} fill="url(#gradSubs)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                                    No growth data yet
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Expiring Subscriptions Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                            Expiring Subscriptions (Next 30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expiring_subscriptions.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No subscriptions expiring soon.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/30">
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expiry Date</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Days Left</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expiring_subscriptions.map((sub) => (
                                            <tr key={sub.id} className="border-b border-border/10 hover:bg-muted/5">
                                                <td className="py-3 px-4 font-medium">{sub.organization_name || 'Unknown'}</td>
                                                <td className="py-3 px-4">{formatPlan(sub.plan_type)}</td>
                                                <td className="py-3 px-4">{formatDate(sub.end_date)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={sub.days_remaining <= 7 ? 'text-destructive font-semibold' : 'text-warning font-medium'}>
                                                        {sub.days_remaining} days
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge className={
                                                        sub.days_remaining <= 7
                                                            ? 'bg-destructive/10 text-destructive border-0'
                                                            : 'bg-warning/10 text-warning border-0'
                                                    }>
                                                        {sub.days_remaining <= 7 ? 'Expiring Soon' : 'Active'}
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

                {/* Recent Activity — 3 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Jobs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Recent Jobs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recent_jobs.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No recent jobs.</p>
                            ) : (
                                recent_jobs.slice(0, 5).map((job) => (
                                    <div key={job.id} className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-sm font-medium truncate">{job.title}</p>
                                            <p className="text-xs text-muted-foreground">{job.organization_name}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(job.created_at)}</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Hires */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-success" />
                                Recent Hires
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recent_hires.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No recent hires.</p>
                            ) : (
                                recent_hires.slice(0, 5).map((hire) => (
                                    <div key={hire.id} className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-sm font-medium truncate">{hire.candidate_name}</p>
                                            <p className="text-xs text-muted-foreground">{hire.job_title}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{hire.hired_at ? formatDate(hire.hired_at) : '—'}</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Subscriptions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-accent" />
                                Recent Subscriptions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recent_subscriptions.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No recent subscriptions.</p>
                            ) : (
                                recent_subscriptions.slice(0, 5).map((sub) => (
                                    <div key={sub.id} className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-sm font-medium truncate">{sub.organization_name}</p>
                                            <p className="text-xs text-muted-foreground">{formatPlan(sub.plan_type)}</p>
                                        </div>
                                        <Badge className={
                                            sub.is_active
                                                ? 'bg-success/10 text-success border-0 text-xs'
                                                : 'bg-muted text-muted-foreground border-0 text-xs'
                                        }>
                                            {sub.is_active ? 'Active' : 'Expired'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

// ---- KPI Card (inline, styled for admin) ----
interface KPICardProps {
    label: string;
    value: string;
    icon: React.ElementType;
    color: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
    subtitle?: string;
}

const colorMap: Record<string, string> = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    accent: 'from-accent/10 to-accent/5 text-accent',
    success: 'from-success/10 to-success/5 text-success',
    warning: 'from-warning/10 to-warning/5 text-warning',
    destructive: 'from-destructive/10 to-destructive/5 text-destructive',
};

const KPICard = ({ label, value, icon: Icon, color, subtitle }: KPICardProps) => (
    <Card className="card-dashboard">
        <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground/60">{subtitle}</p>}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br flex items-center justify-center ${colorMap[color]}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default AdminOverview;
