import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const PIPELINE_STAGES = [
    { key: 'applied', label: 'Applied' },
    { key: 'agency_shortlisted', label: 'Agency' },
    { key: 'hr_shortlisted', label: 'HR' },
    { key: 'technical_shortlisted', label: 'Technical' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' },
    { key: 'hired', label: 'Hired' },
];

interface StatusProgressBarProps {
    currentStatus: string;
    className?: string;
    compact?: boolean;
}

const StatusProgressBar = ({ currentStatus, className, compact = false }: StatusProgressBarProps) => {
    const isRejected = currentStatus === 'rejected';

    // Find index of current status in pipeline
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStatus);

    return (
        <div className={cn("w-full", className)}>
            <div className={cn(
                "flex items-center",
                compact ? "gap-1" : "gap-0.5 sm:gap-1"
            )}>
                {PIPELINE_STAGES.map((stage, index) => {
                    const isPast = currentIndex > index;
                    const isCurrent = currentIndex === index;
                    const isFuture = !isPast && !isCurrent;

                    return (
                        <div key={stage.key} className="flex items-center flex-1 last:flex-initial">
                            {/* Step circle + label */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "flex items-center justify-center rounded-full transition-all",
                                    compact ? "w-6 h-6" : "w-7 h-7 sm:w-8 sm:h-8",
                                    isPast && "bg-success text-white",
                                    isCurrent && !isRejected && "bg-primary text-white ring-2 ring-primary/30",
                                    isFuture && "bg-muted/40 text-muted-foreground/40",
                                    isRejected && isCurrent && "bg-destructive text-white ring-2 ring-destructive/30",
                                )}>
                                    {isPast ? (
                                        <Check className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                                    ) : isCurrent && isRejected ? (
                                        <X className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                                    ) : (
                                        <span className={cn(
                                            "font-semibold",
                                            compact ? "text-[10px]" : "text-xs"
                                        )}>
                                            {index + 1}
                                        </span>
                                    )}
                                </div>
                                {!compact && (
                                    <span className={cn(
                                        "text-[10px] sm:text-xs font-medium text-center leading-tight",
                                        isPast && "text-success",
                                        isCurrent && !isRejected && "text-primary",
                                        isFuture && "text-muted-foreground/40",
                                        isRejected && isCurrent && "text-destructive",
                                    )}>
                                        {stage.label}
                                    </span>
                                )}
                            </div>

                            {/* Connector line */}
                            {index < PIPELINE_STAGES.length - 1 && (
                                <div className={cn(
                                    "flex-1 mx-0.5 sm:mx-1",
                                    compact ? "h-0.5" : "h-0.5 sm:h-[3px]",
                                    "rounded-full transition-all",
                                    isPast ? "bg-success" : "bg-muted/30",
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Rejected overlay label */}
            {isRejected && (
                <div className="mt-2 flex items-center justify-center">
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                        Rejected
                    </span>
                </div>
            )}
        </div>
    );
};

export default StatusProgressBar;
