import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
    Loader2, CreditCard, Clock, TrendingUp, Users,
    Search, AlertTriangle, CheckCircle, XCircle, Building2
} from "lucide-react";
import { useState, useMemo } from "react";

interface SubscriptionRow {
    id: string;
    organization_id: string;
    organization_name: string | null;
    plan_type: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    usage_limit: number;
    usage_used: number;
    created_at: string;
    days_remaining: number;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const getPlanLabel = (planType: string) => {
    const labels: Record<string, string> = {
        job_slot_basic: "Job Slot Basic",
        job_slot_pro: "Job Slot Pro",
        resume_search: "Resume Search",
    };
    return labels[planType] || planType;
};

const AdminSubscriptions = () => {
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPlan, setFilterPlan] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch all subscriptions via the admin stats view
    const { data: subscriptions, isLoading } = useQuery({
        queryKey: ['admin-subscriptions'],
        queryFn: async (): Promise<SubscriptionRow[]> => {
            const { data, error } = await supabase
                .from('admin_subscription_stats')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[AdminSubscriptions] Error:', error);
                return [];
            }

            return (data || []) as SubscriptionRow[];
        },
        staleTime: 30 * 1000,
    });

    const allSubs = subscriptions || [];

    // Computed stats
    const stats = useMemo(() => {
        const active = allSubs.filter(s => s.is_active);
        const expiringIn7Days = active.filter(s => s.days_remaining >= 0 && s.days_remaining <= 7);
        const uniqueOrgs = new Set(active.map(s => s.organization_id));

        // Revenue by plan
        const revenueByPlan: Record<string, number> = {};
        allSubs.forEach(s => {
            if (!revenueByPlan[s.plan_type]) revenueByPlan[s.plan_type] = 0;
            revenueByPlan[s.plan_type] += 1; // Count-based since we don't have price on subscription
        });

        return {
            totalActive: active.length,
            expiringCount: expiringIn7Days.length,
            totalSubscriptions: allSubs.length,
            activeRecruiters: uniqueOrgs.size,
            revenueByPlan,
        };
    }, [allSubs]);

    // Filtered subscriptions
    const filtered = useMemo(() => {
        return allSubs.filter(s => {
            if (filterStatus === "active" && !s.is_active) return false;
            if (filterStatus === "expired" && s.is_active) return false;
            if (filterStatus === "expiring" && (s.days_remaining < 0 || s.days_remaining > 7 || !s.is_active)) return false;
            if (filterPlan !== "all" && s.plan_type !== filterPlan) return false;
            if (searchQuery && !(s.organization_name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [allSubs, filterStatus, filterPlan, searchQuery]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                        Subscription Monitoring
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        Monitor active subscriptions, usage, and revenue across all organizations
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-success" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Active Subscriptions</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalActive}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-warning" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Expiring ≤ 7 Days</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.expiringCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Total Subscriptions</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalSubscriptions}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Active Recruiters</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.activeRecruiters}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Revenue by Plan */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Subscriptions by Plan Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(stats.revenueByPlan).map(([plan, count]) => (
                                <div key={plan} className="flex items-center gap-3 bg-muted/30 rounded-xl px-5 py-3">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{getPlanLabel(plan)}</p>
                                        <p className="text-xs text-muted-foreground">{count} subscription{count !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(stats.revenueByPlan).length === 0 && (
                                <p className="text-sm text-muted-foreground">No subscription data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organization..."
                            className="pl-11 h-11 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="expiring">Expiring Soon</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filterPlan} onValueChange={setFilterPlan}>
                        <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl">
                            <SelectValue placeholder="Plan Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Plans</SelectItem>
                            <SelectItem value="job_slot_basic">Job Slot Basic</SelectItem>
                            <SelectItem value="job_slot_pro">Job Slot Pro</SelectItem>
                            <SelectItem value="resume_search">Resume Search</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Subscriptions Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Organization</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Plan Type</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Status</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Usage</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Start Date</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">End Date</th>
                                        <th className="text-left px-6 py-4 font-semibold text-muted-foreground">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No subscriptions found matching your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((sub) => (
                                            <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Building2 className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="font-medium text-foreground">
                                                            {sub.organization_name || 'Unknown Org'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="text-xs">
                                                        {getPlanLabel(sub.plan_type)}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {sub.is_active ? (
                                                        sub.days_remaining <= 7 ? (
                                                            <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                                                                Expiring
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-success/10 text-success border-success/20 text-xs">
                                                                Active
                                                            </Badge>
                                                        )
                                                    ) : (
                                                        <Badge className="bg-muted text-muted-foreground text-xs">
                                                            Expired
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {sub.usage_used} / {sub.usage_limit}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {formatDate(sub.start_date)}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {formatDate(sub.end_date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-medium ${sub.days_remaining <= 0 ? 'text-destructive' :
                                                            sub.days_remaining <= 7 ? 'text-warning' :
                                                                'text-foreground'
                                                        }`}>
                                                        {sub.days_remaining > 0 ? `${sub.days_remaining}d` : 'Expired'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminSubscriptions;
