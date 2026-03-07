import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60000;

export interface GeneralSettings {
  platform_name: string;
  support_email: string;
  default_currency: string;
}

export interface JobSettings {
  default_job_expiry_days: number;
  max_jobs_per_plan: number;
  job_auto_archive_days: number;
}

export interface PlatformConfiguration {
  maintenance_mode: boolean;
  enable_notifications: boolean;
  enable_ai_features: boolean;
}

export type EmailTemplateKey =
  | "welcome_email"
  | "application_submitted"
  | "interview_scheduled"
  | "offer_sent"
  | "password_reset";

export interface EmailTemplate {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  body: string;
}

export interface PlatformSettingsState {
  general: GeneralSettings;
  jobs: JobSettings;
  config: PlatformConfiguration;
  emailTemplates: Record<EmailTemplateKey, EmailTemplate>;
}

const DEFAULT_SETTINGS: PlatformSettingsState = {
  general: {
    platform_name: "Tawtheef",
    support_email: "support@example.com",
    default_currency: "USD",
  },
  jobs: {
    default_job_expiry_days: 30,
    max_jobs_per_plan: 10,
    job_auto_archive_days: 7,
  },
  config: {
    maintenance_mode: false,
    enable_notifications: true,
    enable_ai_features: true,
  },
  emailTemplates: {
    welcome_email: {
      key: "welcome_email",
      name: "Welcome Email",
      subject: "Welcome to the platform",
      body: "Hi {{name}}, welcome to our platform.",
    },
    application_submitted: {
      key: "application_submitted",
      name: "Application Submitted",
      subject: "Your application has been submitted",
      body: "Hi {{name}}, your application for {{job_title}} has been submitted.",
    },
    interview_scheduled: {
      key: "interview_scheduled",
      name: "Interview Scheduled",
      subject: "Your interview is scheduled",
      body: "Hi {{name}}, your interview for {{job_title}} is scheduled on {{date}}.",
    },
    offer_sent: {
      key: "offer_sent",
      name: "Offer Sent",
      subject: "You received an offer",
      body: "Hi {{name}}, an offer has been sent for {{job_title}}.",
    },
    password_reset: {
      key: "password_reset",
      name: "Password Reset",
      subject: "Reset your password",
      body: "Hi {{name}}, use the link below to reset your password.",
    },
  },
};

const getDefaultEmailTemplates = (): PlatformSettingsState["emailTemplates"] => ({
  welcome_email: { ...DEFAULT_SETTINGS.emailTemplates.welcome_email },
  application_submitted: { ...DEFAULT_SETTINGS.emailTemplates.application_submitted },
  interview_scheduled: { ...DEFAULT_SETTINGS.emailTemplates.interview_scheduled },
  offer_sent: { ...DEFAULT_SETTINGS.emailTemplates.offer_sent },
  password_reset: { ...DEFAULT_SETTINGS.emailTemplates.password_reset },
});

const getDefaultSettingsState = (): PlatformSettingsState => ({
  general: { ...DEFAULT_SETTINGS.general },
  jobs: { ...DEFAULT_SETTINGS.jobs },
  config: { ...DEFAULT_SETTINGS.config },
  emailTemplates: getDefaultEmailTemplates(),
});

const SETTING_KEYS = [
  "platform_name",
  "support_email",
  "default_currency",
  "default_job_expiry_days",
  "max_jobs_per_plan",
  "job_auto_archive_days",
  "maintenance_mode",
  "enable_notifications",
  "enable_ai_features",
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

const templateNameByKey: Record<EmailTemplateKey, string> = {
  welcome_email: "Welcome Email",
  application_submitted: "Application Submitted",
  interview_scheduled: "Interview Scheduled",
  offer_sent: "Offer Sent",
  password_reset: "Password Reset",
};

const normalizeTemplateKey = (value: string | null | undefined): EmailTemplateKey | null => {
  const normalized = (value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return null;
  if (normalized.includes("welcome")) return "welcome_email";
  if (normalized.includes("application")) return "application_submitted";
  if (normalized.includes("interview")) return "interview_scheduled";
  if (normalized.includes("offer")) return "offer_sent";
  if (normalized.includes("password")) return "password_reset";
  return null;
};

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  if (typeof value === "number") return value > 0;
  return fallback;
};

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseString = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return `${value}`;
  return fallback;
};

