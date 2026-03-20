import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60000;
export const ADMIN_BILLING_PAGE_SIZE = 20;

export type BillingCycle = "monthly" | "quarterly" | "yearly" | "one_time";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

export interface AdminBillingItem {
  id: string;
  subscription_id: string | null;
  payment_id: string | null;
  company: string;
  plan: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  payment_status: PaymentStatus;
  invoice_id: string;
  invoice_url: string | null;
  payment_date: string | null;
}

export interface AdminBillingSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  failedPayments: number;
}

export interface AdminBillingFilters {
  page: number;
  limit?: number;
  search?: string;
  paymentStatus?: "all" | PaymentStatus;
}

export interface AdminBillingResult {
  records: AdminBillingItem[];
  summary: AdminBillingSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface SubscriptionRow {
  id: string;
  organization_id: string | null;
  plan_id?: string | null;
  plan_type?: string | null;
  billing_cycle?: string | null;
  billing_status?: string | null;
  status?: string | null;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  stripe_subscription_id?: string | null;
  is_active?: boolean | null;
  organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
  plans?: { name?: string | null; price?: number | string | null; currency?: string | null } | Array<{ name?: string | null; price?: number | string | null; currency?: string | null }> | null;
}

interface PaymentRow {
  id: string;
  subscription_id?: string | null;
  organization_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  invoice_pdf_url?: string | null;
  billing_cycle?: string | null;
  paid_at?: string | null;
  payment_date?: string | null;
  created_at?: string | null;
}

const getFromRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
};

const normalizeBillingCycle = (
  value: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
): BillingCycle => {
  if (value === "monthly" || value === "quarterly" || value === "yearly" || value === "one_time") return value;

  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (days <= 45) return "monthly";
      if (days <= 120) return "quarterly";
      return "yearly";
    }
  }

  return "monthly";
};

const normalizePaymentStatus = (value: string | null | undefined): PaymentStatus => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "paid" || normalized === "failed" || normalized === "refunded") return normalized;
  return "pending";
};

const normalizeAmount = (value: number | string | null | undefined) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return 0;
  return Number(amount);
};

const normalizeCurrency = (value: string | null | undefined) => (value?.trim().toUpperCase() || "USD");

const getPlanName = (row: SubscriptionRow) => {
  const plan = getFromRelation(row.plans);
  if (plan?.name) return plan.name;

  if (row.plan_type === "job_slot_basic") return "Single Job Slot";
  if (row.plan_type === "job_slot_pro") return "10 Job Slots";
  if (row.plan_type === "job_slot_invite") return "Invite Job Slots";
  if (row.plan_type === "full_access") return "Full Access Invite";
  if (row.plan_type === "resume_search") return "Resume Search Access";
  return "Unknown Plan";
};

const getSearchMatchedOrgIds = async (search: string) => {
  if (!search.trim()) return [];
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", `%${search.replace(/[%_,]/g, "").trim()}%`)
    .limit(500);

  if (error || !Array.isArray(data)) return [];
  return data.map((row: any) => row.id).filter(Boolean);
};

