import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Save, Settings2, Shield } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  EmailTemplateKey,
  GeneralSettings,
  JobSettings,
  PlatformConfiguration,
  usePlatformSettings,
} from "@/hooks/usePlatformSettings";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "SAR", "AED"];

const TEMPLATE_OPTIONS: Array<{ key: EmailTemplateKey; label: string }> = [
  { key: "welcome_email", label: "Welcome Email" },
  { key: "application_submitted", label: "Application Submitted" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "offer_sent", label: "Offer Sent" },
  { key: "password_reset", label: "Password Reset" },
];

const AdminPlatformSettings = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const {
    settings,
    isLoading,
    error,
    saveGeneralSettings,
    saveJobSettings,
    savePlatformConfiguration,
    saveEmailTemplate,
    isSavingGeneral,
    isSavingJobs,
    isSavingConfig,
    isSavingTemplate,
  } = usePlatformSettings();

  const [generalForm, setGeneralForm] = useState<GeneralSettings>(settings.general);
  const [jobsForm, setJobsForm] = useState<JobSettings>(settings.jobs);
  const [configForm, setConfigForm] = useState<PlatformConfiguration>(settings.config);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateKey>("welcome_email");
  const [templateSubject, setTemplateSubject] = useState(settings.emailTemplates.welcome_email.subject);
  const [templateBody, setTemplateBody] = useState(settings.emailTemplates.welcome_email.body);

  useEffect(() => {
    setGeneralForm(settings.general);
    setJobsForm(settings.jobs);
    setConfigForm(settings.config);
  }, [settings.general, settings.jobs, settings.config]);

  useEffect(() => {
    const template = settings.emailTemplates[selectedTemplate];
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);
  }, [settings.emailTemplates, selectedTemplate]);

  const selectedTemplateLabel = useMemo(
    () => TEMPLATE_OPTIONS.find((option) => option.key === selectedTemplate)?.label || "Template",
    [selectedTemplate],
  );

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

  const runSaveGeneral = async () => {
    try {
      await saveGeneralSettings(generalForm);
      toast({
        title: "General settings saved",
        description: "Platform general settings were updated.",
      });
    } catch (saveError: any) {
      toast({
        title: "Save failed",
        description: saveError?.message || "Could not save general settings.",
        variant: "destructive",
      });
    }
  };

  const runSaveJobs = async () => {
    try {
      await saveJobSettings({
        ...jobsForm,
        default_job_expiry_days: Number(jobsForm.default_job_expiry_days),
        max_jobs_per_plan: Number(jobsForm.max_jobs_per_plan),
        job_auto_archive_days: Number(jobsForm.job_auto_archive_days),
      });
      toast({
        title: "Job settings saved",
        description: "Job defaults were updated.",
      });
    } catch (saveError: any) {
      toast({
        title: "Save failed",
        description: saveError?.message || "Could not save job settings.",
        variant: "destructive",
      });
    }
  };

  const runSaveConfiguration = async () => {
    try {
      await savePlatformConfiguration(configForm);
      toast({
        title: "Platform configuration saved",
        description: "Platform configuration has been updated.",
      });
    } catch (saveError: any) {
      toast({
        title: "Save failed",
        description: saveError?.message || "Could not save platform configuration.",
        variant: "destructive",
      });
    }
  };

  const runSaveTemplate = async () => {
    try {
      await saveEmailTemplate({
        key: selectedTemplate,
        subject: templateSubject,
        body: templateBody,
      });
      toast({
        title: "Template saved",
        description: `${selectedTemplateLabel} template has been updated.`,
      });
    } catch (saveError: any) {
      toast({
        title: "Save failed",
        description: saveError?.message || "Could not save template.",
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
            Platform Settings
          </h1>
          <p className="text-muted-foreground">
            Configure platform-wide behavior, job defaults, and notification templates.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Configuration Console
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="py-10 text-center text-destructive text-sm">
                Failed to load platform settings.
              </div>
            ) : (
              <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="jobs">Job Settings</TabsTrigger>
                  <TabsTrigger value="emails">Email Templates</TabsTrigger>
                  <TabsTrigger value="config">Platform Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">General Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Platform Name</p>
                        <Input
                          value={generalForm.platform_name}
                          onChange={(event) =>
                            setGeneralForm((prev) => ({ ...prev, platform_name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Support Email</p>
                        <Input
                          value={generalForm.support_email}
                          onChange={(event) =>
                            setGeneralForm((prev) => ({ ...prev, support_email: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Default Currency</p>
                        <Select
                          value={generalForm.default_currency}
                          onValueChange={(value) => setGeneralForm((prev) => ({ ...prev, default_currency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={runSaveGeneral} disabled={isSavingGeneral}>
                          {isSavingGeneral ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save General
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="jobs">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Job Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Default Job Expiry Days</p>
                        <Input
                          type="number"
                          min={1}
                          value={jobsForm.default_job_expiry_days}
                          onChange={(event) =>
                            setJobsForm((prev) => ({
                              ...prev,
                              default_job_expiry_days: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Max Jobs Per Plan</p>
                        <Input
                          type="number"
                          min={1}
                          value={jobsForm.max_jobs_per_plan}
                          onChange={(event) =>
                            setJobsForm((prev) => ({
                              ...prev,
                              max_jobs_per_plan: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Job Auto Archive Days</p>
                        <Input
                          type="number"
                          min={1}
                          value={jobsForm.job_auto_archive_days}
                          onChange={(event) =>
                            setJobsForm((prev) => ({
                              ...prev,
                              job_auto_archive_days: Number(event.target.value || 0),
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={runSaveJobs} disabled={isSavingJobs}>
                          {isSavingJobs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Job Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="emails">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Email Templates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Template</p>
                        <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as EmailTemplateKey)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_OPTIONS.map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Subject</p>
                        <Input
                          value={templateSubject}
                          onChange={(event) => setTemplateSubject(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Body</p>
                        <Input
                          value={templateBody}
                          onChange={(event) => setTemplateBody(event.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={runSaveTemplate} disabled={isSavingTemplate}>
                          {isSavingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="config">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Platform Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Maintenance Mode</p>
                        <Select
                          value={configForm.maintenance_mode ? "enabled" : "disabled"}
                          onValueChange={(value) =>
                            setConfigForm((prev) => ({
                              ...prev,
                              maintenance_mode: value === "enabled",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disabled">Disabled</SelectItem>
                            <SelectItem value="enabled">Enabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Enable Notifications</p>
                        <Select
                          value={configForm.enable_notifications ? "enabled" : "disabled"}
                          onValueChange={(value) =>
                            setConfigForm((prev) => ({
                              ...prev,
                              enable_notifications: value === "enabled",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Enable AI Features</p>
                        <Select
                          value={configForm.enable_ai_features ? "enabled" : "disabled"}
                          onValueChange={(value) =>
                            setConfigForm((prev) => ({
                              ...prev,
                              enable_ai_features: value === "enabled",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={runSaveConfiguration} disabled={isSavingConfig}>
                          {isSavingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Configuration
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminPlatformSettings;
