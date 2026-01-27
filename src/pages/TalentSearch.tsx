import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Search, MapPin, Briefcase, GraduationCap, Lock,
    Filter, Star, Clock, ChevronDown, CheckCircle2, User, Phone, Mail
} from "lucide-react";
import { useTalentSearch, TalentSearchResult } from "@/hooks/useTalentSearch";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";

const TalentSearch = () => {
    const {
        results,
        totalCount,
        isLoading,
        filters,
        setFilters,
        hasAccess: hookHasAccess // Use hook or override
    } = useTalentSearch();

    // In a real scenario, useSubscription() coupled with RLS would be the source of truth
    const { subscriptions } = useSubscription();
    // Check if any subscription is active and has the 'resume_search' functionality (simplified for now)
    // Assuming any active subscription grants access in this demo phase
    const hasActiveSubscription = subscriptions?.some(sub => sub.status === 'active') || hookHasAccess;

    const [locationInput, setLocationInput] = useState("");

    const handleSearch = () => {
        // Trigger search via filters update
    };

    const toggleSkill = (skill: string) => {
        const current = filters.skills;
        if (current.includes(skill)) {
            setFilters({ ...filters, skills: current.filter(s => s !== skill) });
        } else {
            setFilters({ ...filters, skills: [...current, skill] });
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
                {/* Header / Search Bar */}
                <div className="bg-card rounded-xl p-6 shadow-sm border space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                placeholder="Search by job title, skill, or keyword..."
                                className="pl-10 h-12 text-lg"
                                value={filters.query}
                                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                            />
                        </div>
                        <div className="relative w-full lg:w-1/4">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                placeholder="Location (e.g. Riyadh)"
                                className="pl-10 h-12"
                                value={filters.location}
                                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                            />
                        </div>
                        <Button size="lg" className="h-12 px-8" onClick={handleSearch}>
                            Find Talent
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                    {/* Filters Sidebar */}
                    <Card className="w-full lg:w-80 h-fit overflow-y-auto hidden lg:block border-0 shadow-sm">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-2 font-semibold text-lg">
                                <Filter className="w-5 h-5" /> Filters
                            </div>
                            <Separator />

                            {/* Experience */}
                            <div className="space-y-4">
                                <Label>Experience (Years)</Label>
                                <div className="pt-2">
                                    <Slider
                                        defaultValue={[0, 20]}
                                        max={30}
                                        step={1}
                                        onValueChange={(vals) => setFilters({ ...filters, minExperience: vals[0], maxExperience: vals[1] })}
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                        <span>{filters.minExperience || 0} yrs</span>
                                        <span>{filters.maxExperience || 20}+ yrs</span>
                                    </div>
                                </div>
                            </div>
                            <Separator />

                            {/* Popular Skills */}
                            <div className="space-y-3">
                                <Label>Common Skills</Label>
                                <div className="space-y-2">
                                    {['JavaScript', 'Python', 'Project Management', 'Sales', 'Marketing'].map(skill => (
                                        <div key={skill} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`skill-${skill}`}
                                                checked={filters.skills.includes(skill)}
                                                onCheckedChange={() => toggleSkill(skill)}
                                            />
                                            <Label htmlFor={`skill-${skill}`} className="font-normal cursor-pointer">
                                                {skill}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Area */}
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                        <div className="flex items-center justify-between pb-2">
                            <h2 className="text-xl font-semibold">
                                {totalCount} Candidates Found
                            </h2>
                            <div className="text-sm text-muted-foreground">
                                Sorted by Relevance
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl" />
                                ))}
                            </div>
                        ) : results.length > 0 ? (
                            results.map((candidate) => (
                                <CandidateCard
                                    key={candidate.id}
                                    candidate={candidate}
                                    locked={!hasActiveSubscription}
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-muted/10 rounded-xl">
                                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No candidates found</h3>
                                <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};


// Sub-component for Candidate Card
const CandidateCard = ({ candidate, locked }: { candidate: TalentSearchResult, locked: boolean }) => {
    return (
        <Card className={`overflow-hidden transition-all hover:shadow-md border-l-4 ${locked ? 'border-l-muted' : 'border-l-primary'}`}>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Left: Avatar & Basic Info */}
                    <div className="p-6 flex-1 flex gap-5">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 
                            ${locked ? 'bg-muted text-muted-foreground blur-sm opacity-50' : 'bg-primary/10 text-primary'}`}>
                            {locked ? '?' : (candidate.full_name?.[0] || 'U')}
                        </div>

                        <div className="space-y-3 flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className={`text-lg font-bold ${locked ? 'blur-sm select-none' : ''}`}>
                                        {locked ? 'Candidate Name Hidden' : candidate.full_name || 'Unknown Candidate'}
                                    </h3>
                                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        {candidate.job_titles?.[0] || 'No Title'}
                                    </p>
                                </div>
                                {candidate.match_score > 0 && (
                                    <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20">
                                        {Math.round(candidate.match_score)}% Match
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {candidate.location || 'Unknown Location'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {candidate.years_experience} Years Exp
                                </div>
                                {candidate.education && candidate.education.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        <GraduationCap className="w-4 h-4" />
                                        {candidate.education[0]}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {candidate.skills?.slice(0, 5).map(skill => (
                                    <Badge key={skill} variant="outline" className="text-xs">
                                        {skill}
                                    </Badge>
                                ))}
                                {candidate.skills?.length > 5 && (
                                    <Badge variant="outline" className="text-xs">+{candidate.skills.length - 5}</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions / Lock Overlay */}
                    <div className={`p-6 border-t md:border-t-0 md:border-l bg-muted/10 w-full md:w-64 flex flex-col justify-center gap-3 relative`}>
                        {locked && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4 z-10">
                                <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm font-semibold text-foreground">Premium Access Only</p>
                                <p className="text-xs text-muted-foreground mb-3">Subscribe to view full profile & contact.</p>
                                <Button size="sm" className="w-full">Unlock Profile</Button>
                            </div>
                        )}

                        <Button className="w-full shadow-sm" disabled={locked}>
                            <Phone className="w-4 h-4 mr-2" /> Contact Candidate
                        </Button>
                        <Button variant="outline" className="w-full" disabled={locked}>
                            <Mail className="w-4 h-4 mr-2" /> Send Message
                        </Button>
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                            <CheckCircle2 className="w-3 h-3 text-success" /> Phone Verified
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TalentSearch;
