import { format, formatDistanceToNow } from "date-fns";
import { Briefcase, Calendar, Check, Clock3, LucideIcon, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ActivityTimelineItem {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface ActivityTimelineProps {
  title?: string;
  activities: ActivityTimelineItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const iconByActionType: Record<string, LucideIcon> = {
  job_posted: Briefcase,
  application: User,
  interview: Calendar,
  offer: Check,
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      absolute: "Unknown time",
      relative: "",
    };
  }

  return {
    absolute: format(date, "MMM d, yyyy h:mm a"),
    relative: formatDistanceToNow(date, { addSuffix: true }),
  };
};

export default function ActivityTimeline({
  title = "Recent Hiring Activity",
  activities,
  isLoading = false,
  emptyMessage = "No hiring activity yet.",
  className,
}: ActivityTimelineProps) {
  return (
    <Card className={cn("card-dashboard", className)}>
      <CardHeader className="pb-6">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/10">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : activities.length > 0 ? (
          activities.map((activity) => {
            const Icon = iconByActionType[activity.action_type] ?? Clock3;
            const time = formatTimestamp(activity.created_at);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {time.absolute}
                    {time.relative ? ` | ${time.relative}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Clock3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

