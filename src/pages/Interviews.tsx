import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Loader2, Plus, Video } from "lucide-react";
import { useInterviews } from "@/hooks/useInterviews";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

const roundConfig: Record<string, { label: string; className: string }> = {
    hr: { label: "HR", className: "bg-primary/10 text-primary" },
    technical: { label: "Technical", className: "bg-accent/10 text-accent" },
    managerial: { label: "Managerial", className: "bg-warning/10 text-warning" },
    final: { label: "Final", className: "bg-success/10 text-success" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200" },
    accepted: { label: "Accepted", className: "bg-green-100 text-green-700 border-green-200" },
    declined: { label: "Declined", className: "bg-red-100 text-red-700 border-red-200" },
    completed: { label: "Completed", className: "bg-gray-100 text-gray-700 border-gray-200" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
};

const Interviews = () => {
    const {
        interviews,
        isLoading,
        scheduleInterview,
        isScheduling,
        respondToInterview,
        isResponding,
        applicationOptions,
        interviewerOptions,
    } = useInterviews();
    const { profile } = useProfile();
    const { toast } = useToast();

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        applicationId: "",
        round: "hr",
        date: "",
        time: "",
        interviewerId: "",
        meetingLink: "",
    });

    const isCandidate = profile?.role === "candidate";
    const canSchedule = profile?.role === "employer" || profile?.role === "agency" || profile?.role === "admin";

    useEffect(() => {
        if (!scheduleForm.applicationId && applicationOptions.length > 0) {
            setScheduleForm((prev) => ({ ...prev, applicationId: applicationOptions[0].id }));
        }
    }, [applicationOptions, scheduleForm.applicationId]);

    useEffect(() => {
        if (!scheduleForm.interviewerId && interviewerOptions.length > 0) {
            setScheduleForm((prev) => ({ ...prev, interviewerId: interviewerOptions[0].id }));
        }
    }, [interviewerOptions, scheduleForm.interviewerId]);

    const interviewsWithStatus = useMemo(() => {
        return interviews.map((interview) => {
            let displayStatus = "scheduled";

            if (interview.status === "completed") {
                displayStatus = "completed";
            } else if (interview.status === "cancelled") {
                displayStatus = "declined";
            } else if (interview.candidate_response === "accepted") {
                displayStatus = "accepted";
            } else if (interview.candidate_response === "declined") {
                displayStatus = "declined";
            }

            return { ...interview, displayStatus };
        });
    }, [interviews]);

    const resetScheduleForm = () => {
        setScheduleForm({
            applicationId: applicationOptions[0]?.id || "",
            round: "hr",
            date: "",
            time: "",
            interviewerId: interviewerOptions[0]?.id || "",
            meetingLink: "",
        });
    };

    const handleScheduleInterview = async () => {
        if (!scheduleForm.applicationId || !scheduleForm.round || !scheduleForm.date || !scheduleForm.time || !scheduleForm.interviewerId) {
            toast({
                title: "Missing fields",
                description: "Please complete all required scheduling fields.",
                variant: "destructive",
            });
            return;
        }

        const scheduledAt = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
        if (Number.isNaN(scheduledAt.getTime())) {
            toast({
                title: "Invalid date/time",
                description: "Please enter a valid interview date and time.",
                variant: "destructive",
            });
            return;
        }

        try {
            await scheduleInterview({
                applicationId: scheduleForm.applicationId,
                round: scheduleForm.round,
                scheduledAt: scheduledAt.toISOString(),
                interviewerId: scheduleForm.interviewerId,
                meetingLink: scheduleForm.meetingLink || undefined,
            });

            toast({
                title: "Interview scheduled",
                description: "The interview was scheduled and notifications were sent.",
            });

            setIsScheduleModalOpen(false);
            resetScheduleForm();
        } catch (error: any) {
            toast({
                title: "Scheduling failed",
                description: error?.message || "Could not schedule this interview.",
                variant: "destructive",
            });
        }
    };

    const handleCandidateResponse = async (interviewId: string, response: "accepted" | "declined") => {
        try {
            await respondToInterview({ interviewId, response });
            toast({
                title: response === "accepted" ? "Interview accepted" : "Interview declined",
                description: "Your response has been saved.",
            });
        } catch (err) {
            console.error("[Interviews] Candidate response error:", err);
            toast({
                title: "Action failed",
                description: "Could not update your interview response.",
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Interviews</h1>
                        <p className="text-xl text-muted-foreground font-light max-w-2xl">
                            {isCandidate
                                ? "Review your interview schedule and respond to upcoming interviews."
                                : "Schedule and track candidate interviews."}
                        </p>
                    </div>

                    {canSchedule && (
                        <Button onClick={() => setIsScheduleModalOpen(true)} className="h-11 px-6 rounded-xl">
                            <Plus className="w-4 h-4 mr-2" />
                            Schedule Interview
                        </Button>
                    )}
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {!isLoading && interviews.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-14 text-center">
                            <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No interviews yet</h3>
                            <p className="text-muted-foreground">Interviews will appear here once they are scheduled.</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && interviewsWithStatus.length > 0 && (
                    <Card className="border-0 card-float">
                        <CardHeader>
                            <CardTitle className="text-xl">Interview Schedule</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Job</TableHead>
                                        <TableHead>Round</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {interviewsWithStatus.map((interview) => {
                                        const dateTime = formatDateTime(interview.scheduled_at);
                                        const round = roundConfig[interview.round] || { label: interview.round, className: "bg-muted text-muted-foreground" };
                                        const status = statusConfig[interview.displayStatus] || statusConfig.scheduled;
                                        const canRespond =
                                            isCandidate &&
                                            interview.status === "scheduled" &&
                                            interview.candidate_response !== "accepted" &&
                                            interview.candidate_response !== "declined";

                                        return (
                                            <TableRow key={interview.id}>
                                                <TableCell className="font-medium">
                                                    {isCandidate ? (profile?.full_name || "You") : (interview.candidate_name || "Unknown")}
                                                </TableCell>
                                                <TableCell>{interview.job_title || "Unknown role"}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${round.className} border`}>{round.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                            {dateTime.date}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {dateTime.time}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${status.className} border`}>{status.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canRespond ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                                                    disabled={isResponding}
                                                                    onClick={() => handleCandidateResponse(interview.id, "declined")}
                                                                >
                                                                    Decline
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    disabled={isResponding}
                                                                    onClick={() => handleCandidateResponse(interview.id, "accepted")}
                                                                >
                                                                    Accept
                                                                </Button>
                                                            </>
                                                        ) : interview.meeting_link ? (
                                                            <Button size="sm" variant="outline" asChild>
                                                                <a href={interview.meeting_link} target="_blank" rel="noreferrer">
                                                                    Open Link
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>Schedule Interview</DialogTitle>
                        <DialogDescription>
                            Set interview details and notify the candidate and interviewer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label>Candidate / Job</Label>
                            <Select
                                value={scheduleForm.applicationId}
                                onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, applicationId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select candidate and job" />
                                </SelectTrigger>
                                <SelectContent>
                                    {applicationOptions.map((application) => (
                                        <SelectItem key={application.id} value={application.id}>
                                            {application.candidate_name} - {application.job_title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Round</Label>
                                <Select
                                    value={scheduleForm.round}
                                    onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, round: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select round" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="managerial">Managerial</SelectItem>
                                        <SelectItem value="final">Final</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Interviewer</Label>
                                <Select
                                    value={scheduleForm.interviewerId}
                                    onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, interviewerId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select interviewer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {interviewerOptions.map((interviewer) => (
                                            <SelectItem key={interviewer.id} value={interviewer.id}>
                                                {interviewer.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={scheduleForm.date}
                                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, date: event.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input
                                    type="time"
                                    value={scheduleForm.time}
                                    onChange={(event) => setScheduleForm((prev) => ({ ...prev, time: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Meeting link (optional)</Label>
                            <Input
                                type="url"
                                placeholder="https://meet.google.com/..."
                                value={scheduleForm.meetingLink}
                                onChange={(event) => setScheduleForm((prev) => ({ ...prev, meetingLink: event.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleScheduleInterview} disabled={isScheduling}>
                            {isScheduling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default Interviews;