const parseKeyValue = (value: unknown) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return value;
};

const readSettingsFromRows = (rows: any[]) => {
  const next = getDefaultSettingsState();
  if (rows.length === 0) return next;

  const first = rows[0] || {};

  const hasKeyValueShape = rows.some((row) => typeof row?.key === "string");
  if (hasKeyValueShape) {
    const values = new Map<string, unknown>();
    rows.forEach((row) => {
      if (!row?.key) return;
      values.set(row.key, parseKeyValue(row.value));
    });

    next.general.platform_name = parseString(values.get("platform_name"), next.general.platform_name);
    next.general.support_email = parseString(values.get("support_email"), next.general.support_email);
    next.general.default_currency = parseString(values.get("default_currency"), next.general.default_currency);

    next.jobs.default_job_expiry_days = parseNumber(values.get("default_job_expiry_days"), next.jobs.default_job_expiry_days);
    next.jobs.max_jobs_per_plan = parseNumber(values.get("max_jobs_per_plan"), next.jobs.max_jobs_per_plan);
    next.jobs.job_auto_archive_days = parseNumber(values.get("job_auto_archive_days"), next.jobs.job_auto_archive_days);

    next.config.maintenance_mode = parseBoolean(values.get("maintenance_mode"), next.config.maintenance_mode);
    next.config.enable_notifications = parseBoolean(values.get("enable_notifications"), next.config.enable_notifications);
    next.config.enable_ai_features = parseBoolean(values.get("enable_ai_features"), next.config.enable_ai_features);

    return next;
  }

  next.general.platform_name = parseString(first.platform_name, next.general.platform_name);
  next.general.support_email = parseString(first.support_email, next.general.support_email);
  next.general.default_currency = parseString(first.default_currency, next.general.default_currency);

  next.jobs.default_job_expiry_days = parseNumber(first.default_job_expiry_days, next.jobs.default_job_expiry_days);
  next.jobs.max_jobs_per_plan = parseNumber(first.max_jobs_per_plan, next.jobs.max_jobs_per_plan);
  next.jobs.job_auto_archive_days = parseNumber(first.job_auto_archive_days, next.jobs.job_auto_archive_days);

  next.config.maintenance_mode = parseBoolean(first.maintenance_mode, next.config.maintenance_mode);
  next.config.enable_notifications = parseBoolean(first.enable_notifications, next.config.enable_notifications);
  next.config.enable_ai_features = parseBoolean(first.enable_ai_features, next.config.enable_ai_features);

  return next;
};

const readTemplatesFromRows = (rows: any[]) => {
  const next = getDefaultEmailTemplates();

  rows.forEach((row) => {
    const key = normalizeTemplateKey(row?.template_key || row?.key || row?.name || row?.slug || row?.type);
    if (!key) return;

    next[key] = {
      key,
      name: templateNameByKey[key],
      subject: parseString(row?.subject, next[key].subject),
      body: parseString(row?.body || row?.content || row?.template, next[key].body),
    };
  });

  return next;
};

const fetchPlatformSettingsRows = async () => {
  const { data, error } = await supabase.from("platform_settings").select("*").limit(200);
  if (error) return [];
  return data || [];
};

const fetchEmailTemplateRows = async () => {
  const { data, error } = await supabase.from("email_templates").select("*").limit(200);
  if (error) return [];
  return data || [];
};

