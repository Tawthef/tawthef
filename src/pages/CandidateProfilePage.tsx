import DashboardLayout from "@/components/layout/DashboardLayout";
import CandidateTimeline from "@/components/CandidateTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCandidateProfileDetailsForRecruiter, useTalentPoolActions, useTalentPools } from "@/hooks/useTalentPools";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, ExternalLink, Loader2, MapPin, Sparkles, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";

const scoreClass = (score: number) => {
  if (score >= 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const CandidateProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const { profile } = useProfile();
  const { toast } = useToast();

  const { data: pools = [] } = useTalentPools();
  const { data: candidate, isLoading } = useCandidateProfileDetailsForRecruiter(candidateId || null, profile?.role);
  const { addCandidateToPool, isAddingCandidate } = useTalentPoolActions();

  const [targetPoolId, setTargetPoolId] = useState("");

  const isRecruiter = useMemo(
    () => ["employer", "agency", "admin"].includes(profile?.role || ""),
    [profile?.role]
  );
  const applicationIdFromQuery = searchParams.get("applicationId");

  const { data: latestApplicationId } = useQuery({
    queryKey: ["candidate-latest-application", candidateId, profile?.role, profile?.organization_id],
    queryFn: async (): Promise<string | null> => {
      if (!candidateId) return null;

      let queryBuilder = supabase
        .from("applications")
        .select("id, applied_at, jobs!inner(organization_id)")
        .eq("candidate_id", candidateId)
        .order("applied_at", { ascending: false })
        .limit(1);

      if (profile?.role !== "admin" && profile?.organization_id) {
        queryBuilder = queryBuilder.eq("jobs.organization_id", profile.organization_id);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        console.error("[CandidateProfilePage] Latest application error:", error);
        return null;
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row?.id || null;
    },
    enabled: isRecruiter && !!candidateId && !applicationIdFromQuery,
    staleTime: 60 * 1000,
  });

  const timelineApplicationId = applicationIdFromQuery || latestApplicationId || null;

  if (!isRecruiter) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAddToPool = async () => {
    if (!candidateId || !targetPoolId) return;
    try {
      await addCandidateToPool({ poolId: targetPoolId, candidateId });
      toast({
        title: "Added to pool",
        description: "Candidate has been added to the selected talent pool.",
      });
    } catch (error: any) {
      toast({
        title: "Add failed",
        description: error?.message || "Could not add candidate to this pool.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="w-fit px-0">
              <Link to="/dashboard/candidates">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Candidates
              </Link>
            </Button>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Candidate Profile</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : candidate ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 card-float">
                <CardContent className="p-6 lg:p-7 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{candidate.fullName}</h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4" />
                          {candidate.yearsExperience} years experience
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          Candidate
                        </span>
                      </div>
                    </div>
                    <Badge className={`border ${scoreClass(candidate.aiMatchScore)}`}>
                      {candidate.aiMatchScore}% Match
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.length > 0 ? (
                        candidate.skills.map((skill) => (
                          <Badge key={`${candidate.candidateId}-${skill}`} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No skills listed</Badge>
                      )}
                    </div>
                  </div>

                  {candidate.resumeUrl ? (
                    <div>
                      <Button asChild variant="outline">
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Resume
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-0 card-float">
                <CardHeader>
                  <CardTitle className="text-lg">Hiring Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <CandidateTimeline applicationId={timelineApplicationId} />
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 card-float">
              <CardHeader>
                <CardTitle className="text-lg">Talent Pool Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Target Pool</Label>
                  <Select value={targetPoolId} onValueChange={setTargetPoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select talent pool" />
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

                <Button
                  className="w-full"
                  onClick={() => {
                    void handleAddToPool();
                  }}
                  disabled={!targetPoolId || isAddingCandidate}
                >
                  {isAddingCandidate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add to Talent Pool
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard/talent-pools">
                    <Users className="w-4 h-4 mr-2" />
                    Open Talent Pools
                  </Link>
                </Button>

                <p className="text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Organize this candidate in reusable shortlists for faster outreach.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-14 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Candidate not found</h3>
              <p className="text-muted-foreground mt-1">This candidate could not be loaded or is not accessible.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CandidateProfilePage;
