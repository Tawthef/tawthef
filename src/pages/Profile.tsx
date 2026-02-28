import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    User, Loader2, Save, X, Plus, Briefcase, Clock, FileText,
    CheckCircle, MapPin, GraduationCap, Sparkles, Upload, AlertCircle
} from "lucide-react";
import { useCandidateProfile, extractTextFromFile } from "@/hooks/useCandidateProfile";
import type { ParseStatus } from "@/hooks/useCandidateProfile";
import { useProfile } from "@/hooks/useProfile";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
    const {
        profile: candidateProfile, isLoading,
        updateProfile, isUpdating,
        uploadCV, isUploading,
        parseResume, isParsing
    } = useCandidateProfile();
    const { profile: userProfile } = useProfile();
    const { toast } = useToast();

    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [yearsExperience, setYearsExperience] = useState<number>(0);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState("");
    const [jobTitles, setJobTitles] = useState<string[]>([]);
    const [education, setEducation] = useState<string[]>([]);
    const [location, setLocation] = useState("");
    const [isDirty, setIsDirty] = useState(false);
    const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');

    // Initialize form from loaded profile
    useEffect(() => {
        if (candidateProfile) {
            setSkills(candidateProfile.skills || []);
            setYearsExperience(candidateProfile.years_experience || 0);
            setKeywords(candidateProfile.keywords || []);
            setJobTitles(candidateProfile.job_titles || []);
            setEducation(candidateProfile.education || []);
            setLocation(candidateProfile.location || '');
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
    const handleRemoveSkill = (skill: string) => { setSkills(skills.filter(s => s !== skill)); setIsDirty(true); };

    const handleAddKeyword = () => {
        const keyword = newKeyword.trim().toLowerCase();
        if (keyword && !keywords.includes(keyword)) {
            setKeywords([...keywords, keyword]);
            setNewKeyword("");
            setIsDirty(true);
        }
    };
    const handleRemoveKeyword = (keyword: string) => { setKeywords(keywords.filter(k => k !== keyword)); setIsDirty(true); };

    const handleSave = async () => {
        try {
            await updateProfile({
                skills, years_experience: yearsExperience, keywords,
                job_titles: jobTitles, education, location,
            });
            setIsDirty(false);
            toast({ title: "Profile saved", description: "Your profile has been updated successfully." });
        } catch {
            toast({ title: "Error", description: "Failed to save profile. Please try again.", variant: "destructive" });
        }
    };

    const handleCVUpload = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
            return;
        }

        try {
            // Step 1: Upload
            setParseStatus('uploading');
            toast({ title: "Uploading...", description: "Uploading your resume." });
            await uploadCV(file);

            // Step 2: Extract text
            setParseStatus('parsing');
            toast({ title: "Analyzing Resume", description: "AI is parsing your skills and experience..." });
            const text = await extractTextFromFile(file);

            if (!text || text.length < 20) {
                toast({
                    title: "Parsing Note",
                    description: "Could not extract text from this file. You can manually add your details below.",
                    variant: "destructive",
                });
                setParseStatus('error');
                return;
            }

            // Step 3: AI Parse via serverless function
            const parsed = await parseResume(text);

            // Step 4: Update UI with AI results
            setSkills(prev => [...new Set([...prev, ...parsed.skills])]);
            setJobTitles(parsed.job_titles || []);
            setYearsExperience(parsed.years_experience || yearsExperience);
            setEducation(parsed.education || []);
            setLocation(parsed.location || location);
            setKeywords(prev => [...new Set([...prev, ...parsed.keywords])]);
            setIsDirty(true);
            setParseStatus('done');

            toast({ title: "Resume Parsed ✨", description: `Extracted ${parsed.skills.length} skills, ${parsed.education.length} education entries. Review and save!` });

        } catch (err: any) {
            console.error(err);
            setParseStatus('error');
            toast({ title: "Parsing Failed", description: err.message || "Could not parse resume.", variant: "destructive" });
        }
    };

    // Profile completeness
    const completeness = Math.round(
        (skills.length > 0 ? 25 : 0) +
        (yearsExperience > 0 ? 20 : 0) +
        (keywords.length > 0 ? 10 : 0) +
        (candidateProfile?.resume_url ? 15 : 0) +
        (jobTitles.length > 0 ? 10 : 0) +
        (education.length > 0 ? 10 : 0) +
        (location ? 10 : 0)
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
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Profile
                        </Button>
                    </div>
                </div>

                {/* Loading */}
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
                                        <User className="w-5 h-5 text-primary" /> Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Full Name</Label>
                                            <Input value={userProfile?.full_name || ""} disabled className="h-12 rounded-xl bg-muted/30" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Location</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                                <Input
                                                    placeholder="City, Country"
                                                    value={location}
                                                    onChange={(e) => { setLocation(e.target.value); setIsDirty(true); }}
                                                    className="h-12 rounded-xl pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Skills */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Briefcase className="w-5 h-5 text-primary" /> Skills
                                    </CardTitle>
                                    <CardDescription>Technical and soft skills</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add a skill (e.g., JavaScript, Project Management)"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                            className="h-12 rounded-xl"
                                        />
                                        <Button onClick={handleAddSkill} variant="outline" className="h-12 px-4 rounded-xl">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No skills added yet</p>
                                        ) : skills.map((skill) => (
                                            <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                                                {skill}
                                                <button onClick={() => handleRemoveSkill(skill)} className="ml-2 hover:text-destructive">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Job Titles */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Briefcase className="w-5 h-5 text-primary" /> Job Titles
                                    </CardTitle>
                                    <CardDescription>Positions you've held or are targeting</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {jobTitles.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Upload your CV to auto-extract job titles</p>
                                        ) : jobTitles.map((title, i) => (
                                            <Badge key={i} className="bg-primary/10 text-primary border-0 px-3 py-1.5 text-sm">
                                                {title}
                                                <button onClick={() => { setJobTitles(jobTitles.filter((_, j) => j !== i)); setIsDirty(true); }} className="ml-2 hover:text-destructive">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Experience */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-primary" /> Experience
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label>Years of Experience</Label>
                                        <Input
                                            type="number" min={0} max={50}
                                            value={yearsExperience}
                                            onChange={(e) => { setYearsExperience(parseInt(e.target.value) || 0); setIsDirty(true); }}
                                            className="h-12 rounded-xl w-32"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Education */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <GraduationCap className="w-5 h-5 text-primary" /> Education
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {education.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Upload your CV to auto-extract education</p>
                                        ) : education.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                                                <span className="text-sm">{entry}</span>
                                                <button onClick={() => { setEducation(education.filter((_, j) => j !== i)); setIsDirty(true); }} className="text-muted-foreground hover:text-destructive">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Keywords */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-primary" /> Keywords
                                    </CardTitle>
                                    <CardDescription>Domain keywords and interests</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add a keyword (e.g., Startup, Remote, Fintech)"
                                            value={newKeyword}
                                            onChange={(e) => setNewKeyword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                            className="h-12 rounded-xl"
                                        />
                                        <Button onClick={handleAddKeyword} variant="outline" className="h-12 px-4 rounded-xl">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {keywords.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No keywords added yet</p>
                                        ) : keywords.map((keyword) => (
                                            <Badge key={keyword} variant="outline" className="px-3 py-1.5 text-sm">
                                                {keyword}
                                                <button onClick={() => handleRemoveKeyword(keyword)} className="ml-2 hover:text-destructive">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
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
                                                className={`h-full rounded-full transition-all duration-500 ${completeness >= 70 ? 'bg-success' : completeness >= 40 ? 'bg-warning' : 'bg-destructive/50'}`}
                                                style={{ width: `${completeness}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        {[
                                            { done: skills.length > 0, text: 'Add skills' },
                                            { done: yearsExperience > 0, text: 'Set experience' },
                                            { done: !!candidateProfile?.resume_url, text: 'Upload resume' },
                                            { done: jobTitles.length > 0, text: 'Job titles' },
                                            { done: education.length > 0, text: 'Education' },
                                            { done: !!location, text: 'Location' },
                                            { done: keywords.length > 0, text: 'Keywords' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <CheckCircle className={`w-4 h-4 ${item.done ? 'text-success' : 'text-muted-foreground/30'}`} />
                                                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resume Upload */}
                            <Card className="card-float border-0">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        Resume
                                        {candidateProfile?.parsed_at && (
                                            <Badge className="bg-success/10 text-success border-0 text-xs font-normal">
                                                <Sparkles className="w-3 h-3 mr-1" /> AI Parsed
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Parsing Status */}
                                    {(parseStatus === 'uploading' || parseStatus === 'parsing' || isUploading || isParsing) && (
                                        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl animate-pulse">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            <div>
                                                <p className="text-sm font-medium text-primary">
                                                    {parseStatus === 'uploading' || isUploading ? 'Uploading file...' : 'AI is analyzing your resume...'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                                            </div>
                                        </div>
                                    )}

                                    {parseStatus === 'done' && (
                                        <div className="flex items-center gap-3 p-4 bg-success/10 rounded-xl">
                                            <CheckCircle className="w-5 h-5 text-success" />
                                            <div>
                                                <p className="text-sm font-medium text-success">Parsing complete!</p>
                                                <p className="text-xs text-muted-foreground">Review the extracted data and save</p>
                                            </div>
                                        </div>
                                    )}

                                    {parseStatus === 'error' && (
                                        <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl">
                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                            <div>
                                                <p className="text-sm font-medium text-destructive">Parsing failed</p>
                                                <p className="text-xs text-muted-foreground">Add your details manually below</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload area */}
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
                                    ) : null}

                                    <input
                                        type="file"
                                        id="resume-upload"
                                        className="hidden"
                                        accept=".pdf,.docx,.txt"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) await handleCVUpload(file);
                                            e.target.value = ''; // Reset for re-upload
                                        }}
                                    />

                                    {!candidateProfile?.resume_url && (
                                        <Button
                                            variant="outline"
                                            className="w-full h-24 rounded-xl border-dashed flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                                            onClick={() => document.getElementById('resume-upload')?.click()}
                                            disabled={isUploading || isParsing}
                                        >
                                            {isUploading || isParsing ? (
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            ) : (
                                                <Upload className="w-6 h-6 text-muted-foreground" />
                                            )}
                                            <div className="text-center">
                                                <span className="text-sm font-medium">Click to upload resume</span>
                                                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX or TXT (Max 5MB)</p>
                                            </div>
                                        </Button>
                                    )}

                                    <p className="text-xs text-muted-foreground text-center">
                                        <Sparkles className="w-3 h-3 inline mr-1" />
                                        AI will extract skills, experience, and education
                                    </p>
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
