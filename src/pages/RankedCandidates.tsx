import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Award, Loader2, TrendingUp, Users, Filter, BrainCircuit,
    Star, CheckCircle, Zap, SlidersHorizontal, UserCheck, ArrowRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRichCandidateScores } from "@/hooks/useApplicationScores";
import { ScoreBreakdownCard, getMatchColor, MatchBadge } from "@/components/ScoreBreakdownCard";
import { useProfile } from "@/hooks/useProfile";
import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type SortMode = "best_match" | "most_experienced" | "recently_updated";

const RankedCandidates = () => {
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get("jobId") || undefined;

    const { data: scores = [], isLoading } = useRichCandidateScores(jobId);
    const { profile } = useProfile();
    const { toast } = useToast();

    const [minScore, setMinScore] = useState<number>(0);
    const [sortMode, setSortMode] = useState<SortMode>("best_match");

    const isRecruiter = profile && ["employer", "agency", "admin"].includes(profile.role || "");

    // ── Derived statistics ────────────────────────────────────────
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length)
        : 0;
    const top10pctScore = scores.length > 0
        ? scores[Math.floor(scores.length * 0.1)]?.score || scores[0]?.score || 0
        : 0;
    const recommendedCount = scores.filter(s => s.score >= 75).length;

    // ── Sorted + filtered list ────────────────────────────────────
    const sorted = useMemo(() => {
        const filtered = scores.filter(s => s.score >= minScore);
        switch (sortMode) {
            case "most_experienced":
                return [...filtered].sort((a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0));
            case "recently_updated":
                return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            default: // best_match
                return [...filtered].sort((a, b) => b.score - a.score);
        }
    }, [scores, minScore, sortMode]);

    const recommended = sorted.filter(s => s.score >= 75).slice(0, 3);
    const rest = sorted.slice(0, 50);

    // ── Auto-shortlist handler ────────────────────────────────────
    const handleAutoShortlist = () => {
        const count = scores.filter(s => s.score >= 75).length;
        if (count === 0) {
            toast({ title: "No strong candidates", description: "No candidates scored ≥75 for this job." });
            return;
        }
        toast({
            title: `${count} candidate${count > 1 ? "s" : ""} recommended`,
            description: "Candidates with ≥75 match score are highlighted below.",
        });
        setMinScore(75);
    };

    // ── Loading skeletons ─────────────────────────────────────────
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-5 w-96" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 lg:space-y-10">

                {/* ── Header ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                                AI Candidate Rankings
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-base">
                            Candidates ranked by AI match score · Skills · Experience · Fit
                        </p>
                    </div>

                    {isRecruiter && scores.length > 0 && (
                        <Button
                            onClick={handleAutoShortlist}
                            className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-fit"
                        >
                            <Zap className="w-4 h-4" />
                            Auto-Shortlist ≥75
                        </Button>
                    )}
                </div>

                {/* ── KPI Summary ────────────────────────────── */}
                {scores.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: "Total Candidates", value: scores.length, icon: Users, color: "primary" },
                            { label: "Recommended (75+)", value: recommendedCount, icon: Star, color: "warning" },
                            { label: "Average Score", value: `${avgScore}%`, icon: TrendingUp, color: "accent" },
                            { label: "Top 10% Score", value: `${top10pctScore}%`, icon: Award, color: "success" },
                        ].map(stat => (
                            <Card key={stat.label} className="card-dashboard">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl bg-${stat.color}/10 flex items-center justify-center shrink-0`}>
                                            <stat.icon className={`w-4.5 h-4.5 text-${stat.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                                            <p className="text-xl font-bold">{stat.value}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* ── Smart Sorting & Filters ─────────────────── */}
                {scores.length > 0 && (
                    <Card className="card-dashboard">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Sort & Filter:</span>
                                </div>

                                {/* Sort mode */}
                                <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                                    <SelectTrigger className="w-44 h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="best_match">
                                            <span className="flex items-center gap-2"><BrainCircuit className="w-3.5 h-3.5 text-primary" />Best Match</span>
                                        </SelectItem>
                                        <SelectItem value="most_experienced">
                                            <span className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-accent" />Most Experienced</span>
                                        </SelectItem>
                                        <SelectItem value="recently_updated">
                                            <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-success" />Recently Updated</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Min score filter */}
                                <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
                                    <SelectTrigger className="w-32 h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">All scores</SelectItem>
                                        <SelectItem value="40">40%+ match</SelectItem>
                                        <SelectItem value="60">60%+ match</SelectItem>
                                        <SelectItem value="75">75%+ match</SelectItem>
                                        <SelectItem value="80">80%+ match</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Badge variant="outline" className="ml-auto text-xs">
                                    {sorted.length} candidate{sorted.length !== 1 ? "s" : ""}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Recommended Section ──────────────────────── */}
                {recommended.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/25">
                                <Star className="w-3.5 h-3.5 text-warning" />
                                <span className="text-xs font-semibold text-warning">Top {recommended.length} Recommended Candidates</span>
                            </div>
                            <div className="flex-1 h-px bg-border/30" />
                        </div>

                        <div className="space-y-3">
                            {recommended.map((s, idx) => (
                                <ScoreBreakdownCard
                                    key={s.id}
                                    score={s.score}
                                    breakdown={s.breakdown}
                                    candidateName={s.candidate_name}
                                    jobTitle={s.job_title}
                                    matched_skills={s.matched_skills}
                                    missing_skills={s.missing_skills}
                                    ai_explanation={s.ai_explanation}
                                    years_experience={s.years_experience}
                                    rank={idx + 1}
                                    isRecommended
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── All Candidates ───────────────────────────── */}
                {rest.length > 0 && (
                    <div className="space-y-4">
                        {recommended.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">All Candidates</span>
                                <div className="flex-1 h-px bg-border/30" />
                            </div>
                        )}
                        <div className="space-y-3">
                            {rest.map((s, idx) => (
                                <ScoreBreakdownCard
                                    key={s.id}
                                    score={s.score}
                                    breakdown={s.breakdown}
                                    candidateName={s.candidate_name}
                                    jobTitle={s.job_title}
                                    matched_skills={s.matched_skills}
                                    missing_skills={s.missing_skills}
                                    ai_explanation={s.ai_explanation}
                                    years_experience={s.years_experience}
                                    rank={sortMode === "best_match" ? idx + 1 : undefined}
                                    isRecommended={s.score >= 75}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Empty state ──────────────────────────────── */}
                {scores.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <BrainCircuit className="w-16 h-16 text-muted-foreground/25 mx-auto mb-5" />
                            <h3 className="text-xl font-semibold mb-2">No AI scores yet</h3>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                AI match scores are generated automatically when candidates apply and have a parsed CV profile.
                                Candidates need to upload their CV first.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* ── Footer note ──────────────────────────────── */}
                {scores.length > 0 && (
                    <div className="p-4 bg-muted/15 rounded-xl border border-border/20 text-center">
                        <p className="text-xs text-muted-foreground">
                            <BrainCircuit className="w-3.5 h-3.5 inline mr-1 text-primary" />
                            AI scores are recommendations to help prioritize candidates.
                            All hiring decisions should be made by your team based on complete evaluations.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default RankedCandidates;
