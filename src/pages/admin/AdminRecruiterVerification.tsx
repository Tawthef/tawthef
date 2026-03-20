import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, FileText, Loader2, Search, Shield, XCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE,
  RecruiterOrganizationType,
  RecruiterVerificationStatus,
  useRecruiterVerification,
} from "@/hooks/useRecruiterVerification";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: "all" | RecruiterVerificationStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

const ORG_TYPE_FILTER_OPTIONS: Array<{ label: string; value: "all" | RecruiterOrganizationType }> = [
  { label: "All Recruiters", value: "all" },
  { label: "Employers", value: "employer" },
  { label: "Recruitment Agencies", value: "agency" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getStatusClass = (status: RecruiterVerificationStatus) => {
  if (status === "verified") return "bg-success/10 text-success border-success/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const getStatusLabel = (status: RecruiterVerificationStatus) => {
  if (status === "verified") return "Verified Recruiter";
  if (status === "rejected") return "Rejected";
  return "Pending";
};

const AdminRecruiterVerification = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecruiterVerificationStatus>("all");
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState<"all" | RecruiterOrganizationType>("all");

  const {
    recruiters,
    pagination,
    isLoading,
    isFetching,
    error,
    approveRecruiter,
    rejectRecruiter,
    isApproving,
    isRejecting,
  } = useRecruiterVerification({
    page,
    limit: ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE,
    search,
    status: statusFilter,
    organizationType: organizationTypeFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, organizationTypeFilter]);

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

  const handleApprove = async (recruiterId: string, companyName: string) => {
    try {
      await approveRecruiter({ recruiterId });
      toast({
        title: "Recruiter approved",
        description: `${companyName} has been verified.`,
      });
    } catch (approveError: any) {
      toast({
        title: "Approval failed",
        description: approveError?.message || "Could not approve recruiter.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (recruiterId: string, companyName: string) => {
    try {
      await rejectRecruiter({ recruiterId });
      toast({
        title: "Recruiter rejected",
        description: `${companyName} has been rejected.`,
      });
    } catch (rejectError: any) {
      toast({
        title: "Rejection failed",
        description: rejectError?.message || "Could not reject recruiter.",
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
            Recruiter Verification
          </h1>
          <p className="text-muted-foreground">
            Review recruiter documents and approve or reject account verification.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg">
                Recruiters ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by recruiter or company..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select
                  value={organizationTypeFilter}
                  onValueChange={(value) => setOrganizationTypeFilter(value as "all" | RecruiterOrganizationType)}
                >
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "all" | RecruiterVerificationStatus)}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((option) => (
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
                Failed to load recruiter verification records.
              </div>
            ) : recruiters.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No recruiters found for the selected filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Recruiter Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruiters.map((recruiter) => (
                    <TableRow key={recruiter.recruiter_id}>
                      <TableCell className="font-medium">{recruiter.company_name}</TableCell>
                      <TableCell>{recruiter.recruiter_name}</TableCell>
                      <TableCell className="text-muted-foreground">{recruiter.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {recruiter.organization_type === "agency" ? "Agency" : "Employer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(recruiter.verification_status)}>
                          {getStatusLabel(recruiter.verification_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {recruiter.documents.length === 0 ? (
                          <span className="text-muted-foreground text-xs">No documents</span>
                        ) : (
                          <div className="space-y-1">
                            {recruiter.documents.map((document) => (
                              <a
                                key={document.url}
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {document.fileName}
                              </a>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(recruiter.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={recruiter.verification_status === "verified" || isApproving}
                            onClick={() => handleApprove(recruiter.recruiter_id, recruiter.company_name)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={recruiter.verification_status === "rejected" || isRejecting}
                            onClick={() => handleReject(recruiter.recruiter_id, recruiter.company_name)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
    </DashboardLayout>
  );
};

export default AdminRecruiterVerification;
