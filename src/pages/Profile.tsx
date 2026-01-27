import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Loader2, Save, X, Plus, Briefcase, Clock, FileText, CheckCircle } from "lucide-react";
import { useCandidateProfile } from "@/hooks/useCandidateProfile";
import { useProfile } from "@/hooks/useProfile";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
    const { profile: candidateProfile, isLoading, updateProfile, isUpdating, uploadCV, isUploading } = useCandidateProfile();
    const { profile: userProfile } = useProfile();
    const { toast } = useToast();

    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [yearsExperience, setYearsExperience] = useState<number>(0);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    // Initialize form from loaded profile
    useEffect(() => {
        if (candidateProfile) {
            setSkills(candidateProfile.skills || []);
            setYearsExperience(candidateProfile.years_experience || 0);
            setKeywords(candidateProfile.keywords || []);
        }
    }, [candidateProfile]);

    const handleAddSkill = () => {
        const skill = newSkill.trim().toLowerCase();
        if (skill && !skills.includes(skill)) {
            setSkills([...skills, skill]);
            setNewSkill("");
            setIsDirty(true);
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setSkills(skills.filter(s => s !== skill));
        setIsDirty(true);
    };

    const handleAddKeyword = () => {
        const keyword = newKeyword.trim().toLowerCase();
        if (keyword && !keywords.includes(keyword)) {
            setKeywords([...keywords, keyword]);
            setNewKeyword("");
            setIsDirty(true);
        }
    };

    const handleRemoveKeyword = (keyword: string) => {
        setKeywords(keywords.filter(k => k !== keyword));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            await updateProfile({
                skills,
                years_experience: yearsExperience,
                keywords,
            });
            setIsDirty(false);
            toast({
                title: "Profile saved",
                description: "Your profile has been updated successfully.",
            });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to save profile. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Calculate profile completeness
    const completeness = Math.round(
        ((skills.length > 0 ? 40 : 0) +
            (yearsExperience > 0 ? 30 : 0) +
            (keywords.length > 0 ? 20 : 0) +
            (candidateProfile?.resume_url ? 10 : 0))
    );

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Page header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">My Profile</h1>
                        <p className="text-xl text-muted-foreground font-light max-w-xl">
                            Complete your profile to improve job matching
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge className={`text-sm px-4 py-2 ${completeness >= 70 ? 'bg-success/10 text-success' : completeness >= 40 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                            {completeness}% Complete
                        </Badge>
                        <Button
                            onClick={handleSave}
                            disabled={isUpdating || !isDirty}
                            className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Profile
                        </Button>
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {!isLoading && (
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Main form */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Basic Info */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-primary" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            value={userProfile?.full_name || ""}
                                            disabled
                                            className="h-12 rounded-xl bg-muted/30"
                                        />
                                        <p className="text-xs text-muted-foreground">Name is synced from your account settings</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            value={userProfile?.id ? `${userProfile.id.slice(0, 8)}...@email.com` : ""}
                                            disabled
                                            className="h-12 rounded-xl bg-muted/30"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Skills */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Briefcase className="w-5 h-5 text-primary" />
                                        Skills
                                    </CardTitle>
                                    <CardDescription>Add skills that describe your expertise</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add a skill (e.g., JavaScript, Project Management)"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                                            className="h-12 rounded-xl"
                                        />
                                        <Button onClick={handleAddSkill} variant="outline" className="h-12 px-4 rounded-xl">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No skills added yet</p>
                                        ) : (
                                            skills.map((skill) => (
                                                <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                                                    {skill}
                                                    <button onClick={() => handleRemoveSkill(skill)} className="ml-2 hover:text-destructive">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Experience */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-primary" />
                                        Experience
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Years of Experience</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={yearsExperience}
                                            onChange={(e) => {
                                                setYearsExperience(parseInt(e.target.value) || 0);
                                                setIsDirty(true);
                                            }}
                                            className="h-12 rounded-xl w-32"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Keywords */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Keywords
                                    </CardTitle>
                                    <CardDescription>Add keywords that describe your expertise and interests</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add a keyword (e.g., Startup, Remote, Fintech)"
                                            value={newKeyword}
                                            onChange={(e) => setNewKeyword(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                                            className="h-12 rounded-xl"
                                        />
                                        <Button onClick={handleAddKeyword} variant="outline" className="h-12 px-4 rounded-xl">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {keywords.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No keywords added yet</p>
                                        ) : (
                                            keywords.map((keyword) => (
                                                <Badge key={keyword} variant="outline" className="px-3 py-1.5 text-sm">
                                                    {keyword}
                                                    <button onClick={() => handleRemoveKeyword(keyword)} className="ml-2 hover:text-destructive">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Profile Strength */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="text-lg">Profile Strength</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="relative pt-1">
                                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${completeness >= 70 ? 'bg-success' : completeness >= 40 ? 'bg-warning' : 'bg-destructive/50'
                                                    }`}
                                                style={{ width: `${completeness}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={`w-4 h-4 ${skills.length > 0 ? 'text-success' : 'text-muted-foreground/30'}`} />
                                            <span className={skills.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>Add skills</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={`w-4 h-4 ${yearsExperience > 0 ? 'text-success' : 'text-muted-foreground/30'}`} />
                                            <span className={yearsExperience > 0 ? 'text-foreground' : 'text-muted-foreground'}>Set experience</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={`w-4 h-4 ${keywords.length > 0 ? 'text-success' : 'text-muted-foreground/30'}`} />
                                            <span className={keywords.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>Add keywords</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={`w-4 h-4 ${candidateProfile?.resume_url ? 'text-success' : 'text-muted-foreground/30'}`} />
                                            <span className={candidateProfile?.resume_url ? 'text-foreground' : 'text-muted-foreground'}>Upload resume</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resume Upload */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="text-lg">Resume</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {candidateProfile?.resume_url ? (
                                        <div className="flex items-center justify-between p-4 bg-success/10 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-success/20 p-2 rounded-lg">
                                                    <FileText className="w-6 h-6 text-success" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-success">Resume uploaded</p>
                                                    <a href={candidateProfile.resume_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                                                        View Resume
                                                    </a>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => document.getElementById('resume-upload')?.click()}>
                                                Update
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="resume-upload"
                                                className="hidden"
                                                accept=".pdf,.docx"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            toast({ title: "Uploading...", description: "Please wait while we upload your resume." });
                                                            const { resume_url } = await uploadCV(file);

                                                            // Mock Parse Trigger
                                                            toast({ title: "Analyzing Resume...", description: "AI is parsing your skills and experience." });
                                                            setTimeout(async () => {
                                                                // Mock Data mimicking AI extraction
                                                                const mockSkills = ['Product Management', 'Market Research', 'Agile', 'Jira'];
                                                                const mockExp = 4;
                                                                const mockKeywords = ['Leadership', 'Strategy'];

                                                                setSkills(prev => [...new Set([...prev, ...mockSkills])]);
                                                                setYearsExperience(mockExp);
                                                                setKeywords(prev => [...new Set([...prev, ...mockKeywords])]);
                                                                setIsDirty(true);

                                                                // Save parsed data
                                                                await updateProfile({
                                                                    skills: [...new Set([...skills, ...mockSkills])],
                                                                    years_experience: mockExp,
                                                                    keywords: [...new Set([...keywords, ...mockKeywords])],
                                                                    resume_url
                                                                });

                                                                toast({ title: "Resume Parsed", description: "Skills and experience have been extracted." });
                                                            }, 2000);

                                                        } catch (err) {
                                                            console.error(err);
                                                            toast({ title: "Upload Failed", description: "Could not upload resume.", variant: "destructive" });
                                                        }
                                                    }
                                                }}
                                            />
                                            <Button
                                                variant="outline"
                                                className="w-full h-24 rounded-xl border-dashed flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                                                onClick={() => document.getElementById('resume-upload')?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                ) : (
                                                    <FileText className="w-6 h-6 text-muted-foreground" />
                                                )}
                                                <div className="text-center">
                                                    <span className="text-sm font-medium">Click to upload resume</span>
                                                    <p className="text-xs text-muted-foreground mt-1">PDF or DOCX (Max 5MB)</p>
                                                </div>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Profile;
