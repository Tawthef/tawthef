import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Briefcase, TrendingUp, Target } from "lucide-react";
import { useCandidateScores, getScoreLabel } from "@/hooks/useCandidateJobScores";
import { MatchScoreCard } from "@/components/MatchScoreCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MyJobMatches = () => {
    const { data: scores, isLoading } = useCandidateScores();

    const excellentMatches = scores?.filter(s => s.score >= 70) || [];
    const goodMatches = scores?.filter(s => s.score >= 50 && s.score < 70) || [];
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
                            Job Matches
                        </h1>
                    </div>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        See how well you match with available jobs
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
                                        <Target className="w-6 h-6 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Excellent Matches</p>
                                        <p className="text-2xl font-bold text-foreground">{excellentMatches.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Briefcase className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Good Matches</p>
                                        <p className="text-2xl font-bold text-foreground">{goodMatches.length}</p>
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

                {/* Top Matches */}
                {!isLoading && excellentMatches.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-success" />
                            Top Matches for You
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {excellentMatches.slice(0, 4).map((score) => (
                                <Card key={score.id} className="card-float border-0 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-foreground">{score.job_title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{score.explanation}</p>
                                            </div>
                                            <Badge className="bg-success/10 text-success border-0 text-lg px-3 py-1">
                                                {score.score}
                                            </Badge>
                                        </div>

                                        {/* Matched skills */}
                                        {score.breakdown.matched_skills?.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-1.5">
                                                {score.breakdown.matched_skills.slice(0, 5).map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="text-xs">
                                                        ✓ {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Matches */}
                {!isLoading && scores && scores.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">All Job Matches</h2>
                        <div className="space-y-4">
                            {scores.map((score) => (
                                <MatchScoreCard
                                    key={score.id}
                                    score={score}
                                    showCandidate={false}
                                    showJob={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && (!scores || scores.length === 0) && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No matches yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Complete your profile with skills and experience to see AI-powered job matches.
                            </p>
                            <Link to="/dashboard/profile">
                                <Button className="shadow-lg shadow-primary/20">
                                    Complete Profile
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Improve matches tip */}
                {!isLoading && scores && scores.length > 0 && avgScore < 50 && (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">Improve your matches</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Add more skills and keywords to your profile to get better job matches.
                                    </p>
                                    <Link to="/dashboard/profile">
                                        <Button variant="link" className="p-0 h-auto mt-2">
                                            Update profile →
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MyJobMatches;
