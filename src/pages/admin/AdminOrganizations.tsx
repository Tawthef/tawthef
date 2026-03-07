import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_ORGANIZATIONS_PAGE_SIZE,
  AdminOrganization,
  OrganizationType,
  OrganizationUser,
  VerificationStatus,
  useAdminOrganizations,
} from "@/hooks/useAdminOrganizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_FILTER_OPTIONS: Array<{ label: string; value: "all" | OrganizationType }> = [
  { label: "All Recruiters", value: "all" },
  { label: "Employers", value: "employer" },
  { label: "Recruitment Agencies", value: "agency" },
];

const VERIFICATION_FILTER_OPTIONS: Array<{ label: string; value: "all" | "verified" | "pending" }> = [
  { label: "All", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Pending", value: "pending" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getTypeLabel = (type: OrganizationType) => (type === "agency" ? "Agency" : "Employer");
const getTypeCategoryLabel = (type: OrganizationType) => (type === "agency" ? "Recruitment Agency" : "Employer");

const getVerificationLabel = (status: VerificationStatus) => {
  if (status === "verified") return "Verified Recruiter";
  if (status === "rejected") return "Rejected";
  return "Pending";
};

const getVerificationClass = (status: VerificationStatus) => {
  if (status === "verified") return "bg-success/10 text-success border-success/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const AdminOrganizations = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | OrganizationType>("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "pending">("all");

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<AdminOrganization | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);

  const {
    organizations,
    pagination,
    isLoading,
    isFetching,
    error,
    verifyOrganization,
    rejectOrganization,
    getOrganizationUsers,
    isVerifying,
    isRejecting,
    isLoadingOrganizationUsers,
  } = useAdminOrganizations({
    page,
    limit: ADMIN_ORGANIZATIONS_PAGE_SIZE,
    search,
    organizationType: typeFilter,
    verificationStatus: verificationFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, verificationFilter]);

  const totalLabel = useMemo(() => pagination.total.toLocaleString("en-US"), [pagination.total]);

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

  const handleVerify = async (organization: AdminOrganization) => {
    try {
      await verifyOrganization({ organizationId: organization.id });
      toast({
        title: "Recruiter verified",
        description: `${organization.name} is now verified as a recruiter.`,
      });
    } catch (mutationError: any) {
      toast({
        title: "Verification failed",
        description: mutationError?.message || "Could not verify recruiter.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (organization: AdminOrganization) => {
    try {
      await rejectOrganization({ organizationId: organization.id });
      toast({
        title: "Recruiter rejected",
        description: `${organization.name} has been marked as rejected.`,
      });
    } catch (mutationError: any) {
      toast({
        title: "Reject failed",
        description: mutationError?.message || "Could not reject recruiter.",
        variant: "destructive",
      });
    }
  };

  const openDetails = async (organization: AdminOrganization) => {
    setSelectedOrganization(organization);
    setOrganizationUsers([]);
    setIsDetailsOpen(true);

    try {
      const users = await getOrganizationUsers({ organizationId: organization.id });
      setOrganizationUsers(users);
    } catch (detailsError: any) {
      setOrganizationUsers([]);
      toast({
        title: "Failed to load recruiter team",
        description: detailsError?.message || "Could not fetch users for this recruiter.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Recruiters Management
          </h1>
          <p className="text-muted-foreground">
            Manage employers and recruitment agencies across the platform.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Recruiters ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company name or country..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | OrganizationType)}>
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={verificationFilter}
                  onValueChange={(value) => setVerificationFilter(value as "all" | "verified" | "pending")}
                >
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="py-14 text-center text-destructive text-sm">
                Failed to load recruiters. Please try again.
              </div>
            ) : organizations.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No recruiters found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-3 px-6 font-medium">Company Name</th>
                      <th className="text-left py-3 px-4 font-medium">Recruiter Type</th>
                      <th className="text-left py-3 px-4 font-medium">Country</th>
                      <th className="text-left py-3 px-4 font-medium">Verification Status</th>
                      <th className="text-left py-3 px-4 font-medium">Number of Users</th>
                      <th className="text-left py-3 px-4 font-medium">Active Job Postings</th>
                      <th className="text-left py-3 px-4 font-medium">Created Date</th>
                      <th className="text-right py-3 px-6 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((organization) => (
                      <tr
                        key={organization.id}
                        className="border-b border-border/10 hover:bg-muted/5 transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-foreground">{organization.name}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline">{getTypeLabel(organization.type)}</Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{organization.country || "-"}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getVerificationClass(organization.verification_status)}>
                            {getVerificationLabel(organization.verification_status)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{organization.users_count}</td>
                        <td className="py-4 px-4 text-muted-foreground">{organization.active_jobs_count}</td>
                        <td className="py-4 px-4 text-muted-foreground text-xs">
                          {formatDate(organization.created_at)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openDetails(organization)}>
                                <Building2 className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={organization.verification_status === "verified" || isVerifying}
                                onClick={() => handleVerify(organization)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Verify Recruiter
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={organization.verification_status === "rejected" || isRejecting}
                                onClick={() => handleReject(organization)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Recruiter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/20">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
                {isFetching ? " - Updating..." : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage || isFetching}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setSelectedOrganization(null);
            setOrganizationUsers([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recruiter Details</DialogTitle>
            <DialogDescription>
              Overview and users for {selectedOrganization?.name || "selected recruiter"}.
            </DialogDescription>
          </DialogHeader>

          {selectedOrganization ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Company Name</p>
                    <p className="text-sm font-semibold mt-2">{selectedOrganization.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Recruiter Type</p>
                    <p className="text-sm font-semibold mt-2">{getTypeCategoryLabel(selectedOrganization.type)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Country</p>
                    <p className="text-sm font-semibold mt-2">{selectedOrganization.country || "-"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Verification Status</p>
                    <p className="text-sm font-semibold mt-2">{getVerificationLabel(selectedOrganization.verification_status)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Number of Users</p>
                    <p className="text-lg font-bold mt-2">{selectedOrganization.users_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Active Jobs</p>
                    <p className="text-lg font-bold mt-2">{selectedOrganization.active_jobs_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Total Jobs Posted</p>
                    <p className="text-lg font-bold mt-2">{selectedOrganization.total_jobs_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">Created Date</p>
                    <p className="text-sm font-semibold mt-2">{formatDate(selectedOrganization.created_at)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="card-dashboard">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recruiter Team</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingOrganizationUsers ? (
                    <div className="py-10 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : organizationUsers.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      No users found for this recruiter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/20">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {organizationUsers.map((user) => (
                            <tr key={user.id} className="border-b border-border/10">
                              <td className="py-3 px-4 font-medium">{user.full_name || "Unknown User"}</td>
                              <td className="py-3 px-4 text-muted-foreground">{user.role || "unknown"}</td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant="outline"
                                  className={
                                    user.status === "suspended"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-success/10 text-success border-success/20"
                                  }
                                >
                                  {user.status === "suspended" ? "Suspended" : "Active"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(user.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminOrganizations;
