import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Briefcase, Clock, Building2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { ScoreBreakdown } from "@/hooks/useApplicationScores";

interface ScoreBreakdownCardProps {
    score: number;
    breakdown: ScoreBreakdown;
    candidateName: string;
    jobTitle?: string;
    expanded?: boolean;
}

const breakdownLabels: Record<keyof ScoreBreakdown, { label: string; icon: React.ReactNode; max: number }> = {
    skills_match: { label: "Skills Match", icon: <Briefcase className="w-4 h-4" />, max: 40 },
    experience_match: { label: "Experience", icon: <Clock className="w-4 h-4" />, max: 30 },
    agency_score: { label: "Agency Performance", icon: <Building2 className="w-4 h-4" />, max: 20 },
    interview_score: { label: "Interview", icon: <MessageSquare className="w-4 h-4" />, max: 10 },
};

const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-success/10 text-success border-success/20";
    if (score >= 50) return "bg-primary/10 text-primary border-primary/20";
    if (score >= 25) return "bg-warning/10 text-warning border-warning/20";
    return "bg-muted text-muted-foreground border-border";
};

const getScoreLabel = (score: number) => {
    if (score >= 75) return "Excellent Match";
    if (score >= 50) return "Good Match";
    if (score >= 25) return "Fair Match";
    return "Low Match";
};

export const ScoreBreakdownCard = ({
    score,
    breakdown,
    candidateName,
    jobTitle,
    expanded: initialExpanded = false
}: ScoreBreakdownCardProps) => {
    const [expanded, setExpanded] = useState(initialExpanded);

    return (
        <Card className="card-float border-0 overflow-hidden">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Score Badge */}
                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${getScoreColor(score)}`}>
                            <span className="text-2xl font-bold">{score}</span>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-foreground">{candidateName}</h3>
                            {jobTitle && <p className="text-sm text-muted-foreground">{jobTitle}</p>}
                            <Badge className={`mt-1 border ${getScoreColor(score)}`}>
                                {getScoreLabel(score)}
                            </Badge>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="text-muted-foreground"
                    >
                        {expanded ? (
                            <>
                                Hide Details <ChevronUp className="w-4 h-4 ml-1" />
                            </>
                        ) : (
                            <>
                                Why this score? <ChevronDown className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Expanded Breakdown */}
                {expanded && (
                    <div className="mt-6 pt-6 border-t border-border/30 space-y-4">
                        <h4 className="text-sm font-medium text-foreground mb-4">Score Breakdown</h4>
                        {(Object.entries(breakdownLabels) as [keyof ScoreBreakdown, typeof breakdownLabels[keyof ScoreBreakdown]][]).map(([key, config]) => {
                            const value = breakdown[key];
                            const percentage = (value / config.max) * 100;

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            {config.icon}
                                            {config.label}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {value}/{config.max}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        <div className="mt-4 p-4 bg-muted/20 rounded-xl">
                            <p className="text-xs text-muted-foreground">
                                <strong>How scores are calculated:</strong> Skills matching (40%), experience proximity (30%),
                                agency track record (20%), and interview feedback (10%). Scores are recommendations only —
                                final hiring decisions are made by your team.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ScoreBreakdownCard;