export async function getPlatformSettings(): Promise<PlatformSettingsState> {
  const [settingsRows, templateRows] = await Promise.all([fetchPlatformSettingsRows(), fetchEmailTemplateRows()]);

  const settings = readSettingsFromRows(settingsRows);
  settings.emailTemplates = readTemplatesFromRows(templateRows);
  return settings;
}

const updatePlatformSettingsKeyValue = async (updates: Partial<Record<SettingKey, unknown>>) => {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const response = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
  if (!response.error) return;

  const firstRow = await supabase.from("platform_settings").select("id").limit(1).maybeSingle();
  if (!firstRow.error && firstRow.data?.id) {
    const update = await supabase.from("platform_settings").update(updates).eq("id", firstRow.data.id);
    if (!update.error) return;
  }

  const fallback = await supabase.from("platform_settings").insert(updates);
  if (fallback.error) throw fallback.error;
};

export async function saveGeneralSettings(values: GeneralSettings) {
  await updatePlatformSettingsKeyValue({
    platform_name: values.platform_name,
    support_email: values.support_email,
    default_currency: values.default_currency,
  });
}

export async function saveJobSettings(values: JobSettings) {
  await updatePlatformSettingsKeyValue({
    default_job_expiry_days: values.default_job_expiry_days,
    max_jobs_per_plan: values.max_jobs_per_plan,
    job_auto_archive_days: values.job_auto_archive_days,
  });
}

export async function savePlatformConfiguration(values: PlatformConfiguration) {
  await updatePlatformSettingsKeyValue({
    maintenance_mode: values.maintenance_mode,
    enable_notifications: values.enable_notifications,
    enable_ai_features: values.enable_ai_features,
  });
}

export async function saveEmailTemplate(params: { key: EmailTemplateKey; subject: string; body: string }) {
  const payload = {
    template_key: params.key,
    name: templateNameByKey[params.key],
    subject: params.subject,
    body: params.body,
    updated_at: new Date().toISOString(),
  };

  let response = await supabase.from("email_templates").upsert(payload, { onConflict: "template_key" });
  if (!response.error) return;

  response = await supabase
    .from("email_templates")
    .upsert(
      {
        key: params.key,
        name: templateNameByKey[params.key],
        subject: params.subject,
        body: params.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (!response.error) return;

  const existing = await supabase
    .from("email_templates")
    .select("id")
    .or(`template_key.eq.${params.key},key.eq.${params.key}`)
    .limit(1)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    const update = await supabase
      .from("email_templates")
      .update({
        subject: params.subject,
        body: params.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id);

    if (!update.error) return;
  }

  const fallback = await supabase.from("email_templates").insert(payload);
  if (fallback.error) throw fallback.error;
}

export function usePlatformSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["platform-settings", user?.id],
    queryFn: getPlatformSettings,
    enabled: !!user?.id,
    staleTime: STALE_TIME,
  });

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
  };

  const saveGeneralMutation = useMutation({
    mutationFn: saveGeneralSettings,
    onSuccess: invalidateSettings,
  });

  const saveJobsMutation = useMutation({
    mutationFn: saveJobSettings,
    onSuccess: invalidateSettings,
  });

  const saveConfigMutation = useMutation({
    mutationFn: savePlatformConfiguration,
    onSuccess: invalidateSettings,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: saveEmailTemplate,
    onSuccess: invalidateSettings,
  });

  return {
    settings: settingsQuery.data || DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    isFetching: settingsQuery.isFetching,
    error: settingsQuery.error,
    refetch: settingsQuery.refetch,
    saveGeneralSettings: saveGeneralMutation.mutateAsync,
    saveJobSettings: saveJobsMutation.mutateAsync,
    savePlatformConfiguration: saveConfigMutation.mutateAsync,
    saveEmailTemplate: saveTemplateMutation.mutateAsync,
    isSavingGeneral: saveGeneralMutation.isPending,
    isSavingJobs: saveJobsMutation.isPending,
    isSavingConfig: saveConfigMutation.isPending,
    isSavingTemplate: saveTemplateMutation.isPending,
  };
}
