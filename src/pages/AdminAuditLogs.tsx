import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  Loader2,
  Search,
  Shield,
  User,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogView extends AuditLogRow {
  user_name: string;
  organization_name: string;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const prettifyAction = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const AdminAuditLogs = () => {
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async (): Promise<AuditLogView[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, organization_id, action, entity_type, entity_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("[AdminAuditLogs] Fetch logs error:", error);
        return [];
      }

      const rawLogs = (data || []) as AuditLogRow[];
      if (rawLogs.length === 0) return [];

      const userIds = Array.from(new Set(rawLogs.map((log) => log.user_id).filter((id): id is string => !!id)));
      const orgIds = Array.from(
        new Set(rawLogs.map((log) => log.organization_id).filter((id): id is string => !!id)),
      );

      const [profilesRes, orgsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [], error: null } as any),
        orgIds.length > 0
          ? supabase.from("organizations").select("id, name").in("id", orgIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (profilesRes.error) console.error("[AdminAuditLogs] Profiles error:", profilesRes.error);
      if (orgsRes.error) console.error("[AdminAuditLogs] Organizations error:", orgsRes.error);

      const userNameById = new Map(
        ((profilesRes.data || []) as Array<{ id: string; full_name: string | null }>).map((row) => [
          row.id,
          row.full_name || "Unknown user",
        ]),
      );
      const orgNameById = new Map(
        ((orgsRes.data || []) as Array<{ id: string; name: string | null }>).map((row) => [
          row.id,
          row.name || "Unknown organization",
        ]),
      );

      return rawLogs.map((log) => ({
        ...log,
        user_name: log.user_id ? userNameById.get(log.user_id) || "Unknown user" : "System",
        organization_name: log.organization_id
          ? orgNameById.get(log.organization_id) || "Unknown organization"
          : "Global",
      }));
    },
    staleTime: 60 * 1000,
  });

  const actionOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!needle) return true;

      const haystack = [
        log.action,
        log.entity_type,
        log.user_name,
        log.organization_name,
        log.entity_id || "",
        JSON.stringify(log.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [logs, search, actionFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track platform actions across jobs, applications, interviews, and offers.
          </p>
        </div>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actions, entities, users, metadata..."
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {prettifyAction(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Audit Events ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center py-14 text-muted-foreground">No audit logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Entity</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/10 align-top">
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-primary/10 text-primary border-primary/20 border">
                            {prettifyAction(log.action)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{log.entity_type}</p>
                          <p className="text-xs text-muted-foreground break-all">{log.entity_id || "-"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{log.user_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{log.organization_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <pre className="text-xs bg-muted/30 rounded-md p-2 whitespace-pre-wrap break-all max-w-[360px]">
                            {JSON.stringify(log.metadata || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
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

export default AdminAuditLogs;
