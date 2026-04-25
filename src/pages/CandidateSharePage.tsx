import { useParams, Link } from "react-router-dom";
import { MapPin, Briefcase, Clock, Star, GraduationCap, FolderGit2, Award, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandidateShareProfile } from "@/hooks/useCandidateShare";
import logo from "@/assets/tawthef-logo-en.png";

export default function CandidateSharePage() {
  const { token } = useParams<{ token: string }>();
  const { data: profile, isLoading } = useCandidateShareProfile(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Link unavailable</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            This candidate profile link has expired or been revoked. Please contact the recruiter for a new link.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm">
            Go to Tawthef →
          </Link>
        </main>
        <Footer sharedBy="" organization="" expiresAt="" />
      </div>
    );
  }

  const expiresLabel = new Date(profile.expires_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Identity card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0 border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary flex-shrink-0">
                  {profile.full_name[0]}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                {profile.job_title && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Briefcase className="w-4 h-4" />
                    {profile.job_title}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.location}
                    </span>
                  )}
                  {profile.years_experience != null && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {profile.years_experience} yrs experience
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.summary && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground border-t pt-4">
                {profile.summary}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" /> Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang) => (
                  <Badge key={lang} variant="outline">{lang}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience */}
        {profile.experience && profile.experience.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {profile.experience.map((exp: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p className="font-semibold text-sm">{exp.title}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  {exp.duration && (
                    <p className="text-xs text-muted-foreground mt-0.5">{exp.duration}</p>
                  )}
                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.education.map((edu: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p className="font-semibold text-sm">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  {edu.year && (
                    <p className="text-xs text-muted-foreground mt-0.5">{edu.year}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        {profile.projects && profile.projects.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderGit2 className="w-4 h-4" /> Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.projects.map((proj: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p className="font-semibold text-sm">{proj.name}</p>
                  {proj.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proj.description}</p>
                  )}
                  {proj.technologies && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {proj.technologies.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {profile.certifications && profile.certifications.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" /> Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.certifications.map((cert: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p className="font-semibold text-sm">{cert.name}</p>
                  {cert.issuer && (
                    <p className="text-xs text-muted-foreground">{cert.issuer} · {cert.year}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer
        sharedBy={profile.shared_by_name}
        organization={profile.organization_name}
        expiresAt={expiresLabel}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm py-3 px-4">
      <div className="container max-w-3xl mx-auto flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="Tawthef" className="h-10 w-auto" />
        </Link>
        <Link to="/register">
          <span className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Post jobs on Tawthef →
          </span>
        </Link>
      </div>
    </header>
  );
}

function Footer({ sharedBy, organization, expiresAt }: { sharedBy: string; organization: string; expiresAt: string }) {
  return (
    <footer className="border-t bg-muted/30 py-6 px-4 mt-8">
      <div className="container max-w-3xl mx-auto text-center space-y-1">
        {sharedBy && (
          <p className="text-xs text-muted-foreground">
            Shared by <span className="font-medium text-foreground">{sharedBy}</span>
            {organization ? ` · ${organization}` : ""}
          </p>
        )}
        {expiresAt && (
          <p className="text-xs text-muted-foreground">Link expires {expiresAt}</p>
        )}
        <p className="text-xs text-muted-foreground pt-2">
          Powered by{" "}
          <Link to="/" className="text-primary hover:underline font-medium">
            Tawthef
          </Link>
          {" "}— AI-powered recruitment platform
        </p>
      </div>
    </footer>
  );
}
