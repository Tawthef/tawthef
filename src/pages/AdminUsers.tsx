import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Shield, Search, Loader2, Users, Building2,
    UserCheck, Briefcase, ChevronDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface PlatformUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_name: string | null;
    created_at: string;
    last_sign_in_at: string | null;
}

const ROLES = [
    { value: "candidate", label: "Candidate", icon: UserCheck, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { value: "employer", label: "Employer", icon: Briefcase, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { value: "agency", label: "Agency", icon: Building2, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { value: "expert", label: "Tech Reviewer", icon: Shield, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { value: "admin", label: "Admin", icon: Shield, color: "bg-red-500/10 text-red-400 border-red-500/20" },
];

const getRoleMeta = (role: string) =>
    ROLES.find(r => r.value === role) || { label: role, color: "bg-muted text-muted-foreground border-border" };

const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";

const AdminUsers = () => {
    const { profile } = useProfile();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<string | null>(null);

    if (profile?.role !== "admin") return <Navigate to="/dashboard" replace />;

    // Fetch all users
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async (): Promise<PlatformUser[]> => {
            const { data, error } = await supabase.rpc("get_all_users");
            if (error) throw error;
            return data || [];
        },
        staleTime: 1 * 60 * 1000,
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
            const { error } = await supabase.rpc("update_user_role", {
                p_user_id: userId,
                p_new_role: newRole,
            });
            if (error) throw error;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast({ title: "Role updated", description: `User role changed to ${vars.newRole}.` });
        },
        onError: (err: any) => {
            toast({ title: "Failed", description: err.message || "Could not update role.", variant: "destructive" });
        },
    });

    // Filter users
    const filtered = users.filter(u => {
        const matchSearch = !search ||
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.organization_name?.toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || u.role === filterRole;
        return matchSearch && matchRole;
    });

    // Stats
    const roleCounts = ROLES.reduce((acc, r) => {
        acc[r.value] = users.filter(u => u.role === r.value).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary" />
                        User Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage platform users, assign roles, and control access levels
                    </p>
                </div>

                {/* Role stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {ROLES.map(role => (
                        <button
                            key={role.value}
                            onClick={() => setFilterRole(filterRole === role.value ? null : role.value)}
                            className={`p-4 rounded-xl border text-left transition-all hover:scale-105 ${filterRole === role.value ? role.color + " border-current" : "bg-card border-border/30 hover:border-border"}`}
                        >
                            <p className="text-2xl font-bold">{roleCounts[role.value] ?? 0}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{role.label}s</p>
                        </button>
                    ))}
                </div>

                {/* Search + Table */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                All Users ({filtered.length})
                            </CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, org..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 h-9 rounded-lg"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <p className="text-muted-foreground text-center py-12">No users found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/20 text-muted-foreground">
                                            <th className="text-left py-3 px-6 font-medium">User</th>
                                            <th className="text-left py-3 px-4 font-medium">Organization</th>
                                            <th className="text-left py-3 px-4 font-medium">Role</th>
                                            <th className="text-left py-3 px-4 font-medium">Joined</th>
                                            <th className="text-left py-3 px-4 font-medium">Last Login</th>
                                            <th className="text-right py-3 px-6 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(user => {
                                            const roleMeta = getRoleMeta(user.role);
                                            const isSelf = user.id === profile.id;
                                            return (
                                                <tr key={user.id} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div>
                                                            <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-muted-foreground">
                                                        {user.organization_name || "—"}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <Badge className={`${roleMeta.color} border text-xs`}>
                                                            {roleMeta.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-muted-foreground text-xs">
                                                        {formatDate(user.created_at)}
                                                    </td>
                                                    <td className="py-4 px-4 text-muted-foreground text-xs">
                                                        {formatDate(user.last_sign_in_at)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        {isSelf ? (
                                                            <Badge className="bg-muted text-muted-foreground border-0 text-xs">You</Badge>
                                                        ) : (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 text-xs gap-1"
                                                                        disabled={updateRoleMutation.isPending}
                                                                    >
                                                                        Change Role
                                                                        <ChevronDown className="w-3 h-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    {ROLES.map(r => (
                                                                        <DropdownMenuItem
                                                                            key={r.value}
                                                                            disabled={r.value === user.role}
                                                                            onClick={() => updateRoleMutation.mutate({
                                                                                userId: user.id,
                                                                                newRole: r.value,
                                                                            })}
                                                                        >
                                                                            {r.value === user.role ? "✓ " : ""}{r.label}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminUsers;
