import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/EmptyState";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Settings</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Manage your account preferences and notifications
                    </p>
                </div>
                <EmptyState
                    icon={SettingsIcon}
                    title="Account Settings"
                    description="Configure your account preferences, notifications, and security settings. These features are being finalized for the next release."
                    comingSoon
                    features={[
                        "Email preferences",
                        "Notification settings",
                        "Two-factor auth",
                        "API keys",
                        "Team management",
                    ]}
                    action={{
                        label: "Back to Dashboard",
                        href: "/dashboard",
                    }}
                />
            </div>
        </DashboardLayout>
    );
};

export default Settings;
