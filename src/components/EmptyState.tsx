import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    secondaryAction?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    features?: string[];
    comingSoon?: boolean;
}

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    features,
    comingSoon = false,
}: EmptyStateProps) => {
    return (
        <Card className="border-dashed">
            <CardContent className="p-12 lg:p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-10 h-10 text-muted-foreground/40" />
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                    {comingSoon && (
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    )}
                </div>

                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {description}
                </p>

                {/* Feature roadmap hints */}
                {features && features.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-normal">
                                {feature}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {action && (
                        action.href ? (
                            <Link to={action.href}>
                                <Button className="shadow-lg shadow-primary/20 h-11 px-6">
                                    {action.label}
                                </Button>
                            </Link>
                        ) : (
                            <Button onClick={action.onClick} className="shadow-lg shadow-primary/20 h-11 px-6">
                                {action.label}
                            </Button>
                        )
                    )}
                    {secondaryAction && (
                        secondaryAction.href ? (
                            <Link to={secondaryAction.href}>
                                <Button variant="outline" className="h-11 px-6">
                                    {secondaryAction.label}
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" onClick={secondaryAction.onClick} className="h-11 px-6">
                                {secondaryAction.label}
                            </Button>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default EmptyState;
