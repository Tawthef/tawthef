import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { ProfileStrengthSection } from "@/hooks/useProfileStrength";

interface ProfileStrengthCardProps {
  percentage: number;
  missingSections: ProfileStrengthSection[];
  isLoading?: boolean;
  title?: string;
  className?: string;
}

const SECTION_LABELS: Record<ProfileStrengthSection, string> = {
  personal_info: "Personal information",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  cv_uploaded: "CV uploaded",
};

const getTone = (percentage: number) => {
  if (percentage >= 80) {
    return {
      bar: "bg-success",
      badge: "bg-success/10 text-success border-success/30",
    };
  }

  if (percentage >= 50) {
    return {
      bar: "bg-primary",
      badge: "bg-primary/10 text-primary border-primary/30",
    };
  }

  return {
    bar: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/30",
  };
};

const ProfileStrengthCard = ({
  percentage,
  missingSections,
  isLoading = false,
  title = "Profile Strength",
  className,
}: ProfileStrengthCardProps) => {
  const tone = getTone(percentage);

  return (
    <Card className={cn("card-float border-0", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl font-semibold">{title}</CardTitle>
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Badge className={cn("border", tone.badge)}>
              {percentage}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-3 rounded-full bg-muted/50 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted/50 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
              <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Missing Sections</p>
              {missingSections.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  All profile sections are complete.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {missingSections.map((section) => (
                    <li key={section} className="text-sm text-muted-foreground">
                      - {SECTION_LABELS[section]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileStrengthCard;
