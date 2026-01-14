import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Loader2, TrendingUp, Users, Filter } from "lucide-react";
import { useApplicationScores } from "@/hooks/useApplicationScores";
import { useProfile } from "@/hooks/useProfile";
import { ScoreBreakdownCard } from "@/components/ScoreBreakdownCard";
import { useState } from "react";

const RankedCandidates = () => {
    const { scores, isLoading } = useApplicationScores();
    const { profile } = useProfile();
    const [minScore, setMinScore] = useState<number>(0);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const isEmployer = profile?.role === 'employer';
    const isAgency = profile?.role === 'agency';
    const isAdmin = profile?.role === 'admin';

    const filteredScores = scores
        .filter(s => s.score >= minScore)
        .sort((a, b) => sortOrder === 'desc' ? b.score - a.score : a.score - b.score);

    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    const topCandidates = scores.filter(s => s.score >= 75).length;

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                        {isAgency ? "Submission Rankings" : "Candidate Rankings"}
                    </h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        {isAgency
                            ? "See how your submitted candidates compare"
                            : "AI-assisted candidate scoring with explainable breakdowns"
                        }
                    </p>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Stats Cards */}
                {!isLoading && (isEmployer || isAdmin) && scores.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Scored</p>
                                        <p className="text-2xl font-bold text-foreground">{scores.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                        <Award className="w-6 h-6 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Top Candidates (75+)</p>
                                        <p className="text-2xl font-bold text-foreground">{topCandidates}</p>
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
                {!isLoading && scores.length > 0 && (
                    <Card className="card-float border-0">
                        <CardContent className="p-6">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <Filter className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">Filters:</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">Min Score:</Label>
                                    <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
                                        <SelectTrigger className="w-24 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Any</SelectItem>
                                            <SelectItem value="25">25+</SelectItem>
                                            <SelectItem value="50">50+</SelectItem>
                                            <SelectItem value="75">75+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">Sort:</Label>
                                    <Select value={sortOrder} onValueChange={(v: 'desc' | 'asc') => setSortOrder(v)}>
                                        <SelectTrigger className="w-32 h-9">
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
                        {filteredScores.map((scoreData, idx) => (
                            <div key={scoreData.id} className="relative">
                                {idx < 3 && (
                                    <div className="absolute -left-4 top-6 w-8 h-8 rounded-full bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center text-warning-foreground font-bold text-sm shadow-lg">
                                        #{idx + 1}
                                    </div>
                                )}
                                <ScoreBreakdownCard
                                    score={scoreData.score}
                                    breakdown={scoreData.breakdown}
                                    candidateName={scoreData.candidate_name || 'Unknown'}
                                    jobTitle={scoreData.job_title}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && scores.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No scores yet</h3>
                            <p className="text-muted-foreground">
                                Candidate scores will appear here once applications are evaluated.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Disclaimer */}
                {!isLoading && scores.length > 0 && (
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

export default RankedCandidates;
