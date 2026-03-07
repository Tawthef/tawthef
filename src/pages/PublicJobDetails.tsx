import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApplications } from "@/hooks/useApplications";
import { usePublicJobById } from "@/hooks/usePublicJobs";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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

const PublicJobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { apply, hasApplied } = useApplications();
  const { data: job, isLoading } = usePublicJobById(id);
  const [isApplying, setIsApplying] = useState(false);

  const isCandidate = profile?.role === "candidate";

  const handleApply = async () => {
    if (!id) return;

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

    setIsApplying(true);
    try {
      await apply(id);
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
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Button asChild variant="ghost" size="sm" className="px-0 w-fit">
            <Link to="/jobs">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Jobs
            </Link>
          </Button>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : job ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 card-float lg:col-span-2">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      Recruiter: {job.organization_name}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {job.location || "Location not specified"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Posted {formatDate(job.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Job Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {job.description || "No description provided."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.length > 0 ? (
                        job.required_skills.map((skill) => (
                          <Badge key={`${job.id}-${skill}`} variant="outline">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">Not specified</Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    {isCandidate && hasApplied(job.id) ? (
                      <Button disabled>Applied</Button>
                    ) : (
                      <Button
                        onClick={() => {
                          void handleApply();
                        }}
                        disabled={isApplying}
                      >
                        {isApplying ? (
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

              <Card className="border-0 card-float">
                <CardHeader>
                  <CardTitle className="text-lg">Recruiter & Role Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recruiter</p>
                    <p className="font-medium">{job.organization_name}</p>
                    {job.organization_type ? (
                      <Badge variant="outline" className="capitalize mt-1">
                        {job.organization_type}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Salary</p>
                    <p className="font-medium">{formatSalary(job)}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Experience Level</p>
                    <p className="font-medium capitalize">{job.experience_level || "Not specified"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Job Type</p>
                    <p className="font-medium capitalize">{job.job_type || "Not specified"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="font-medium">{job.location || "Not specified"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Posted Date</p>
                    <p className="font-medium">{formatDate(job.created_at)}</p>
                  </div>

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/jobs">
                        <Briefcase className="w-4 h-4 mr-2" />
                        Browse More Jobs
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-16 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold">Job not found</h3>
                <p className="text-muted-foreground mt-1">
                  This job might be closed or no longer available.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicJobDetails;
