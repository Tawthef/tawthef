import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Trophy, TrendingUp, Briefcase, Clock3, GraduationCap } from "lucide-react";
import { useJobCandidateScores, CandidateJobScore } from "@/hooks/useCandidateJobScores";
import { useProfile } from "@/hooks/useProfile";
import { useJobs } from "@/hooks/useJobs";
import { useTalentPoolActions, useTalentPools } from "@/hooks/useTalentPools";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

type SortOption = "best_match" | "most_experienced" | "recently_updated" | "highest_education";

const getMatchTone = (score: number) => {
    if (score >= 80) {
        return {
            badge: "bg-success/15 text-success border-success/30",
            chip: "bg-success/10 text-success border-success/30",
        };
    }
    if (score >= 60) {
        return {
            badge: "bg-primary/15 text-primary border-primary/30",
            chip: "bg-primary/10 text-primary border-primary/30",
        };
    }
    return {
        badge: "bg-muted text-muted-foreground border-border",
        chip: "bg-muted/40 text-muted-foreground border-border",
    };
};

const toComparableDate = (value: string | null | undefined) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: string) => value.toLowerCase().trim();

const getEducationRank = (candidate: CandidateJobScore): number => {
    const values = [
        candidate.education_level || "",
        ...(candidate.education || [])
    ].map(normalizeText);

    if (values.some((item) => item.includes("phd") || item.includes("doctor"))) return 5;
    if (values.some((item) => item.includes("master") || item.includes("msc") || item.includes("mba"))) return 4;
    if (values.some((item) => item.includes("bachelor") || item.includes("bsc") || item.includes("ba"))) return 3;
    if (values.some((item) => item.includes("associate") || item.includes("diploma"))) return 2;
    if (values.some((item) => item.length > 0)) return 1;
    return 0;
};

const getEducationLabel = (candidate: CandidateJobScore): string => {
    return candidate.education_level || candidate.education?.[0] || "Not specified";
};

const formatUpdatedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown update";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const sortCandidates = (items: CandidateJobScore[], sortBy: SortOption) => {
    const sorted = [...items];
    sorted.sort((a, b) => {
        if (sortBy === "best_match") {
            return b.score - a.score;
        }
        if (sortBy === "most_experienced") {
            return (b.years_experience - a.years_experience) || (b.score - a.score);
        }
        if (sortBy === "recently_updated") {
            return (toComparableDate(b.updated_at) - toComparableDate(a.updated_at)) || (b.score - a.score);
        }
        return (getEducationRank(b) - getEducationRank(a)) || (b.score - a.score);
    });
    return sorted;
};

