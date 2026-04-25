import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

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
  const [selectedJobId, setSelectedJobId] = useState("");
  const { data: poolCandidates = [], isLoading: isPoolCandidatesLoading } = useTalentPoolCandidates(selectedPoolId, selectedJobId || null);
  const {
    createPool, isCreatingPool,
    renamePool, isRenamingPool,
    deletePool, isDeletingPool,
    addCandidateToPool, isAddingCandidate,
    removeCandidateFromPool, isRemovingCandidate,
  } = useTalentPoolActions();

  const [newPoolName, setNewPoolName] = useState("");
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedCandidateToAdd, setSelectedCandidateToAdd] = useState("");
  const [candidateComboOpen, setCandidateComboOpen] = useState(false);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);
  const [isInvitingAll, setIsInvitingAll] = useState(false);

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) || null,
    [pools, selectedPoolId]
  );

  const openJobs = useMemo(() => jobs.filter((job) => job.status === "open"), [jobs]);

  const selectedCandidateName = useMemo(
    () => recruiterCandidates.find((c) => c.candidateId === selectedCandidateToAdd)?.fullName || "",
    [recruiterCandidates, selectedCandidateToAdd]
  );

  // Auto-select first pool
  useMemo(() => {
    if (!selectedPoolId && pools.length > 0) setSelectedPoolId(pools[0].id);
    if (selectedPoolId && !pools.some((p) => p.id === selectedPoolId)) setSelectedPoolId(pools[0]?.id || null);
  }, [pools, selectedPoolId]);

  const handleCreatePool = async () => {
    const poolName = newPoolName.trim();
    if (!poolName) return;
    try {
      const id = await createPool(poolName);
      setNewPoolName("");
      setSelectedPoolId(id);
      toast({ title: "Pool created", description: `"${poolName}" is ready.` });
    } catch (error: any) {
      toast({ title: "Create failed", description: error?.message || "Could not create pool.", variant: "destructive" });
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
      toast({ title: "Pool renamed" });
    } catch (error: any) {
      toast({ title: "Rename failed", description: error?.message, variant: "destructive" });
    }
  };

  const handleDeletePool = async (poolId: string, name: string) => {
    if (!window.confirm(`Delete pool "${name}"? This will remove all candidates from it.`)) return;
    try {
      await deletePool(poolId);
      toast({ title: "Pool deleted", description: `"${name}" has been removed.` });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message, variant: "destructive" });
    }
  };

  const handleAddCandidateToPool = async () => {
    if (!selectedPoolId || !selectedCandidateToAdd) return;
    if (poolCandidates.some((item) => item.candidateId === selectedCandidateToAdd)) {
      toast({ title: "Already in pool", description: "This candidate is already in this pool." });
      return;
    }
    try {
      await addCandidateToPool({ poolId: selectedPoolId, candidateId: selectedCandidateToAdd });
      setSelectedCandidateToAdd("");
      toast({ title: "Candidate added" });
    } catch (error: any) {
      toast({ title: "Add failed", description: error?.message, variant: "destructive" });
    }
  };

  const handleRemoveCandidateFromPool = async (candidateId: string) => {
    if (!selectedPoolId) return;
    setCandidateActionId(candidateId);
    try {
      await removeCandidateFromPool({ poolId: selectedPoolId, candidateId });
      toast({ title: "Candidate removed" });
    } catch (error: any) {
      toast({ title: "Remove failed", description: error?.message, variant: "destructive" });
    } finally {
      setCandidateActionId(null);
    }
  };

  const inviteOne = async (candidateId: string) => {
    if (!selectedJobId) {
      toast({ title: "Select a job first", description: "Choose an open job from the dropdown above.", variant: "destructive" });
      return;
    }
    setCandidateActionId(candidateId);
    try {
      const { data, error } = await supabase.rpc("invite_candidate_to_job", {
        p_candidate_id: candidateId,
        p_job_id: selectedJobId,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      toast({
        title: row?.created ? "Candidate invited" : "Already invited",
        description: row?.created
          ? "Application created for this job."
          : "Candidate already has an application for this job.",
      });
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
    } catch (error: any) {
      toast({ title: "Invite failed", description: error?.message, variant: "destructive" });
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleInviteAll = async () => {
    if (!selectedJobId) {
      toast({ title: "Select a job first", description: "Choose an open job to invite all candidates.", variant: "destructive" });
      return;
    }
    if (poolCandidates.length === 0) return;
    setIsInvitingAll(true);
    let successCount = 0;
    for (const candidate of poolCandidates) {
      try {
        await supabase.rpc("invite_candidate_to_job", {
          p_candidate_id: candidate.candidateId,
          p_job_id: selectedJobId,
        });
        successCount++;
      } catch { /* skip already-invited */ }
    }
    setIsInvitingAll(false);
    toast({
      title: "Bulk invite complete",
      description: `${successCount} of ${poolCandidates.length} candidate${poolCandidates.length !== 1 ? "s" : ""} invited.`,
    });
    queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
    queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
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

              {/* Left: pools list */}
              <div className="border-r border-border/40">
                <CardHeader className="space-y-4">
                  <CardTitle className="text-lg">Pools</CardTitle>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Create New Pool</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newPoolName}
                        onChange={(e) => setNewPoolName(e.target.value)}
                        placeholder="e.g. Frontend Shortlist"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreatePool(); } }}
                      />
                      <Button onClick={() => void handleCreatePool()} disabled={isCreatingPool || !newPoolName.trim()}>
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
                              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => void handleRenamePool(pool.id)} disabled={isRenamingPool || !renameValue.trim()}>
                                  {isRenamingPool ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingPoolId(null); setRenameValue(""); }}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button type="button" className="w-full text-left" onClick={() => setSelectedPoolId(pool.id)}>
                                <p className="text-sm font-semibold truncate">{pool.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pool.candidateCount} candidate{pool.candidateCount === 1 ? "" : "s"}
                                </p>
                              </button>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => beginRename(pool)}>
                                  <PencilLine className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => void handleDeletePool(pool.id, pool.name)} disabled={isDeletingPool}>
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

              {/* Right: pool detail */}
              <div className="flex flex-col min-h-[72vh]">
                {selectedPool ? (
                  <>
                    {/* Pool header toolbar */}
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
                        {/* Searchable candidate combobox */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Add Candidate</Label>
                          <div className="flex gap-2">
                            <Popover open={candidateComboOpen} onOpenChange={setCandidateComboOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="flex-1 justify-between font-normal text-sm"
                                >
                                  <span className="truncate">
                                    {selectedCandidateName || "Search candidates…"}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search by name…" />
                                  <CommandList>
                                    <CommandEmpty>No candidates found.</CommandEmpty>
                                    <CommandGroup>
                                      {recruiterCandidates.map((c) => (
                                        <CommandItem
                                          key={c.candidateId}
                                          value={c.fullName}
                                          onSelect={() => {
                                            setSelectedCandidateToAdd(
                                              selectedCandidateToAdd === c.candidateId ? "" : c.candidateId
                                            );
                                            setCandidateComboOpen(false);
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", selectedCandidateToAdd === c.candidateId ? "opacity-100" : "opacity-0")} />
                                          {c.fullName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="outline"
                              onClick={() => void handleAddCandidateToPool()}
                              disabled={!selectedCandidateToAdd || isAddingCandidate}
                            >
                              {isAddingCandidate ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Job selector + Invite All */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Invite to Job
                            {selectedJobId && <span className="ml-2 normal-case text-primary font-normal">· scores updated</span>}
                          </Label>
                          <div className="flex gap-2">
                            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select open job" />
                              </SelectTrigger>
                              <SelectContent>
                                {openJobs.map((job) => (
                                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => void handleInviteAll()}
                              disabled={isInvitingAll || poolCandidates.length === 0 || !selectedJobId}
                              title="Invite all candidates to selected job"
                            >
                              {isInvitingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Candidate cards */}
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
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-semibold truncate">{candidate.fullName}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {candidate.yearsExperience > 0
                                          ? `${candidate.yearsExperience} yrs experience`
                                          : "Experience not listed"}
                                      </p>
                                    </div>
                                    {candidate.aiMatchScore > 0 ? (
                                      <Badge className={`border shrink-0 ${scoreClass(candidate.aiMatchScore)}`}>
                                        {candidate.aiMatchScore}% Match
                                      </Badge>
                                    ) : selectedJobId ? (
                                      <Badge variant="outline" className="text-muted-foreground shrink-0">Unscored</Badge>
                                    ) : null}
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {candidate.skills.length > 0 ? (
                                        candidate.skills.slice(0, 8).map((skill) => (
                                          <Badge key={`${candidate.candidateId}-${skill}`} variant="outline">{skill}</Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">No skills listed</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <a
                                      href={`/dashboard/candidates/${candidate.candidateId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button size="sm" variant="ghost" className="text-muted-foreground">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View Profile
                                      </Button>
                                    </a>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleRemoveCandidateFromPool(candidate.candidateId)}
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
                                      onClick={() => void inviteOne(candidate.candidateId)}
                                      disabled={isBusy || !selectedJobId}
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
                            Add candidates from the selector above or from Resume Search.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <Users className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <h3 className="font-semibold">Select or create a pool</h3>
                    <p className="text-sm text-muted-foreground mt-1">Start by creating a pool in the left panel.</p>
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
