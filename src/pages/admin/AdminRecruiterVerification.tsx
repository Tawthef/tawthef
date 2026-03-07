import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CheckCircle2,
  FileCheck2,
  FileText,
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
  ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE,
  AdminRecruiterVerificationItem,
  RecruiterOrganizationType,
  RecruiterVerificationStatus,
  useRecruiterVerification,
} from "@/hooks/useRecruiterVerification";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestDocsDialogOpen, setRequestDocsDialogOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<AdminRecruiterVerificationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [additionalDocsMessage, setAdditionalDocsMessage] = useState("");

  const {
    recruiters,
    pagination,
    isLoading,
    isFetching,
    error,
    approveRecruiter,
    rejectRecruiter,
    requestAdditionalDocuments,
    isApproving,
    isRejecting,
    isRequestingDocuments,
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

  const handleApprove = async (recruiter: AdminRecruiterVerificationItem) => {
    try {
      await approveRecruiter({
        organizationId: recruiter.organization_id,
        recruiterId: recruiter.recruiter_id,
        companyName: recruiter.company_name,
      });
      toast({
        title: "Recruiter approved",
        description: `${recruiter.company_name} has been verified.`,
      });
    } catch (approveError: any) {
      toast({
        title: "Approval failed",
        description: approveError?.message || "Could not approve recruiter.",
        variant: "destructive",
      });
    }
  };

  const openRejectDialog = (recruiter: AdminRecruiterVerificationItem) => {
    setSelectedRecruiter(recruiter);
    setRejectionReason(recruiter.rejection_reason || "");
    setRejectDialogOpen(true);
  };

  const runReject = async () => {
    if (!selectedRecruiter) return;

    try {
      await rejectRecruiter({
        organizationId: selectedRecruiter.organization_id,
        recruiterId: selectedRecruiter.recruiter_id,
        companyName: selectedRecruiter.company_name,
        reason: rejectionReason,
      });
      toast({
        title: "Recruiter rejected",
        description: `${selectedRecruiter.company_name} has been rejected.`,
      });
      setRejectDialogOpen(false);
      setSelectedRecruiter(null);
      setRejectionReason("");
    } catch (rejectError: any) {
      toast({
        title: "Reject failed",
        description: rejectError?.message || "Could not reject recruiter.",
        variant: "destructive",
      });
    }
  };

  const openRequestDocumentsDialog = (recruiter: AdminRecruiterVerificationItem) => {
    setSelectedRecruiter(recruiter);
    setAdditionalDocsMessage("");
    setRequestDocsDialogOpen(true);
  };

  const runRequestAdditionalDocuments = async () => {
    if (!selectedRecruiter) return;

    try {
      await requestAdditionalDocuments({
        recruiterId: selectedRecruiter.recruiter_id,
        companyName: selectedRecruiter.company_name,
        message: additionalDocsMessage,
      });
      toast({
        title: "Request sent",
        description: `Requested additional documents from ${selectedRecruiter.recruiter_name}.`,
      });
      setRequestDocsDialogOpen(false);
      setSelectedRecruiter(null);
      setAdditionalDocsMessage("");
    } catch (requestError: any) {
      toast({
        title: "Request failed",
        description: requestError?.message || "Could not request documents.",
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
            Review recruiter submissions, verify companies, and manage document checks.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck2 className="w-5 h-5" />
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
                  <SelectTrigger className="w-full sm:w-40 h-10">
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
                    <TableHead>Recruiter Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Verification Status</TableHead>
                    <TableHead>Submitted Documents</TableHead>
                    <TableHead>Created Date</TableHead>
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
                      <TableCell className="text-muted-foreground">{recruiter.country || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getStatusClass(recruiter.verification_status)}>
                            {getStatusLabel(recruiter.verification_status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {recruiter.documents.length === 0 ? (
                          <span className="text-muted-foreground text-xs">No documents</span>
                        ) : (
                          <div className="space-y-1">
                            {recruiter.documents.map((document) => (
                              <a
                                key={document.path}
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {document.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(recruiter.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              disabled={recruiter.verification_status === "verified" || isApproving}
                              onClick={() => handleApprove(recruiter)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve Recruiter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={recruiter.verification_status === "rejected" || isRejecting}
                              onClick={() => openRejectDialog(recruiter)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Recruiter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isRequestingDocuments}
                              onClick={() => openRequestDocumentsDialog(recruiter)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Request Additional Documents
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setSelectedRecruiter(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Recruiter</DialogTitle>
            <DialogDescription>
              Add an optional rejection reason for {selectedRecruiter?.company_name || "this recruiter"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Reason (optional)"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={runReject} disabled={isRejecting}>
                {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={requestDocsDialogOpen}
        onOpenChange={(open) => {
          setRequestDocsDialogOpen(open);
          if (!open) {
            setSelectedRecruiter(null);
            setAdditionalDocsMessage("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Documents</DialogTitle>
            <DialogDescription>
              Send a request to {selectedRecruiter?.recruiter_name || "this recruiter"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={additionalDocsMessage}
              onChange={(event) => setAdditionalDocsMessage(event.target.value)}
              placeholder="Message (optional)"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRequestDocsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={runRequestAdditionalDocuments} disabled={isRequestingDocuments}>
                {isRequestingDocuments ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminRecruiterVerification;
