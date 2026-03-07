import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useJobs } from "@/hooks/useJobs";
import { useResumeSearch } from "@/hooks/useResumeSearch";
import { useTalentPoolActions, useTalentPools } from "@/hooks/useTalentPools";
import { supabase } from "@/lib/supabase";
import { Briefcase, ChevronLeft, ChevronRight, Loader2, Search, Sparkles, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;

const scoreClass = (score: number) => {
  if (score > 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const parseCommaSeparated = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const ResumeSearch = () => {
  const { profile } = useProfile();
  const { jobs } = useJobs();
  const { data: pools = [] } = useTalentPools();
  const { addCandidateToPool } = useTalentPoolActions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [skillsInput, setSkillsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [minExpInput, setMinExpInput] = useState(0);
  const [filters, setFilters] = useState({
    skills: [] as string[],
    keywords: [] as string[],
    minExperience: 0,
  });

  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [actionCandidateId, setActionCandidateId] = useState<string | null>(null);

  const { data: candidates = [], isLoading } = useResumeSearch(filters);

  const availableJobs = useMemo(
    () => jobs.filter((job) => job.status === "open"),
    [jobs]
  );

  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const paginatedCandidates = useMemo(
    () => candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [candidates, page]
  );

  const runSearch = () => {
    setFilters({
      skills: parseCommaSeparated(skillsInput),
      keywords: parseCommaSeparated(keywordsInput),
      minExperience: minExpInput,
    });
    setPage(1);
  };

  const inviteCandidate = async (candidateId: string) => {
    if (!selectedJobId) {
      toast({
        title: "Select a Job",
        description: "Choose a target job before inviting candidates.",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase.rpc("invite_candidate_to_job", {
      p_candidate_id: candidateId,
      p_job_id: selectedJobId,
    });

    if (error) {
      throw new Error(error.message || "Failed to invite candidate.");
    }

    const row = Array.isArray(data) ? data[0] : data;
    return row || null;
  };

  const handleInvite = async (candidateId: string) => {
    setActionCandidateId(candidateId);
    try {
      const result = await inviteCandidate(candidateId);
      if (!result) return;

      toast({
        title: result.created ? "Candidate Invited" : "Already Invited",
        description: result.created
          ? "Candidate application has been created for this job."
          : "This candidate already has an application for the selected job.",
      });

      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
    } catch (error: any) {
      toast({
        title: "Invite Failed",
        description: error?.message || "Unable to invite candidate.",
        variant: "destructive",
      });
    } finally {
      setActionCandidateId(null);
    }
  };

  const handleShortlist = async (candidateId: string) => {
    setActionCandidateId(candidateId);
    try {
      const result = await inviteCandidate(candidateId);
      if (!result?.application_id) {
        throw new Error("No application found for shortlist.");
      }

      const targetStatus = profile?.role === "agency" ? "agency_shortlisted" : "hr_shortlisted";
      const { error } = await supabase.rpc("update_application_status", {
        p_app_id: result.application_id,
        p_new_status: targetStatus,
      });

      if (error) throw new Error(error.message || "Failed to shortlist candidate.");

      toast({
        title: "Candidate Shortlisted",
        description: `Application moved to ${targetStatus.replace("_", " ")}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-report"] });
    } catch (error: any) {
      toast({
        title: "Shortlist Failed",
        description: error?.message || "Unable to shortlist candidate.",
        variant: "destructive",
      });
    } finally {
      setActionCandidateId(null);
    }
  };

  const handleViewProfile = (resumeUrl: string | null) => {
    if (resumeUrl) {
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleAddToPool = async (candidateId: string) => {
    if (!selectedPoolId) {
      toast({
        title: "Select a Pool",
        description: "Choose a talent pool before adding candidates.",
        variant: "destructive",
      });
      return;
    }

    setActionCandidateId(candidateId);
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
      setActionCandidateId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Resume Search</h1>
          <p className="text-muted-foreground">
            Search candidate CVs by skills, keywords, and experience.
          </p>
        </div>

        <Card className="card-float border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Skills (comma separated)</Label>
                <Input
                  placeholder="React, TypeScript, Node.js"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Keywords (comma separated)</Label>
                <Input
                  placeholder="frontend, graphql, leadership"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Job (for invite/shortlist)</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an open job" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Talent Pool (for add)</Label>
                <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a talent pool" />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Minimum Experience</Label>
                <span className="text-sm text-muted-foreground">{minExpInput} years</span>
              </div>
              <Slider
                value={[minExpInput]}
                min={0}
                max={20}
                step={1}
                onValueChange={(values) => setMinExpInput(values[0] || 0)}
              />
            </div>

            <Button onClick={runSearch} className="shadow-lg shadow-primary/20">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {candidates.length} result{candidates.length === 1 ? "" : "s"} (max 50)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Badge variant="outline">
              Page {page} / {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : paginatedCandidates.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {paginatedCandidates.map((candidate) => {
              const isBusy = actionCandidateId === candidate.candidate_id;
              return (
                <Card key={candidate.candidate_id} className="card-float border-0">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{candidate.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {candidate.years_experience} years experience
                        </p>
                      </div>
                      <Badge className={`border ${scoreClass(candidate.match_score)}`}>
                        {candidate.match_score}% Match
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 8).map((skill) => (
                          <Badge key={`${candidate.candidate_id}-${skill}`} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills Matched</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.matched_skills.length > 0 ? (
                            candidate.matched_skills.slice(0, 6).map((skill) => (
                              <Badge key={`m-${candidate.candidate_id}-${skill}`} className="bg-success/10 text-success border-success/30">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">No specific matches</Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills Missing</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.missing_skills.length > 0 ? (
                            candidate.missing_skills.slice(0, 6).map((skill) => (
                              <Badge key={`x-${candidate.candidate_id}-${skill}`} className="bg-muted/50 text-muted-foreground border-border">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/30">None</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/candidates/${candidate.candidate_id}`)}
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(candidate.resume_url)}
                      >
                        View Resume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShortlist(candidate.candidate_id)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Shortlist"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToPool(candidate.candidate_id)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Talent Pool"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleInvite(candidate.candidate_id)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite to Job
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-16 text-center">
              <Sparkles className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-semibold text-foreground">No candidates found</h3>
              <p className="text-muted-foreground mt-2">
                Adjust filters and run search to find matching resumes.
              </p>
            </CardContent>
          </Card>
        )}

        {availableJobs.length === 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-sm text-warning flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              No open jobs found for your recruiter account. Create/open a job to enable invite and shortlist actions.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResumeSearch;
