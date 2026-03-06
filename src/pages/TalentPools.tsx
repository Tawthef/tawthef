import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  TalentPool,
  useRecruiterCandidateDirectory,
  useTalentPoolActions,
  useTalentPoolCandidates,
  useTalentPools,
} from "@/hooks/useTalentPools";
import { useJobs } from "@/hooks/useJobs";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  PencilLine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const scoreClass = (score: number) => {
  if (score >= 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const TalentPools = () => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { jobs } = useJobs();
  const { data: pools = [], isLoading: isPoolsLoading } = useTalentPools();
  const { data: recruiterCandidates = [] } = useRecruiterCandidateDirectory(profile?.role);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const { data: poolCandidates = [], isLoading: isPoolCandidatesLoading } = useTalentPoolCandidates(selectedPoolId);
  const {
    createPool,
    isCreatingPool,
    renamePool,
    isRenamingPool,
    deletePool,
    isDeletingPool,
    addCandidateToPool,
    isAddingCandidate,
    removeCandidateFromPool,
    isRemovingCandidate,
  } = useTalentPoolActions();

  const [newPoolName, setNewPoolName] = useState("");
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedCandidateToAdd, setSelectedCandidateToAdd] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) || null,
    [pools, selectedPoolId]
  );

  const openJobs = useMemo(() => jobs.filter((job) => job.status === "open"), [jobs]);

  useEffect(() => {
    if (!selectedPoolId && pools.length > 0) {
      setSelectedPoolId(pools[0].id);
      return;
    }

    if (selectedPoolId && !pools.some((pool) => pool.id === selectedPoolId)) {
      setSelectedPoolId(pools[0]?.id || null);
    }
  }, [pools, selectedPoolId]);

  const handleCreatePool = async () => {
    const poolName = newPoolName.trim();
    if (!poolName) return;

    try {
      const createdPoolId = await createPool(poolName);
      setNewPoolName("");
      setSelectedPoolId(createdPoolId);
      toast({
        title: "Pool created",
        description: `“${poolName}” is ready.`,
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Could not create pool.",
        variant: "destructive",
      });
    }
  };

  const beginRename = (pool: TalentPool) => {
    setEditingPoolId(pool.id);
    setRenameValue(pool.name);
  };

  const handleRenamePool = async (poolId: string) => {
    const targetName = renameValue.trim();
    if (!targetName) return;

    try {
      await renamePool({ poolId, name: targetName });
      setEditingPoolId(null);
      setRenameValue("");
      toast({
        title: "Pool renamed",
        description: "Pool name updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Rename failed",
        description: error?.message || "Could not rename this pool.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePool = async (poolId: string, name: string) => {
    const confirmed = window.confirm(`Delete pool "${name}"? This will remove all candidates from it.`);
    if (!confirmed) return;

    try {
      await deletePool(poolId);
      toast({
        title: "Pool deleted",
        description: `"${name}" has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete this pool.",
        variant: "destructive",
      });
    }
  };

  const handleAddCandidateToPool = async () => {
    if (!selectedPoolId || !selectedCandidateToAdd) return;

    if (poolCandidates.some((item) => item.candidateId === selectedCandidateToAdd)) {
      toast({
        title: "Already in pool",
        description: "This candidate is already in the selected pool.",
      });
      return;
    }

    try {
      await addCandidateToPool({
        poolId: selectedPoolId,
        candidateId: selectedCandidateToAdd,
      });
      setSelectedCandidateToAdd("");
      toast({
        title: "Candidate added",
        description: "Candidate was added to the pool.",
      });
    } catch (error: any) {
      toast({
        title: "Add failed",
        description: error?.message || "Could not add candidate to pool.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCandidateFromPool = async (candidateId: string) => {
    if (!selectedPoolId) return;
    setCandidateActionId(candidateId);
    try {
      await removeCandidateFromPool({ poolId: selectedPoolId, candidateId });
      toast({
        title: "Candidate removed",
        description: "Candidate was removed from this pool.",
      });
    } catch (error: any) {
      toast({
        title: "Remove failed",
        description: error?.message || "Could not remove candidate.",
        variant: "destructive",
      });
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleInviteCandidate = async (candidateId: string) => {
    if (!selectedJobId) {
      toast({
        title: "Select job",
        description: "Choose an open job to invite this candidate.",
        variant: "destructive",
      });
      return;
    }

    setCandidateActionId(candidateId);
    try {
      const { data, error } = await supabase.rpc("invite_candidate_to_job", {
        p_candidate_id: candidateId,
        p_job_id: selectedJobId,
      });

      if (error) throw new Error(error.message || "Could not invite candidate.");

      const row = Array.isArray(data) ? data[0] : data;
      toast({
        title: row?.created ? "Candidate invited" : "Already invited",
        description: row?.created
          ? "Candidate application was created for this job."
          : "Candidate already has an application for this job.",
      });

      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
    } catch (error: any) {
      toast({
        title: "Invite failed",
        description: error?.message || "Could not invite candidate to job.",
        variant: "destructive",
      });
    } finally {
      setCandidateActionId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Talent Pools</h1>
          <p className="text-muted-foreground">
            Organize candidates into reusable pools and invite them to jobs faster.
          </p>
        </div>

        <Card className="border-0 card-float">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[72vh]">
              <div className="border-r border-border/40">
                <CardHeader className="space-y-4">
                  <CardTitle className="text-lg">Pools</CardTitle>
                  <div className="space-y-2">
                    <Label htmlFor="new-pool-name" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Create New Pool
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-pool-name"
                        value={newPoolName}
                        onChange={(event) => setNewPoolName(event.target.value)}
                        placeholder="e.g. Frontend Shortlist"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleCreatePool();
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          void handleCreatePool();
                        }}
                        disabled={isCreatingPool || !newPoolName.trim()}
                      >
                        {isCreatingPool ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />

                <ScrollArea className="h-[58vh] lg:h-[62vh]">
                  <div className="p-2 space-y-2">
                    {isPoolsLoading ? (
                      <div className="h-40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : pools.length > 0 ? (
                      pools.map((pool) => (
                        <div
                          key={pool.id}
                          className={cn(
                            "rounded-lg border px-3 py-3 transition-colors",
                            selectedPoolId === pool.id
                              ? "bg-primary/8 border-primary/30"
                              : "bg-transparent border-transparent hover:bg-muted/40"
                          )}
                        >
                          {editingPoolId === pool.id ? (
                            <div className="space-y-2">
                              <Input
                                value={renameValue}
                                onChange={(event) => setRenameValue(event.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    void handleRenamePool(pool.id);
                                  }}
                                  disabled={isRenamingPool || !renameValue.trim()}
                                >
                                  {isRenamingPool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPoolId(null);
                                    setRenameValue("");
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setSelectedPoolId(pool.id)}
                              >
                                <p className="text-sm font-semibold truncate">{pool.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pool.candidateCount} candidate{pool.candidateCount === 1 ? "" : "s"}
                                </p>
                              </button>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => beginRename(pool)}>
                                  <PencilLine className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    void handleDeletePool(pool.id, pool.name);
                                  }}
                                  disabled={isDeletingPool}
                                >
                                  {isDeletingPool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="h-44 px-4 flex flex-col items-center justify-center text-center">
                        <Users className="w-9 h-9 text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No pools yet. Create your first pool.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col min-h-[72vh]">
                {selectedPool ? (
                  <>
                    <div className="p-5 border-b border-border/40 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Selected Pool</p>
                          <h2 className="text-xl font-semibold">{selectedPool.name}</h2>
                        </div>
                        <Badge variant="outline">
                          {poolCandidates.length} candidate{poolCandidates.length === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Add Candidate</Label>
                          <div className="flex gap-2">
                            <Select value={selectedCandidateToAdd} onValueChange={setSelectedCandidateToAdd}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select candidate" />
                              </SelectTrigger>
                              <SelectContent>
                                {recruiterCandidates.map((candidate) => (
                                  <SelectItem key={candidate.candidateId} value={candidate.candidateId}>
                                    {candidate.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => {
                                void handleAddCandidateToPool();
                              }}
                              disabled={!selectedCandidateToAdd || isAddingCandidate}
                            >
                              {isAddingCandidate ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Invite to Job</Label>
                          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select open job for invite" />
                            </SelectTrigger>
                            <SelectContent>
                              {openJobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                  {job.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 h-[50vh] lg:h-[56vh] p-5">
                      {isPoolCandidatesLoading ? (
                        <div className="h-40 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : poolCandidates.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {poolCandidates.map((candidate) => {
                            const isBusy = candidateActionId === candidate.candidateId;
                            return (
                              <Card key={candidate.id} className="border border-border/60">
                                <CardContent className="p-5 space-y-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h3 className="font-semibold">{candidate.fullName}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {candidate.yearsExperience} years experience
                                      </p>
                                    </div>
                                    <Badge className={`border ${scoreClass(candidate.aiMatchScore)}`}>
                                      {candidate.aiMatchScore}% Match
                                    </Badge>
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {candidate.skills.length > 0 ? (
                                        candidate.skills.slice(0, 8).map((skill) => (
                                          <Badge key={`${candidate.candidateId}-${skill}`} variant="outline">
                                            {skill}
                                          </Badge>
                                        ))
                                      ) : (
                                        <Badge variant="outline">No skills listed</Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        void handleRemoveCandidateFromPool(candidate.candidateId);
                                      }}
                                      disabled={isBusy || isRemovingCandidate}
                                    >
                                      {isBusy && isRemovingCandidate ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      ) : (
                                        <UserMinus className="w-4 h-4 mr-2" />
                                      )}
                                      Remove
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        void handleInviteCandidate(candidate.candidateId);
                                      }}
                                      disabled={isBusy}
                                    >
                                      {isBusy && !isRemovingCandidate ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                      )}
                                      Invite to Job
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-52 flex flex-col items-center justify-center text-center">
                          <Users className="w-10 h-10 text-muted-foreground/40 mb-2" />
                          <h3 className="font-semibold">Pool is empty</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Add candidates from the selector above or from Resume Search and AI ranking pages.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <Users className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <h3 className="font-semibold">Select or create a pool</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start by creating a pool in the left panel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TalentPools;
