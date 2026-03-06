import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApplications } from "@/hooks/useApplications";
import { PublicJobFilters, usePublicJobs } from "@/hooks/usePublicJobs";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Building2, Calendar, Filter, Loader2, MapPin, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const INITIAL_FILTERS: PublicJobFilters = {
  title: "",
  skills: [],
  keywords: [],
  location: "",
  salaryMin: null,
  salaryMax: null,
  experienceLevel: "",
  jobType: "",
};

const parseCommaSeparated = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatSalary = (job: {
  salary_range_text: string | null;
  salary_min: number | null;
  salary_max: number | null;
}) => {
  if (job.salary_range_text) return job.salary_range_text;
  if (job.salary_min !== null && job.salary_max !== null) {
    return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
  }
  if (job.salary_min !== null) return `From $${job.salary_min.toLocaleString()}`;
  if (job.salary_max !== null) return `Up to $${job.salary_max.toLocaleString()}`;
  return "Salary not specified";
};

const PublicJobs = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { apply, hasApplied } = useApplications();

  const [titleInput, setTitleInput] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [salaryMinInput, setSalaryMinInput] = useState("");
  const [salaryMaxInput, setSalaryMaxInput] = useState("");
  const [experienceLevelInput, setExperienceLevelInput] = useState("any");
  const [jobTypeInput, setJobTypeInput] = useState("any");
  const [filters, setFilters] = useState<PublicJobFilters>(INITIAL_FILTERS);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = usePublicJobs(filters);

  const isCandidate = profile?.role === "candidate";
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.title) count += 1;
    if (filters.skills.length > 0) count += 1;
    if (filters.keywords.length > 0) count += 1;
    if (filters.location) count += 1;
    if (filters.salaryMin !== null || filters.salaryMax !== null) count += 1;
    if (filters.experienceLevel) count += 1;
    if (filters.jobType) count += 1;
    return count;
  }, [filters]);

  const runSearch = () => {
    setFilters({
      title: titleInput.trim(),
      skills: parseCommaSeparated(skillsInput),
      keywords: parseCommaSeparated(keywordsInput),
      location: locationInput.trim(),
      salaryMin: salaryMinInput ? Number(salaryMinInput) : null,
      salaryMax: salaryMaxInput ? Number(salaryMaxInput) : null,
      experienceLevel: experienceLevelInput === "any" ? "" : experienceLevelInput,
      jobType: jobTypeInput === "any" ? "" : jobTypeInput,
    });
  };

  const resetFilters = () => {
    setTitleInput("");
    setSkillsInput("");
    setKeywordsInput("");
    setLocationInput("");
    setSalaryMinInput("");
    setSalaryMaxInput("");
    setExperienceLevelInput("any");
    setJobTypeInput("any");
    setFilters(INITIAL_FILTERS);
  };

  const handleApply = async (jobId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!isCandidate) {
      toast({
        title: "Candidates only",
        description: "Only candidate accounts can apply to jobs.",
        variant: "destructive",
      });
      return;
    }

    setApplyingJobId(jobId);
    try {
      await apply(jobId);
      toast({
        title: "Application submitted",
        description: "Your application has been sent successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Apply failed",
        description: error?.message || "Unable to submit application.",
        variant: "destructive",
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Job Marketplace</h1>
            <p className="text-muted-foreground">
              Discover open positions and apply in a few clicks.
            </p>
          </div>

          <Card className="border-0 card-float">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-primary" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={titleInput}
                    onChange={(event) => setTitleInput(event.target.value)}
                    placeholder="Frontend Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma separated)</Label>
                  <Input
                    value={skillsInput}
                    onChange={(event) => setSkillsInput(event.target.value)}
                    placeholder="React, TypeScript"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords (comma separated)</Label>
                  <Input
                    value={keywordsInput}
                    onChange={(event) => setKeywordsInput(event.target.value)}
                    placeholder="remote, saas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                    placeholder="Riyadh"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Min</Label>
                  <Input
                    type="number"
                    value={salaryMinInput}
                    onChange={(event) => setSalaryMinInput(event.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max</Label>
                  <Input
                    type="number"
                    value={salaryMaxInput}
                    onChange={(event) => setSalaryMaxInput(event.target.value)}
                    placeholder="15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                    <Select value={experienceLevelInput} onValueChange={setExperienceLevelInput}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any level</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={jobTypeInput} onValueChange={setJobTypeInput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any type</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={runSearch}
                  className="shadow-lg shadow-primary/20"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Jobs
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Badge variant="outline" className="ml-auto">
                  {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <Card key={job.id} className="border-0 card-float h-full">
                  <CardContent className="p-5 h-full flex flex-col">
                    <div className="space-y-3 flex-1">
                      <h3 className="text-lg font-semibold line-clamp-2">{job.title}</h3>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {job.organization_name}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {job.location || "Location not specified"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {formatSalary(job)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Posted {formatDate(job.created_at)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.required_skills.length > 0 ? (
                            job.required_skills.slice(0, 6).map((skill) => (
                              <Badge key={`${job.id}-${skill}`} variant="outline">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Not specified</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button asChild variant="outline" className="flex-1">
                        <Link to={`/jobs/${job.id}`}>View Job</Link>
                      </Button>
                      {isCandidate && hasApplied(job.id) ? (
                        <Button className="flex-1" disabled>
                          Applied
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          onClick={() => {
                            void handleApply(job.id);
                          }}
                          disabled={applyingJobId === job.id}
                        >
                          {applyingJobId === job.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-16 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold">No open jobs found</h3>
                <p className="text-muted-foreground mt-1">Try changing filters or check back later.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicJobs;
