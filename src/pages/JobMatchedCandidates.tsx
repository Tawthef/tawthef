import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Users, Filter, Trophy, TrendingUp, Award } from "lucide-react";
import { useJobCandidateScores, getScoreLabel } from "@/hooks/useCandidateJobScores";
import { MatchScoreCard } from "@/components/MatchScoreCard";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

// Mock job for demo - in production, this would come from route params or context
const DEMO_JOB_ID = "00000000-0000-0000-0000-000000000000";

const JobMatchedCandidates = () => {
    const { data: scores, isLoading } = useJobCandidateScores(DEMO_JOB_ID);
    const { profile } = useProfile();
    const [minScore, setMinScore] = useState<number>(0);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const isEmployer = profile?.role === 'employer' || profile?.role === 'admin';

    const filteredScores = (scores || [])
        .filter(s => s.score >= minScore)
        .sort((a, b) => sortOrder === 'desc' ? b.score - a.score : a.score - b.score);

    const excellentCount = scores?.filter(s => s.score >= 70).length || 0;
    const goodCount = scores?.filter(s => s.score >= 50 && s.score < 70).length || 0;
    const avgScore = scores?.length
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Page header */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                            AI Matched Candidates
                        </h1>
                    </div>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Candidates ranked by AI-powered job matching
                    </p>
                </div>

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
                                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                        <Trophy className="w-6 h-6 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Excellent Matches</p>
                                        <p className="text-2xl font-bold text-foreground">{excellentCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Award className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Good Matches</p>
                                        <p className="text-2xl font-bold text-foreground">{goodCount}</p>
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
                                        <p className="text-sm text-muted-foreground">Average Score</p>
                                        <p className="text-2xl font-bold text-foreground">{avgScore}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                {!isLoading && scores && scores.length > 0 && (
                    <Card className="card-float border-0">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <Filter className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">Filters:</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Min Score:</span>
                                    <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
                                        <SelectTrigger className="w-28 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Any</SelectItem>
                                            <SelectItem value="30">30+ Fair</SelectItem>
                                            <SelectItem value="50">50+ Good</SelectItem>
                                            <SelectItem value="70">70+ Excellent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Sort:</span>
                                    <Select value={sortOrder} onValueChange={(v: 'desc' | 'asc') => setSortOrder(v)}>
                                        <SelectTrigger className="w-36 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="desc">Highest First</SelectItem>
                                            <SelectItem value="asc">Lowest First</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Badge variant="outline" className="ml-auto">
                                    {filteredScores.length} candidates
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Ranked List */}
                {!isLoading && filteredScores.length > 0 && (
                    <div className="space-y-4">
                        {filteredScores.map((score, idx) => (
                            <div key={score.id} className="relative">
                                {idx < 3 && (
                                    <div className="absolute -left-4 top-6 w-8 h-8 rounded-full bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center text-warning-foreground font-bold text-sm shadow-lg z-10">
                                        #{idx + 1}
                                    </div>
                                )}
                                <MatchScoreCard score={score} showCandidate={true} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && (!scores || scores.length === 0) && (
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