const JobMatchedCandidates = () => {
    const { jobs, isLoading: jobsLoading } = useJobs();
    const { profile } = useProfile();
    const { data: pools = [] } = useTalentPools();
    const { addCandidateToPool } = useTalentPoolActions();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [selectedPoolId, setSelectedPoolId] = useState<string>("");
    const [minScore, setMinScore] = useState<number>(0);
    const [sortBy, setSortBy] = useState<SortOption>("best_match");
    const [poolActionCandidateId, setPoolActionCandidateId] = useState<string | null>(null);
    const { data: scores, isLoading: scoresLoading } = useJobCandidateScores(selectedJobId);

    useEffect(() => {
        if (jobs.length === 0) return;
        const paramJobId = searchParams.get("jobId");
        const defaultJobId = jobs[0]?.id || "";
        const targetJobId = jobs.some((job) => job.id === paramJobId) ? paramJobId! : defaultJobId;
        if (targetJobId && targetJobId !== selectedJobId) {
            setSelectedJobId(targetJobId);
        }
    }, [jobs, searchParams, selectedJobId]);

    const handleJobChange = (jobId: string) => {
        setSelectedJobId(jobId);
        setSearchParams({ jobId });
    };

    const filteredScores = useMemo(() => {
        const base = (scores || []).filter((item) => item.score >= minScore);
        return sortCandidates(base, sortBy);
    }, [scores, minScore, sortBy]);

    const recommended = useMemo(
        () => sortCandidates(scores || [], "best_match").slice(0, 3),
        [scores]
    );

    const avgScore = filteredScores.length
        ? Math.round(filteredScores.reduce((sum, s) => sum + s.score, 0) / filteredScores.length)
        : 0;

    const topTenAverage = useMemo(() => {
        if (!scores || scores.length === 0) return 0;
        const ranked = sortCandidates(scores, "best_match");
        const topCount = Math.max(1, Math.ceil(ranked.length * 0.1));
        const topRows = ranked.slice(0, topCount);
        const average = topRows.reduce((sum, row) => sum + row.score, 0) / topRows.length;
        return Math.round(average);
    }, [scores]);

    const isLoading = jobsLoading || (selectedJobId ? scoresLoading : false);
    const selectedJobTitle = jobs.find((job) => job.id === selectedJobId)?.title || "AI Matched Candidates";
    const isRecruiter = profile?.role === 'employer' || profile?.role === 'admin';

    if (!isRecruiter) return null;

    const handleAddToPool = async (candidateId: string) => {
        if (!selectedPoolId) {
            toast({
                title: "Select a Pool",
                description: "Choose a talent pool before adding candidates.",
                variant: "destructive",
            });
            return;
        }

        setPoolActionCandidateId(candidateId);
        try {
            await addCandidateToPool({ poolId: selectedPoolId, candidateId });
            toast({
                title: "Added to Pool",
                description: "Candidate was added to the selected talent pool.",
            });
        } catch (error: any) {
            toast({
                title: "Add Failed",
                description: error?.message || "Unable to add candidate to pool.",
                variant: "destructive",
            });
        } finally {
            setPoolActionCandidateId(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Page header */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                            AI Candidate Intelligence
                        </h1>
                    </div>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Smart ranking, explainable skill gaps, and shortlist-ready insights
                    </p>
                </div>

                {/* Controls */}
                <Card className="card-float border-0">
                    <CardContent className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Select job</p>
                                <Select value={selectedJobId} onValueChange={handleJobChange}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Choose a job to view candidates" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobs.map((job) => (
                                            <SelectItem key={job.id} value={job.id}>
                                                {job.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Smart sort</p>
                                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="best_match">Best Match</SelectItem>
                                        <SelectItem value="most_experienced">Most Experienced</SelectItem>
                                        <SelectItem value="recently_updated">Recently Updated</SelectItem>
                                        <SelectItem value="highest_education">Highest Education</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Minimum match</p>
                                <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Any</SelectItem>
                                        <SelectItem value="60">60%+ Strong</SelectItem>
                                        <SelectItem value="75">75%+ Shortlist</SelectItem>
                                        <SelectItem value="80">80%+ Excellent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Target pool</p>
                                <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select pool" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pools.map((pool) => (
                                            <SelectItem key={pool.id} value={pool.id}>
                                                {pool.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Stats Cards */}
                {!isLoading && scores && scores.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Briefcase className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{selectedJobTitle}</p>
                                        <p className="text-2xl font-bold text-foreground">{scores.length} Candidates</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                        <Trophy className="w-6 h-6 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Top 10% Avg Score</p>
                                        <p className="text-2xl font-bold text-foreground">{topTenAverage}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Filtered Average</p>
                                        <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recommended candidates */}
                {!isLoading && recommended.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h2 className="text-2xl font-semibold text-foreground">Recommended Candidates</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {recommended.map((candidate, index) => {
                                const tone = getMatchTone(candidate.score);
                                return (
                                    <Card key={candidate.id} className="card-float border-0">
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">#{index + 1} AI Ranked</p>
                                                    <h3 className="font-semibold text-foreground">{candidate.candidate_name || "Unknown"}</h3>
                                                </div>
                                                <div className={`px-3 py-2 rounded-xl border text-right ${tone.badge}`}>
                                                    <p className="text-2xl font-bold leading-none">{candidate.score}%</p>
                                                    <p className="text-xs mt-1">Match</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-3">{candidate.explanation}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {candidate.matched_skills.slice(0, 3).map((skill) => (
                                                    <Badge key={skill} className="bg-success/10 text-success border-success/30">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    void handleAddToPool(candidate.candidate_id);
                                                }}
                                                disabled={poolActionCandidateId === candidate.candidate_id}
                                            >
                                                {poolActionCandidateId === candidate.candidate_id ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : null}
                                                Add to Talent Pool
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Ranked List */}
                {!isLoading && filteredScores.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold text-foreground">All Ranked Candidates</h2>
                            <Badge variant="outline">{filteredScores.length} results</Badge>
                        </div>

                        <div className="space-y-4">
                            {filteredScores.map((candidate) => {
                                const tone = getMatchTone(candidate.score);
                                const matchedSet = new Set(candidate.matched_skills.map((skill) => normalizeText(skill)));
                                const requiredSkills = candidate.required_skills || [];

                                return (
                                    <Card key={candidate.id} className="card-float border-0 overflow-hidden">
                                        <CardContent className="p-6 lg:p-7 space-y-5">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-semibold text-foreground">{candidate.candidate_name || "Unknown"}</h3>
                                                    <p className="text-sm text-muted-foreground">{candidate.job_title}</p>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock3 className="w-4 h-4" />
                                                            {candidate.years_experience} yrs experience
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <GraduationCap className="w-4 h-4" />
                                                            {getEducationLabel(candidate)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={`min-w-[140px] px-5 py-4 rounded-2xl border text-center ${tone.badge}`}>
                                                    <p className="text-4xl font-bold leading-none">{candidate.score}%</p>
                                                    <p className="text-xs mt-1 uppercase tracking-wide">Match</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Insight Summary</p>
                                                <p className="text-sm text-foreground/90">{candidate.explanation}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground">Required Skills Match</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {requiredSkills.length > 0 ? requiredSkills.map((skill) => {
                                                        const matched = matchedSet.has(normalizeText(skill));
                                                        return (
                                                            <Badge
                                                                key={skill}
                                                                className={matched
                                                                    ? "bg-success/10 text-success border-success/30"
                                                                    : "bg-muted/40 text-muted-foreground border-border opacity-70"
                                                                }
                                                            >
                                                                {skill}
                                                            </Badge>
                                                        );
                                                    }) : (
                                                        <Badge className="bg-muted/40 text-muted-foreground border-border">
                                                            No required skills configured
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        void handleAddToPool(candidate.candidate_id);
                                                    }}
                                                    disabled={poolActionCandidateId === candidate.candidate_id}
                                                >
                                                    {poolActionCandidateId === candidate.candidate_id ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : null}
                                                    Add to Talent Pool
                                                </Button>
                                                {candidate.matched_skills.slice(0, 5).map((skill) => (
                                                    <Badge key={`${candidate.id}-${skill}`} className={tone.chip}>
                                                        Matched: {skill}
                                                    </Badge>
                                                ))}
                                                {candidate.missing_skills.slice(0, 3).map((skill) => (
                                                    <Badge key={`${candidate.id}-missing-${skill}`} className="bg-muted/30 text-muted-foreground border-border opacity-80">
                                                        Missing: {skill}
                                                    </Badge>
                                                ))}
                                                <Badge variant="outline" className="ml-auto">
                                                    Updated {formatUpdatedAt(candidate.updated_at)}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {!isLoading && jobs.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No jobs available</h3>
                            <p className="text-muted-foreground">
                                Post a job first, then AI-ranked candidates will appear here.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && jobs.length > 0 && (!scores || scores.length === 0) && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No matches yet</h3>
                            <p className="text-muted-foreground">
                                AI matching scores will appear here once candidates apply to this job.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* AI Disclaimer */}
                {!isLoading && scores && scores.length > 0 && (
                    <div className="p-4 bg-muted/20 rounded-xl border border-border/30">
                        <p className="text-sm text-muted-foreground text-center">
                            <strong>Note:</strong> AI scores are recommendations to help prioritize candidates.
                            All hiring decisions should be made by your team based on complete evaluations.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default JobMatchedCandidates;
