import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CalendarClock,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Receipt,
  Search,
  Shield,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_BILLING_PAGE_SIZE,
  AdminBillingItem,
  PaymentStatus,
  useAdminBilling,
} from "@/hooks/useAdminBilling";
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

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: "all" | PaymentStatus }> = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "-";

const formatMoney = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);

const getStatusClass = (status: PaymentStatus) => {
  if (status === "paid") return "bg-success/10 text-success border-success/20";
  if (status === "failed") return "bg-destructive/10 text-destructive border-destructive/20";
  if (status === "refunded") return "bg-accent/10 text-accent border-accent/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const AdminBilling = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AdminBillingItem | null>(null);

  const {
    records,
    summary,
    pagination,
    isLoading,
    isFetching,
    error,
    refundPayment,
    cancelSubscription,
    isRefunding,
    isCancelling,
  } = useAdminBilling({
    page,
    limit: ADMIN_BILLING_PAGE_SIZE,
    search,
    paymentStatus: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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

  const openInvoice = (record: AdminBillingItem) => {
    setSelectedRecord(record);
    setInvoiceDialogOpen(true);
  };

  const runDownloadInvoice = (record: AdminBillingItem) => {
    if (!record.invoice_url) {
      toast({
        title: "Invoice unavailable",
        description: "No downloadable invoice URL was found for this record.",
        variant: "destructive",
      });
      return;
    }

    window.open(record.invoice_url, "_blank", "noopener,noreferrer");
  };

  const runRefund = async (record: AdminBillingItem) => {
    try {
      await refundPayment({
        paymentId: record.payment_id,
        subscriptionId: record.subscription_id,
      });
      toast({
        title: "Payment refunded",
        description: `Invoice ${record.invoice_id} has been marked as refunded.`,
      });
    } catch (refundError: any) {
      toast({
        title: "Refund failed",
        description: refundError?.message || "Could not refund payment.",
        variant: "destructive",
      });
    }
  };

  const runCancelSubscription = async (record: AdminBillingItem) => {
    try {
      await cancelSubscription({ subscriptionId: record.subscription_id });
      toast({
        title: "Subscription cancelled",
        description: `${record.company} subscription has been cancelled.`,
      });
    } catch (cancelError: any) {
      toast({
        title: "Cancel failed",
        description: cancelError?.message || "Could not cancel subscription.",
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
            Payment & Billing
          </h1>
          <p className="text-muted-foreground">
            Monitor revenue, subscription billing, and invoice activity.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold mt-2">{formatMoney(summary.totalRevenue)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold mt-2">{formatMoney(summary.monthlyRevenue)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold mt-2">{summary.activeSubscriptions}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Failed Payments</p>
                  <p className="text-2xl font-bold mt-2">{summary.failedPayments}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Billing Records ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company, plan, or invoice..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | PaymentStatus)}>
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
                Failed to load billing records.
              </div>
            ) : records.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No billing records found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.company}</TableCell>
                      <TableCell>{record.plan}</TableCell>
                      <TableCell>{formatMoney(record.amount, record.currency)}</TableCell>
                      <TableCell className="capitalize">{record.billing_cycle.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClass(record.payment_status)}>
                          {record.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.invoice_id}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(record.payment_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => openInvoice(record)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runDownloadInvoice(record)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={record.payment_status === "refunded" || isRefunding}
                              onClick={() => runRefund(record)}
                            >
                              Refund Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!record.subscription_id || isCancelling}
                              onClick={() => runCancelSubscription(record)}
                            >
                              Cancel Subscription
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
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open);
          if (!open) {
            setSelectedRecord(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedRecord?.company || "Selected company"} - {selectedRecord?.plan || "Plan"}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invoice ID</span>
                <span className="font-medium">{selectedRecord.invoice_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatMoney(selectedRecord.amount, selectedRecord.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={getStatusClass(selectedRecord.payment_status)}>
                  {selectedRecord.payment_status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-medium">{formatDate(selectedRecord.payment_date)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => runDownloadInvoice(selectedRecord)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminBilling;
