import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Loader2, CheckCircle, XCircle, Clock, User, Star, Building2 } from "lucide-react";
import { useTechnicalReviews } from "@/hooks/useTechnicalReviews";
import { useState } from "react";

const statusConfig: Record<string, { label: string; className: string }> = {
    "pending": { label: "Pending Review", className: "bg-warning/10 text-warning" },
    "approved": { label: "Approved", className: "bg-success/10 text-success" },
    "rejected": { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

interface ReviewFormState {
    score: number;
    feedback: string;
}

const TechnicalReviews = () => {
    const { reviews, isLoading, submitReview, isSubmitting } = useTechnicalReviews();
    const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
    const [formState, setFormState] = useState<ReviewFormState>({ score: 3, feedback: '' });
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    const handleSubmit = async (applicationId: string, decision: 'approved' | 'rejected') => {
        setSubmittingId(applicationId);
        try {
            await submitReview({
                applicationId,
                score: formState.score,
                feedback: formState.feedback,
                decision,
            });
            setActiveReviewId(null);
            setFormState({ score: 3, feedback: '' });
        } catch (err) {
            console.error('[TechnicalReviews] Submit error:', err);
        } finally {
            setSubmittingId(null);
        }
    };

    const pendingReviews = reviews.filter(r => r.technical_status === 'pending');
    const completedReviews = reviews.filter(r => r.technical_status && r.technical_status !== 'pending');

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Technical Reviews</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Evaluate assigned candidates and provide your expert feedback
                    </p>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && reviews.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <ClipboardCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No reviews assigned</h3>
                            <p className="text-muted-foreground">
                                When employers assign candidates for technical review, they will appear here.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Reviews */}
                {!isLoading && pendingReviews.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Pending Reviews ({pendingReviews.length})</h2>
                        {pendingReviews.map((review) => (
                            <Card key={review.id} className="card-float border-0 overflow-hidden">
                                <CardContent className="p-8 lg:p-10 space-y-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                        {/* Candidate info */}
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center flex-shrink-0">
                                                <User className="w-7 h-7 text-primary" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-semibold text-foreground">{review.candidate_name}</h3>
                                                <p className="text-muted-foreground">{review.job_title}</p>
                                                {review.organization_name && (
                                                    <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        {review.organization_name}
                                                    </p>
                                                )}
                                                <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Applied {formatDate(review.applied_at)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <Badge className={statusConfig['pending']?.className + " border-0 text-xs px-3 py-1 font-medium"}>
                                            {statusConfig['pending']?.label}
                                        </Badge>
                                    </div>

                                    {/* Review Form */}
                                    {activeReviewId === review.id ? (
                                        <div className="space-y-6 pt-4 border-t border-border/30">
                                            {/* Score */}
                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Technical Score</Label>
                                                <div className="flex items-center gap-2">
                                                    {[1, 2, 3, 4, 5].map((score) => (
                                                        <button
                                                            key={score}
                                                            onClick={() => setFormState(s => ({ ...s, score }))}
                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formState.score >= score
                                                                    ? 'bg-warning/20 text-warning'
                                                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                                                                }`}
                                                        >
                                                            <Star className={`w-5 h-5 ${formState.score >= score ? 'fill-warning' : ''}`} />
                                                        </button>
                                                    ))}
                                                    <span className="ml-4 text-lg font-semibold">{formState.score}/5</span>
                                                </div>
                                            </div>

                                            {/* Feedback */}
                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Feedback</Label>
                                                <Textarea
                                                    placeholder="Provide detailed technical feedback..."
                                                    value={formState.feedback}
                                                    onChange={(e) => setFormState(s => ({ ...s, feedback: e.target.value }))}
                                                    rows={4}
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-3 pt-2">
                                                <Button
                                                    variant="outline"
                                                    className="h-11 px-5 rounded-xl"
                                                    onClick={() => setActiveReviewId(null)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-11 px-5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleSubmit(review.id, 'rejected')}
                                                    disabled={submittingId === review.id || !formState.feedback}
                                                >
                                                    {submittingId === review.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Reject
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    className="h-11 px-5 rounded-xl shadow-lg shadow-primary/20"
                                                    onClick={() => handleSubmit(review.id, 'approved')}
                                                    disabled={submittingId === review.id || !formState.feedback}
                                                >
                                                    {submittingId === review.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Approve
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full h-12 rounded-xl"
                                            onClick={() => setActiveReviewId(review.id)}
                                        >
                                            <ClipboardCheck className="w-4 h-4 mr-2" />
                                            Start Review
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Completed Reviews */}
                {!isLoading && completedReviews.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Completed Reviews ({completedReviews.length})</h2>
                        {completedReviews.map((review) => (
                            <Card key={review.id} className="card-float border-0 overflow-hidden opacity-70">
                                <CardContent className="p-8 lg:p-10">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                                                <User className="w-7 h-7 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-semibold text-foreground">{review.candidate_name}</h3>
                                                <p className="text-muted-foreground">{review.job_title}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {review.technical_score && (
                                                <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-lg">
                                                    <Star className="w-4 h-4 text-warning fill-warning" />
                                                    <span className="font-semibold">{review.technical_score}/5</span>
                                                </div>
                                            )}
                                            <Badge className={statusConfig[review.technical_status || '']?.className + " border-0 text-xs px-3 py-1 font-medium"}>
                                                {statusConfig[review.technical_status || '']?.label || review.technical_status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default TechnicalReviews;
