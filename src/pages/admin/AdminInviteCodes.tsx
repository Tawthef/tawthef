import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, Loader2, Plus } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import {
  CreateInviteCodeInput,
  formatInviteBenefit,
  InviteBenefitType,
  InviteCodeStatus,
  useAdminInviteCodes,
} from "@/hooks/useAdminInviteCodes";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BENEFIT_OPTIONS: Array<{ value: InviteBenefitType; label: string }> = [
  { value: "job_slots", label: "Job Slots" },
  { value: "full_access", label: "Full Access" },
];

const getDefaultExpiry = () => {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  return nextMonth.toISOString().slice(0, 16);
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";

const getStatusBadgeClass = (status: InviteCodeStatus) => {
  if (status === "active") return "bg-success/10 text-success border-success/20";
  if (status === "expired") return "bg-muted text-muted-foreground border-border";
  return "bg-warning/10 text-warning border-warning/20";
};

const createRandomCode = () => `TAWTHEF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const AdminInviteCodes = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();
  const { inviteCodes, isLoading, error, createInviteCode, isCreating } = useAdminInviteCodes();

  const [form, setForm] = useState<CreateInviteCodeInput>({
    code: createRandomCode(),
    type: "job_slots",
    value: 1,
    expiresAt: getDefaultExpiry(),
    usageLimit: 50,
  });

  const summary = useMemo(() => {
    const active = inviteCodes.filter((code) => code.status === "active").length;
    const exhausted = inviteCodes.filter((code) => code.status === "exhausted").length;
    const expired = inviteCodes.filter((code) => code.status === "expired").length;

    return {
      total: inviteCodes.length,
      active,
      exhausted,
      expired,
    };
  }, [inviteCodes]);

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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast({
        title: "Code required",
        description: "Enter an invite code before creating it.",
        variant: "destructive",
      });
      return;
    }

    if (!form.expiresAt) {
      toast({
        title: "Expiry required",
        description: "Choose when this invite code expires.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(form.expiresAt).getTime() <= Date.now()) {
      toast({
        title: "Invalid expiry",
        description: "Expiry must be in the future.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createInviteCode({
        ...form,
        code: form.code.trim().toUpperCase(),
        value: Math.max(1, Number(form.value)),
        expiresAt: new Date(form.expiresAt).toISOString(),
        usageLimit: Math.max(1, Number(form.usageLimit)),
      });

      toast({
        title: "Invite code created",
        description: `${form.code.trim().toUpperCase()} is ready to use.`,
      });

      setForm((current) => ({
        ...current,
        code: createRandomCode(),
        expiresAt: getDefaultExpiry(),
      }));
    } catch (createError: any) {
      toast({
        title: "Failed to create invite code",
        description: createError?.message || "Could not create the invite code.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-primary" />
            Invite Codes
          </h1>
          <p className="text-muted-foreground">
            Create recruiter invite codes for job-slot grants or temporary full access.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="card-dashboard">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Codes</p>
              <p className="text-2xl font-semibold mt-2">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="card-dashboard">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold mt-2">{summary.active}</p>
            </CardContent>
          </Card>
          <Card className="card-dashboard">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Exhausted</p>
              <p className="text-2xl font-semibold mt-2">{summary.exhausted}</p>
            </CardContent>
          </Card>
          <Card className="card-dashboard">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-semibold mt-2">{summary.expired}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create Invite Code</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-code"
                      value={form.code}
                      onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                      placeholder="TAWTHEF-LAUNCH"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForm((current) => ({ ...current, code: createRandomCode() }))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Benefit Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm((current) => ({ ...current, type: value as InviteBenefitType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select benefit" />
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">{form.type === "job_slots" ? "Job Slots" : "Access Days"}</Label>
                  <Input
                    id="value"
                    type="number"
                    min={1}
                    value={form.value}
                    onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value || 1) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-at">Expiry Date</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage-limit">Usage Limit</Label>
                  <Input
                    id="usage-limit"
                    type="number"
                    min={1}
                    value={form.usageLimit}
                    onChange={(event) => setForm((current) => ({ ...current, usageLimit: Number(event.target.value || 1) }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Invite Code"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Recruiter Invite Codes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : error ? (
                <div className="py-14 text-center text-sm text-destructive">
                  Failed to load invite codes. Please try again.
                </div>
              ) : inviteCodes.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  No invite codes created yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Benefit</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteCodes.map((inviteCode) => (
                      <TableRow key={inviteCode.id}>
                        <TableCell className="font-medium">{inviteCode.code}</TableCell>
                        <TableCell>{formatInviteBenefit(inviteCode)}</TableCell>
                        <TableCell>{inviteCode.used_count} / {inviteCode.usage_limit}</TableCell>
                        <TableCell>{formatDate(inviteCode.expires_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClass(inviteCode.status)}>
                            {inviteCode.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminInviteCodes;
