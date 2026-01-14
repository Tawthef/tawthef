import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList } from "lucide-react";

const Pipeline = () => {
    return (
        <DashboardLayout>
            <div className="space-y-10">
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Pipeline</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Visualize your hiring pipeline and track progress
                    </p>
                </div>
                <EmptyState
                    icon={ClipboardList}
                    title="Hiring Pipeline"
                    description="Drag-and-drop Kanban board to visualize candidate progress through your hiring stages. This feature is in active development."
                    comingSoon
                    features={[
                        "Kanban board",
                        "Drag & drop",
                        "Stage customization",
                        "Bulk actions",
                        "Pipeline analytics",
                    ]}
                    action={{
                        label: "View Candidates",
                        href: "/dashboard/candidates",
                    }}
                    secondaryAction={{
                        label: "View Analytics",
                        href: "/dashboard/analytics",
                    }}
                />
            </div>
        </DashboardLayout>
    );
};

export default Pipeline;
