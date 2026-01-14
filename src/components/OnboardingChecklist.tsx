import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ChecklistItem {
    id: string;
    label: string;
    completed: boolean;
    href?: string;
}

interface OnboardingChecklistProps {
    title: string;
    items: ChecklistItem[];
    completedCount: number;
    totalCount: number;
}

export const OnboardingChecklist = ({
    title,
    items,
    completedCount,
    totalCount,
}: OnboardingChecklistProps) => {
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <Card className="card-float border-0">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                        {completedCount}/{totalCount}
                    </span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-colors ${item.completed ? 'bg-success/5' : 'bg-muted/20 hover:bg-muted/30'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {item.completed ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                                <Circle className="w-5 h-5 text-muted-foreground/40" />
                            )}
                            <span className={item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                                {item.label}
                            </span>
                        </div>
                        {!item.completed && item.href && (
                            <Link to={item.href}>
                                <Button variant="ghost" size="sm" className="h-8 px-3">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

// Preset checklists for each role
export const getCandidateChecklist = (profile: any, applicationsCount: number): ChecklistItem[] => [
    { id: 'profile', label: 'Complete your profile', completed: !!profile?.skills?.length, href: '/dashboard/profile' },
    { id: 'skills', label: 'Add at least 3 skills', completed: (profile?.skills?.length || 0) >= 3, href: '/dashboard/profile' },
    { id: 'experience', label: 'Set years of experience', completed: (profile?.years_experience || 0) > 0, href: '/dashboard/profile' },
    { id: 'apply', label: 'Apply to a job', completed: applicationsCount > 0, href: '/dashboard/jobs' },
];

export const getEmployerChecklist = (hasOrg: boolean, jobsCount: number, candidatesCount: number): ChecklistItem[] => [
    { id: 'org', label: 'Set up organization', completed: hasOrg, href: '/dashboard/settings' },
    { id: 'job', label: 'Post your first job', completed: jobsCount > 0, href: '/dashboard/jobs' },
    { id: 'review', label: 'Review candidates', completed: candidatesCount > 0, href: '/dashboard/candidates' },
];

export const getAgencyChecklist = (hasOrg: boolean, submissionsCount: number): ChecklistItem[] => [
    { id: 'org', label: 'Set up agency profile', completed: hasOrg, href: '/dashboard/settings' },
    { id: 'submit', label: 'Submit first candidate', completed: submissionsCount > 0, href: '/dashboard/submissions' },
];

export default OnboardingChecklist;
