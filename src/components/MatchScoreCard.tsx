import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Briefcase, Clock, Tag, Sparkles } from "lucide-react";
import { useState } from "react";
import { CandidateJobScore, getScoreLabel } from "@/hooks/useCandidateJobScores";

interface MatchScoreCardProps {
    score: CandidateJobScore;
    showCandidate?: boolean; // Show candidate name (for employer)
    showJob?: boolean;       // Show job title (for candidate)
    compact?: boolean;
}

export const MatchScoreCard = ({
    score,
    showCandidate = true,
    showJob = false,
    compact = false
}: MatchScoreCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const { label, color } = getScoreLabel(score.score);

    const colorClasses: Record<string, string> = {
        success: 'bg-success/10 text-success border-success/20',
        primary: 'bg-primary/10 text-primary border-primary/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        muted: 'bg-muted text-muted-foreground border-border',
    };

    return (
        <Card className={`card-float border-0 overflow-hidden ${compact ? '' : 'hover:shadow-lg transition-shadow'}`}>
            <CardContent className={compact ? 'p-4' : 'p-6'}>
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Score Badge */}
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${colorClasses[color]}`}>
                            <span className="text-xl font-bold">{score.score}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                                {showCandidate ? score.candidate_name : score.job_title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={`border ${colorClasses[color]}`}>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {label}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {!compact && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-muted-foreground"
                        >
                            {expanded ? (
                                <>Hide <ChevronUp className="w-4 h-4 ml-1" /></>
                            ) : (
                                <>Details <ChevronDown className="w-4 h-4 ml-1" /></>
                            )}
                        </Button>
                    )}
                </div>

                {/* Expanded breakdown */}
                {expanded && !compact && (
                    <div className="mt-6 pt-6 border-t border-border/30 space-y-6">
                        {/* Explanation */}
                        <div className="p-4 bg-muted/20 rounded-xl">
                            <p className="text-sm text-muted-foreground">{score.explanation}</p>
                        </div>

                        {/* Score breakdown */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-foreground">Score Breakdown</h4>

                            {/* Skills */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Briefcase className="w-4 h-4" />
                                        Skills Match
                                    </span>
                                    <span className="font-medium">{score.breakdown.skills_score}/40</span>
                                </div>
                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${(score.breakdown.skills_score / 40) * 100}%` }}
                                    />
                                </div>
                                {score.breakdown.matched_skills?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {score.breakdown.matched_skills.map((skill) => (
                                            <Badge key={skill} variant="secondary" className="text-xs">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Experience */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        Experience
                                    </span>
                                    <span className="font-medium">{score.breakdown.experience_score}/30</span>
                                </div>
                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full"
                                        style={{ width: `${(score.breakdown.experience_score / 30) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Tag className="w-4 h-4" />
                                        Keywords
                                    </span>
                                    <span className="font-medium">{score.breakdown.keyword_score}/30</span>
                                </div>
                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-warning rounded-full"
                                        style={{ width: `${(score.breakdown.keyword_score / 30) * 100}%` }}
                                    />
                                </div>
                                {score.breakdown.matched_keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {score.breakdown.matched_keywords.map((kw) => (
                                            <Badge key={kw} variant="outline" className="text-xs">
                                                {kw}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI disclaimer */}
                        <p className="text-xs text-muted-foreground/60 text-center">
                            AI-generated match score. Final decisions should be made by humans.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MatchScoreCard;
