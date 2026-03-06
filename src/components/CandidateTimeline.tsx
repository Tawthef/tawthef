import { format } from "date-fns";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  Gift,
  LucideIcon,
  UserCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCandidateTimeline } from "@/hooks/useCandidateTimeline";

interface CandidateTimelineProps {
  applicationId?: string | null;
  className?: string;
}

const stepIcons: Record<string, LucideIcon> = {
  applied: FileText,
  shortlisted: UserCheck,
  interview_scheduled: CalendarClock,
  offer_sent: Gift,
  offer_accepted: CheckCircle2,
  hired: Briefcase,
};

const formatTimestamp = (value: string | null) => {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return format(date, "MMM d, yyyy h:mm a");
};

const TimelineSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    ))}
  </div>
);

const CandidateTimeline = ({ applicationId, className }: CandidateTimelineProps) => {
  const { data: events = [], isLoading } = useCandidateTimeline(applicationId);

  if (isLoading) {
    return (
      <div className={className}>
        <TimelineSkeleton />
      </div>
    );
  }

  if (!applicationId || events.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Timeline will appear once this application has activity.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {events.map((event, index) => {
        const Icon = stepIcons[event.event_key] || FileText;
        const isCompleted = event.is_completed;
        const isLast = index === events.length - 1;
        const nextCompleted = !isLast ? events[index + 1]?.is_completed : false;

        return (
          <div key={event.event_key} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center",
                  isCompleted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/40 border-border/50 text-muted-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px h-7 mt-1",
                    nextCompleted ? "bg-primary/40" : "bg-border/50",
                  )}
                />
              )}
            </div>

            <div className="pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {event.event_title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTimestamp(event.event_timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CandidateTimeline;
