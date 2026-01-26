import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
    trend?: string;
}

const KPICard = ({ label, value, icon: Icon, color = 'primary', trend }: KPICardProps) => {
    const colorClasses = {
        primary: 'from-primary/10 to-primary/5 text-primary',
        accent: 'from-accent/10 to-accent/5 text-accent',
        success: 'from-success/10 to-success/5 text-success',
        warning: 'from-warning/10 to-warning/5 text-warning',
        destructive: 'from-destructive/10 to-destructive/5 text-destructive',
    };

    return (
        <Card className="card-dashboard">
            <CardContent className="pt-6 pb-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
                        {trend && <p className="text-xs text-muted-foreground font-light">{trend}</p>}
                    </div>
                    <div className={cn(
                        "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center",
                        colorClasses[color]
                    )}>
                        <Icon className="w-7 h-7" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default KPICard;
