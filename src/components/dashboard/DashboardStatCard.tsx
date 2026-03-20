import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

type TrendTone = "up" | "down" | "neutral";

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  trendDirection?: TrendTone;
}

const trendToneClass: Record<TrendTone, string> = {
  up: "text-green-600",
  down: "text-red-500",
  neutral: "text-gray-500",
};

const formatTrendValue = (trend: number, direction: TrendTone) => {
  if (direction === "neutral") return `${trend.toLocaleString("en-US")}`;
  const absoluteValue = Math.abs(trend).toLocaleString("en-US");
  return `${direction === "up" ? "+" : "-"}${absoluteValue}`;
};

export default function DashboardStatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendDirection = "neutral",
}: DashboardStatCardProps) {
  return (
    <Card className="card-dashboard">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {typeof trend === "number" && trendLabel ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={`inline-flex items-center gap-1 ${trendToneClass[trendDirection]}`}>
                  {trendDirection === "up" && <ArrowUpRight className="w-3.5 h-3.5" />}
                  {trendDirection === "down" && <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{formatTrendValue(trend, trendDirection)}</span>
                </span>
                <span>{trendLabel}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Updated recently</p>
            )}
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStatCardSkeleton() {
  return (
    <Card className="card-dashboard">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
