import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronDown, ChevronUp, CheckCircle2, XCircle, Sparkles,
    BrainCircuit, Clock, Briefcase, Star
} from "lucide-react";
import { useState } from "react";
import type { RichCandidateScore, ScoreBreakdown } from "@/hooks/useApplicationScores";

// ─── Score color system ──────────────────────────────────────────
export const getMatchColor = (score: number) => {
    if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25", ring: "ring-emerald-500/20", bar: "bg-emerald-500" };
    if (score >= 60) return { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/25", ring: "ring-blue-500/20", bar: "bg-blue-500" };
    return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", ring: "ring-muted", bar: "bg-muted-foreground/50" };
};

export const getMatchLabel = (score: number) => {
    if (score >= 80) return "Strong Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Partial Match";
    return "Low Match";
};

// ─── Match percentage badge (large, standalone) ─────────────────
interface MatchBadgeProps { score: number; size?: "sm" | "lg" }
export const MatchBadge = ({ score, size = "lg" }: MatchBadgeProps) => {
    const c = getMatchColor(score);
    const isLg = size === "lg";
    return (
        <div className={`
            ${isLg ? "w-20 h-20 text-3xl" : "w-14 h-14 text-xl"}
            rounded-2xl flex flex-col items-center justify-center
            ${c.bg} ${c.text} ${c.border} border ring-2 ${c.ring}
            font-bold shrink-0 shadow-sm
        `}>
            <span>{score}</span>
            <span className={`${isLg ? "text-[10px]" : "text-[9px]"} font-normal opacity-75`}>match</span>
        </div>
    );
};

// ─── Skill highlight row ─────────────────────────────────────────
interface SkillMatchRowProps {
    matched: string[];
    missing: string[];
    maxShow?: number;
}
export const SkillMatchRow = ({ matched, missing, maxShow = 6 }: SkillMatchRowProps) => {
    const [showAll, setShowAll] = useState(false);
    const allSkills = [
        ...matched.map(s => ({ skill: s, matched: true })),
        ...missing.map(s => ({ skill: s, matched: false })),
    ];
    const displayed = showAll ? allSkills : allSkills.slice(0, maxShow);
    const hasMore = allSkills.length > maxShow;

    if (allSkills.length === 0) return null;

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skill Match</p>
            <div className="flex flex-wrap gap-1.5">
                {displayed.map(({ skill, matched }) => (
                    <span
                        key={skill}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${matched
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-muted/20 text-muted-foreground/50 border-border/30 line-through"
                            }`}
                    >
                        {matched
                            ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                            : <XCircle className="w-3 h-3 shrink-0" />
                        }
                        {skill}
                    </span>
                ))}
                {hasMore && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs text-primary hover:underline"
                    >
                        {showAll ? "less" : `+${allSkills.length - maxShow} more`}
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── AI Insight chip ─────────────────────────────────────────────
interface AiInsightProps { text: string | null }
export const AiInsight = ({ text }: AiInsightProps) => {
    if (!text) return null;
    return (
        <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <BrainCircuit className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
        </div>
    );
};

// ─── Sub-score bar ───────────────────────────────────────────────
const SubScoreBar = ({ label, value, max, icon }: { label: string; value: number; max: number; icon: React.ReactNode }) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
            <span className="font-medium text-foreground">{value}/{max}</span>
        </div>
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                style={{ width: `${(value / max) * 100}%` }}
            />
        </div>
    </div>
);

// ─── Full Card ───────────────────────────────────────────────────
interface ScoreBreakdownCardProps {
    score: number;
    breakdown: ScoreBreakdown;
    candidateName: string;
    jobTitle?: string;
    matched_skills?: string[];
    missing_skills?: string[];
    ai_explanation?: string | null;
    years_experience?: number;
    rank?: number;
    isRecommended?: boolean;
    expanded?: boolean;
}

export const ScoreBreakdownCard = ({
    score, breakdown, candidateName, jobTitle,
    matched_skills = [], missing_skills = [],
    ai_explanation = null, years_experience = 0,
    rank, isRecommended = false, expanded: initExpanded = false,
}: ScoreBreakdownCardProps) => {
    const [expanded, setExpanded] = useState(initExpanded);
    const c = getMatchColor(score);

    return (
        <Card className={`card-dashboard overflow-hidden transition-all duration-200 ${isRecommended ? `ring-1 ${c.ring}` : ""}`}>
            <CardContent className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex items-start gap-4">
                    <MatchBadge score={score} size="lg" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground">{candidateName}</h3>
                            {isRecommended && (
                                <Badge className="bg-warning/10 text-warning border-warning/20 border text-[10px] px-1.5 py-0 gap-1">
                                    <Star className="w-2.5 h-2.5" /> Recommended
                                </Badge>
                            )}
                            {rank && rank <= 3 && (
                                <Badge className={`border text-[10px] px-1.5 py-0 ${rank === 1 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                        rank === 2 ? "bg-slate-400/10 text-slate-400 border-slate-400/20" :
                                            "bg-amber-700/10 text-amber-600 border-amber-700/20"
                                    }`}>
                                    #{rank} Ranked
                                </Badge>
                            )}
                        </div>

                        {jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{jobTitle}</p>}

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge className={`${c.bg} ${c.text} ${c.border} border text-xs`}>
                                {getMatchLabel(score)}
                            </Badge>
                            {years_experience > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" /> {years_experience}y exp
                                </span>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost" size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="text-muted-foreground shrink-0 text-xs"
                    >
                        {expanded ? <>Hide <ChevronUp className="w-3.5 h-3.5 ml-1" /></> : <>Details <ChevronDown className="w-3.5 h-3.5 ml-1" /></>}
                    </Button>
                </div>

                {/* Always-visible: skill pills */}
                {(matched_skills.length > 0 || missing_skills.length > 0) && (
                    <div className="mt-4">
                        <SkillMatchRow matched={matched_skills} missing={missing_skills} maxShow={5} />
                    </div>
                )}

                {/* AI Insight — always visible if available */}
                {ai_explanation && (
                    <div className="mt-3">
                        <AiInsight text={ai_explanation} />
                    </div>
                )}

                {/* Expanded: sub-score breakdown */}
                {expanded && (
                    <div className="mt-5 pt-5 border-t border-border/20 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Score Breakdown</p>
                        <SubScoreBar label="Skills Match" value={breakdown.skills_match} max={40} icon={<Briefcase className="w-3.5 h-3.5" />} />
                        <SubScoreBar label="Experience" value={breakdown.experience_match} max={30} icon={<Clock className="w-3.5 h-3.5" />} />
                        <SubScoreBar label="Keywords" value={breakdown.agency_score} max={20} icon={<Sparkles className="w-3.5 h-3.5" />} />
                        <SubScoreBar label="Freshness" value={breakdown.interview_score} max={10} icon={<Star className="w-3.5 h-3.5" />} />
                        <div className="mt-3 p-3 bg-muted/10 rounded-xl">
                            <p className="text-[11px] text-muted-foreground">
                                <strong>Score weights:</strong> Skills (40%) · Experience (30%) · Keywords (20%) · Profile freshness (10%).
                                Scores are AI recommendations — hiring decisions remain with your team.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ScoreBreakdownCard;
