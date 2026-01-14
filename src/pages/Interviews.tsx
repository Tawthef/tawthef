import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Loader2, CheckCircle, XCircle, Video } from "lucide-react";
import { useInterviews } from "@/hooks/useInterviews";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

const roundConfig: Record<string, { label: string; className: string }> = {
    hr: { label: "HR", className: "bg-primary/10 text-primary" },
    technical: { label: "Technical", className: "bg-accent/10 text-accent" },
    managerial: { label: "Managerial", className: "bg-warning/10 text-warning" },
    final: { label: "Final", className: "bg-success/10 text-success" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary" },
    completed: { label: "Completed", className: "bg-success/10 text-success" },
    cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
};

const Interviews = () => {
    const { interviews, isLoading, submitFeedback, isSubmittingFeedback } = useInterviews();
    const { profile } = useProfile();
    const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    const isInterviewer = profile?.role === 'employer' || interviews.some(i => i.interviewer_id === profile?.id);

    const handleSubmitFeedback = async (interviewId: string, status: 'completed' | 'cancelled') => {
        setSubmittingId(interviewId);
        try {
            await submitFeedback({ interviewId, feedback, status });
            setActiveInterviewId(null);
            setFeedback('');
        } catch (err) {
            console.error('[Interviews] Submit error:', err);
        } finally {
            setSubmittingId(null);
        }
    };

    const pendingInterviews = interviews.filter(i => i.status === 'scheduled');
    const completedInterviews = interviews.filter(i => i.status === 'completed');

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Interviews</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        Manage scheduled interviews and submit feedback
                    </p>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && interviews.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No interviews scheduled</h3>
                            <p className="text-muted-foreground">
                                Interviews will appear here when they are scheduled.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Interviews */}
                {!isLoading && pendingInterviews.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Upcoming ({pendingInterviews.length})</h2>
                        {pendingInterviews.map((interview) => {
                            const { date, time } = formatDateTime(interview.scheduled_at);
                            return (
                                <Card key={interview.id} className="card-float border-0 overflow-hidden">
                                    <CardContent className="p-8 lg:p-10 space-y-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                            {/* Interview info */}
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center flex-shrink-0">
                                                    <Video className="w-7 h-7 text-primary" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h3 className="text-lg font-semibold text-foreground">{interview.candidate_name}</h3>
                                                        <Badge className={roundConfig[interview.round]?.className + " border-0 text-xs px-3 py-1"}>
                                                            {roundConfig[interview.round]?.label}
                                                        </Badge>
                                                        <Badge className={statusConfig[interview.status]?.className + " border-0 text-xs px-3 py-1"}>
                                                            {statusConfig[interview.status]?.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-muted-foreground">{interview.job_title}</p>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground/60">
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4" />
                                                            {date}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4" />
                                                            {time}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Feedback Form */}
                                        {isInterviewer && activeInterviewId === interview.id ? (
                                            <div className="space-y-4 pt-4 border-t border-border/30">
                                                <div className="space-y-2">
                                                    <Label>Interview Feedback</Label>
                                                    <Textarea
                                                        placeholder="Provide detailed feedback about the interview..."
                                                        value={feedback}
                                                        onChange={(e) => setFeedback(e.target.value)}
                                                        rows={4}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button variant="outline" onClick={() => setActiveInterviewId(null)}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleSubmitFeedback(interview.id, 'cancelled')}
                                                        disabled={submittingId === interview.id}
                                                    >
                                                        {submittingId === interview.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                                        Mark Cancelled
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleSubmitFeedback(interview.id, 'completed')}
                                                        disabled={submittingId === interview.id || !feedback}
                                                    >
                                                        {submittingId === interview.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                        Complete Interview
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : isInterviewer ? (
                                            <Button className="w-full" onClick={() => setActiveInterviewId(interview.id)}>
                                                Submit Feedback
                                            </Button>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Completed Interviews */}
                {!isLoading && completedInterviews.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Completed ({completedInterviews.length})</h2>
                        {completedInterviews.map((interview) => {
                            const { date, time } = formatDateTime(interview.scheduled_at);
                            return (
                                <Card key={interview.id} className="card-float border-0 overflow-hidden opacity-70">
                                    <CardContent className="p-8 lg:p-10">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle className="w-7 h-7 text-success" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-semibold text-foreground">{interview.candidate_name}</h3>
                                                    <p className="text-muted-foreground">{interview.job_title}</p>
                                                    <p className="text-sm text-muted-foreground/60">{date} at {time}</p>
                                                </div>
                                            </div>
                                            <Badge className={roundConfig[interview.round]?.className + " border-0"}>
                                                {roundConfig[interview.round]?.label}
                                            </Badge>
                                        </div>
                                        {interview.feedback && (
                                            <div className="mt-4 pt-4 border-t border-border/30">
                                                <p className="text-sm text-muted-foreground">{interview.feedback}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Interviews;