const buildSubscriptionsQuery = async (filters: AdminBillingFilters, includeOptionalFields: boolean) => {
  const search = (filters.search || "").trim();
  const matchedOrgIds = await getSearchMatchedOrgIds(search);

  const fields = includeOptionalFields
    ? "id, organization_id, plan_id, plan_type, billing_cycle, billing_status, status, is_active, created_at, start_date, end_date, stripe_subscription_id, organizations(name), plans(name, price, currency)"
    : "id, organization_id, plan_type, status, created_at, start_date, end_date, organizations(name), plans(name, price, currency)";

  let query = supabase.from("subscriptions").select(fields);

  if (search) {
    if (matchedOrgIds.length > 0) {
      query = query.in("organization_id", matchedOrgIds);
    } else {
      query = query.eq("organization_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  return query.order("created_at", { ascending: false }).limit(5000);
};

const fetchSubscriptions = async (filters: AdminBillingFilters) => {
  let response = await buildSubscriptionsQuery(filters, true);
  if (response.error) {
    response = await buildSubscriptionsQuery(filters, false);
  }
  if (response.error) throw response.error;
  return (response.data || []) as SubscriptionRow[];
};

const fetchPayments = async () => {
  const withOptional = await supabase
    .from("payments")
    .select("id, subscription_id, organization_id, amount, currency, status, payment_status, invoice_id, invoice_number, invoice_url, invoice_pdf_url, billing_cycle, paid_at, payment_date, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (!withOptional.error) {
    return { rows: (withOptional.data || []) as PaymentRow[], tableAvailable: true };
  }

  const fallback = await supabase
    .from("payments")
    .select("id, subscription_id, amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (!fallback.error) {
    return { rows: (fallback.data || []) as PaymentRow[], tableAvailable: true };
  }

  return { rows: [] as PaymentRow[], tableAvailable: false };
};

const mapFromPayments = (
  payments: PaymentRow[],
  subscriptionsById: Map<string, SubscriptionRow>,
  filters: AdminBillingFilters,
) => {
  const normalizedSearch = (filters.search || "").trim().toLowerCase();
  const statusFilter = filters.paymentStatus || "all";

  const records = payments
    .map((payment) => {
      const subscription = payment.subscription_id ? subscriptionsById.get(payment.subscription_id) : undefined;
      const org = getFromRelation(subscription?.organizations);
      const plan = getFromRelation(subscription?.plans);
      const company = org?.name || "Unknown Company";

      const status = normalizePaymentStatus(payment.payment_status || payment.status || subscription?.billing_status || subscription?.status);
      const billingCycle = normalizeBillingCycle(
        payment.billing_cycle || subscription?.billing_cycle,
        subscription?.start_date,
        subscription?.end_date,
      );
      const amount = normalizeAmount(payment.amount ?? plan?.price);
      const currency = normalizeCurrency(payment.currency || plan?.currency);

      const record: AdminBillingItem = {
        id: payment.id,
        subscription_id: payment.subscription_id || null,
        payment_id: payment.id,
        company,
        plan: subscription ? getPlanName(subscription) : "Unknown Plan",
        amount,
        currency,
        billing_cycle: billingCycle,
        payment_status: status,
        invoice_id: payment.invoice_id || payment.invoice_number || payment.id,
        invoice_url: payment.invoice_pdf_url || payment.invoice_url || null,
        payment_date: payment.paid_at || payment.payment_date || payment.created_at || null,
      };

      return record;
    })
    .filter((record) => {
      if (statusFilter !== "all" && record.payment_status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      return `${record.company} ${record.plan} ${record.invoice_id}`.toLowerCase().includes(normalizedSearch);
    });

  return records;
};

const mapFromSubscriptions = (subscriptions: SubscriptionRow[], filters: AdminBillingFilters) => {
  const normalizedSearch = (filters.search || "").trim().toLowerCase();
  const statusFilter = filters.paymentStatus || "all";

  return subscriptions
    .map((subscription) => {
      const org = getFromRelation(subscription.organizations);
      const plan = getFromRelation(subscription.plans);

      const status = normalizePaymentStatus(subscription.billing_status || subscription.status);
      const record: AdminBillingItem = {
        id: subscription.id,
        subscription_id: subscription.id,
        payment_id: null,
        company: org?.name || "Unknown Company",
        plan: getPlanName(subscription),
        amount: normalizeAmount(plan?.price),
        currency: normalizeCurrency(plan?.currency),
        billing_cycle: normalizeBillingCycle(subscription.billing_cycle, subscription.start_date, subscription.end_date),
        payment_status: status,
        invoice_id: subscription.stripe_subscription_id || subscription.id,
        invoice_url: null,
        payment_date: subscription.created_at || null,
      };

      return record;
    })
    .filter((record) => {
      if (statusFilter !== "all" && record.payment_status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      return `${record.company} ${record.plan} ${record.invoice_id}`.toLowerCase().includes(normalizedSearch);
    });
};

const computeSummary = (records: AdminBillingItem[], subscriptions: SubscriptionRow[]): AdminBillingSummary => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let failedPayments = 0;

  records.forEach((record) => {
    if (record.payment_status === "paid") {
      totalRevenue += record.amount;

      if (record.payment_date) {
        const paidDate = new Date(record.payment_date);
        if (paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear) {
          monthlyRevenue += record.amount;
        }
      }
    }

    if (record.payment_status === "failed") {
      failedPayments += 1;
    }
  });

  const activeSubscriptions = subscriptions.filter((subscription) => {
    const normalized = (subscription.status || "").toLowerCase();
    if (normalized === "active") return true;
    return subscription.is_active === true;
  }).length;

  return {
    totalRevenue,
    monthlyRevenue,
    activeSubscriptions,
    failedPayments,
  };
};

export async function getAdminBilling(filters: AdminBillingFilters): Promise<AdminBillingResult> {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_BILLING_PAGE_SIZE);

  const [subscriptions, paymentsResult] = await Promise.all([fetchSubscriptions(filters), fetchPayments()]);
  const subscriptionsById = new Map<string, SubscriptionRow>(subscriptions.map((row) => [row.id, row]));

  const allRecords = paymentsResult.tableAvailable
    ? mapFromPayments(paymentsResult.rows, subscriptionsById, filters)
    : mapFromSubscriptions(subscriptions, filters);

  const total = allRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const records = allRecords.slice(offset, offset + limit);

  return {
    records,
    summary: computeSummary(allRecords, subscriptions),
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

export async function refundPayment(params: { paymentId: string | null; subscriptionId: string | null }) {
  if (params.paymentId) {
    let response = await supabase
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", params.paymentId);

    if (!response.error) return;

    response = await supabase
      .from("payments")
      .update({ payment_status: "refunded" })
      .eq("id", params.paymentId);

    if (!response.error) return;
  }

  if (params.subscriptionId) {
    const fallback = await supabase
      .from("subscriptions")
      .update({ billing_status: "refunded" })
      .eq("id", params.subscriptionId);

    if (fallback.error) throw fallback.error;
    return;
  }

  throw new Error("No payment or subscription target found.");
}

export async function cancelBillingSubscription(subscriptionId: string | null) {
  if (!subscriptionId) throw new Error("Subscription id is required.");

  let response = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", is_active: false })
    .eq("id", subscriptionId);

  if (!response.error) return;

  response = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId);

  if (response.error) throw response.error;
}

export function useAdminBilling(filters: AdminBillingFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const billingQuery = useQuery({
    queryKey: [
      "admin-billing",
      user?.id,
      filters.page,
      filters.limit || ADMIN_BILLING_PAGE_SIZE,
      filters.search || "",
      filters.paymentStatus || "all",
    ],
    queryFn: () => getAdminBilling(filters),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });

  const refundMutation = useMutation({
    mutationFn: refundPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ subscriptionId }: { subscriptionId: string | null }) => cancelBillingSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-v2"] });
    },
  });

  return {
    records: billingQuery.data?.records || [],
    summary: billingQuery.data?.summary || {
      totalRevenue: 0,
      monthlyRevenue: 0,
      activeSubscriptions: 0,
      failedPayments: 0,
    },
    pagination: billingQuery.data || {
      records: [],
      summary: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        activeSubscriptions: 0,
        failedPayments: 0,
      },
      total: 0,
      page: filters.page,
      limit: filters.limit || ADMIN_BILLING_PAGE_SIZE,
      totalPages: 1,
      hasNextPage: false,
    },
    isLoading: billingQuery.isLoading,
    isFetching: billingQuery.isFetching,
    error: billingQuery.error,
    refetch: billingQuery.refetch,
    refundPayment: refundMutation.mutateAsync,
    cancelSubscription: cancelMutation.mutateAsync,
    isRefunding: refundMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
