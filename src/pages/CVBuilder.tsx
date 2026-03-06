import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useCandidateProfile } from "@/hooks/useCandidateProfile";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Download, FileText, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

type Personal = { full_name: string; email: string; phone: string; location: string };
type Exp = { id: string; company: string; role: string; start_date: string; end_date: string; description: string };
type Edu = { id: string; school: string; degree: string; year: string };
type Project = { id: string; name: string; description: string; link: string };
type Cert = { id: string; name: string; issuer: string; year: string };

const DEFAULT_SKILLS = ["JavaScript", "TypeScript", "React", "Node.js", "GraphQL", "SQL", "Python", "HTML", "CSS", "Tailwind CSS", "Git", "REST APIs"];
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const emptyExp = (): Exp => ({ id: uuid(), company: "", role: "", start_date: "", end_date: "", description: "" });
const emptyEdu = (): Edu => ({ id: uuid(), school: "", degree: "", year: "" });
const emptyProject = (): Project => ({ id: uuid(), name: "", description: "", link: "" });
const emptyCert = (): Cert => ({ id: uuid(), name: "", issuer: "", year: "" });
const toArray = (v: unknown) => (Array.isArray(v) ? v : []);
const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

const parseExp = (v: unknown): Exp[] => {
  const rows = toArray(v).map((x: any) => ({ id: String(x?.id || uuid()), company: String(x?.company || ""), role: String(x?.role || ""), start_date: String(x?.start_date || ""), end_date: String(x?.end_date || ""), description: String(x?.description || "") }));
  return rows.length ? rows : [emptyExp()];
};
const parseEdu = (v: unknown): Edu[] => {
  const rows = toArray(v).map((x: any) => ({ id: String(x?.id || uuid()), school: String(x?.school || ""), degree: String(x?.degree || ""), year: String(x?.year || "") }));
  return rows.length ? rows : [emptyEdu()];
};
const parseProjects = (v: unknown): Project[] => toArray(v).map((x: any) => ({ id: String(x?.id || uuid()), name: String(x?.name || ""), description: String(x?.description || ""), link: String(x?.link || "") }));
const parseCerts = (v: unknown): Cert[] => toArray(v).map((x: any) => ({ id: String(x?.id || uuid()), name: String(x?.name || ""), issuer: String(x?.issuer || ""), year: String(x?.year || "") }));

const yearsFromExp = (rows: Exp[]) => {
  const now = new Date();
  const months = rows.reduce((acc, r) => {
    if (!r.start_date) return acc;
    const s = new Date(r.start_date);
    const e = r.end_date ? new Date(r.end_date) : now;
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return acc;
    return acc + (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth() + 1);
  }, 0);
  return Number((months / 12).toFixed(1));
};
const recentRole = (rows: Exp[]) => [...rows].sort((a, b) => (new Date(b.end_date || "").getTime() || 0) - (new Date(a.end_date || "").getTime() || 0))[0]?.role || "";
const fmtRange = (s: string, e: string) => `${s ? new Date(s).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Start"} - ${e ? new Date(e).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present"}`;

const CVBuilder = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { profile: candidateProfile, updateProfile: updateCandidateProfile } = useCandidateProfile();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [personal, setPersonal] = useState<Personal>({ full_name: "", email: "", phone: "", location: "" });
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [exp, setExp] = useState<Exp[]>([emptyExp()]);
  const [edu, setEdu] = useState<Edu[]>([emptyEdu()]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);

  const yearsExperience = useMemo(() => yearsFromExp(exp), [exp]);
  const latestRole = useMemo(() => recentRole(exp), [exp]);
  const localKey = user ? `cv-builder-personal-${user.id}` : "";

  useEffect(() => {
    if (!user) return;
    setPersonal((p) => ({ full_name: p.full_name || profile?.full_name || "", email: p.email || user.email || "", phone: p.phone || user.phone || String(user.user_metadata?.phone || ""), location: p.location || candidateProfile?.location || "" }));
  }, [user, profile?.full_name, candidateProfile?.location]);

  useEffect(() => {
    if (!user || !localKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(localKey);
      if (raw) setPersonal((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch { }
  }, [user, localKey]);

  useEffect(() => {
    if (!localKey || typeof window === "undefined") return;
    window.localStorage.setItem(localKey, JSON.stringify(personal));
  }, [personal, localKey]);

  useEffect(() => {
    const load = async () => {
      if (!user) return setLoading(false);
      const { data, error } = await supabase.from("candidate_resumes").select("*").eq("candidate_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        setResumeId(data.id);
        setSummary(String(data.summary || ""));
        setSkills(toArray(data.skills).map((x) => String(x)).filter(Boolean));
        setExp(parseExp(data.experience_json));
        setEdu(parseEdu(data.education_json));
        setProjects(parseProjects(data.projects_json));
        setCerts(parseCerts(data.certifications_json));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const { data: skillSuggestions = [] } = useQuery({
    queryKey: ["cv-builder-suggestions"],
    queryFn: async (): Promise<string[]> => {
      const merged = new Set(DEFAULT_SKILLS);
      const [jobsRes, profilesRes] = await Promise.all([supabase.from("jobs").select("skills").limit(200), supabase.from("candidate_profiles").select("skills").limit(200)]);
      if (!jobsRes.error) (jobsRes.data || []).forEach((r: any) => toArray(r?.skills).forEach((s) => merged.add(String(s))));
      if (!profilesRes.error) (profilesRes.data || []).forEach((r: any) => toArray(r?.skills).forEach((s) => merged.add(String(s))));
      return Array.from(merged).filter(Boolean).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 60 * 60 * 1000,
  });

  const filteredSuggestions = useMemo(() => {
    const q = skillInput.trim().toLowerCase();
    if (!q) return [];
    return skillSuggestions.filter((s) => s.toLowerCase().includes(q)).filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 8);
  }, [skillInput, skillSuggestions, skills]);

  const addSkill = (raw: string) => {
    const skill = normalize(raw);
    if (!skill || skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return setSkillInput("");
    setSkills((prev) => [...prev, skill]);
    setSkillInput("");
  };

  const genSummary = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No auth session");
      const res = await fetch("/api/ai/generate-summary", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ skills, years_experience: Math.round(yearsExperience), recent_role: latestRole }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Failed to generate summary");
      const payload = await res.json();
      const text = String(payload?.summary || "").trim();
      if (!text) throw new Error("Summary is empty");
      setSummary(text);
      toast({ title: "Summary Generated", description: "AI generated your professional summary." });
    } catch (e: any) {
      toast({ title: "Generation Failed", description: e?.message || "Could not generate summary.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveResume = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const normalizedSkills = skills.map(normalize).filter(Boolean);
      const payload = { candidate_id: user.id, summary: summary.trim(), skills: normalizedSkills, experience_json: exp, education_json: edu, projects_json: projects.filter((x) => x.name || x.description || x.link), certifications_json: certs.filter((x) => x.name || x.issuer || x.year), updated_at: new Date().toISOString() };
      if (resumeId) {
        const { error } = await supabase.from("candidate_resumes").update(payload).eq("id", resumeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("candidate_resumes").insert(payload).select("id").single();
        if (error) throw error;
        setResumeId(data.id);
      }

      const keywords = Array.from(new Set([...normalizedSkills.map((s) => s.toLowerCase()), ...summary.toLowerCase().replace(/[^a-z0-9\\s]/g, " ").split(/\\s+/).filter((w) => w.length >= 4), ...exp.map((x) => x.role.toLowerCase()).join(" ").split(/\\s+/).filter((w) => w.length >= 3)])).slice(0, 30);

      await updateCandidateProfile({ skills: normalizedSkills, keywords, location: personal.location, years_experience: yearsExperience, job_titles: exp.map((x) => x.role).filter((x) => x.trim()).slice(0, 10) });
      const p = await updateProfile({ full_name: personal.full_name || null });
      if (p.error) throw p.error;

      toast({ title: "CV Saved", description: "Resume and profile skills were updated." });
    } catch (e: any) {
      toast({ title: "Save Failed", description: e?.message || "Could not save CV.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const mod = await import("html2pdf.js");
      const html2pdf = (mod.default || mod) as any;
      const file = `${(personal.full_name || "candidate").trim().replace(/\s+/g, "-").toLowerCase()}-cv.pdf`;
      await html2pdf().set({ margin: [0.25, 0.25, 0.25, 0.25], filename: file, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } }).from(previewRef.current).save();
    } catch (e: any) {
      toast({ title: "PDF Export Failed", description: e?.message || "Could not export PDF.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div><h1 className="text-3xl lg:text-4xl font-bold tracking-tight">AI CV Builder</h1><p className="text-muted-foreground mt-1">Build CV, generate summary, save, and export PDF.</p></div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={genSummary} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate AI Summary</Button>
            <Button variant="outline" onClick={exportPdf} disabled={exporting}>{exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Export CV as PDF</Button>
            <Button onClick={saveResume} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save CV</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <div className="space-y-6">
            <Card className="card-float border-0"><CardHeader><CardTitle>Personal Info</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Full name" value={personal.full_name} onChange={(e) => setPersonal((p) => ({ ...p, full_name: e.target.value }))} />
              <Input placeholder="Email" value={personal.email} onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Phone" value={personal.phone} onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))} />
              <Input placeholder="Location" value={personal.location} onChange={(e) => setPersonal((p) => ({ ...p, location: e.target.value }))} />
            </CardContent></Card>

            <Card className="card-float border-0"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Professional Summary</CardTitle><Button size="sm" variant="outline" onClick={genSummary} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate</Button></CardHeader><CardContent><Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Write summary..." /></CardContent></Card>

            <Card className="card-float border-0"><CardHeader><CardTitle>Skills</CardTitle></CardHeader><CardContent className="space-y-3"><div className="relative"><Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add skill and press Enter" onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(skillInput); } }} />{filteredSuggestions.length > 0 && <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-background shadow-lg z-20">{filteredSuggestions.map((s) => <button key={s} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60" type="button" onClick={() => addSkill(s)}>{s}</button>)}</div>}</div><div className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s} className="bg-primary/10 text-primary border-primary/30">{s}<button className="ml-2" type="button" onClick={() => setSkills((v) => v.filter((x) => x !== s))}>×</button></Badge>)}</div></CardContent></Card>

            <Card className="card-float border-0"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Work Experience</CardTitle><Button size="sm" variant="outline" onClick={() => setExp((v) => [...v, emptyExp()])}><Plus className="w-4 h-4 mr-2" />Add</Button></CardHeader><CardContent className="space-y-4">{exp.map((r, i) => <div key={r.id} className="rounded-xl border border-border/50 p-4 space-y-3"><div className="flex items-center justify-between"><h4 className="font-medium">Experience #{i + 1}</h4>{exp.length > 1 && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setExp((v) => v.filter((x) => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input placeholder="Company" value={r.company} onChange={(e) => setExp((v) => v.map((x) => x.id === r.id ? { ...x, company: e.target.value } : x))} /><Input placeholder="Role" value={r.role} onChange={(e) => setExp((v) => v.map((x) => x.id === r.id ? { ...x, role: e.target.value } : x))} /><Input type="date" value={r.start_date} onChange={(e) => setExp((v) => v.map((x) => x.id === r.id ? { ...x, start_date: e.target.value } : x))} /><Input type="date" value={r.end_date} onChange={(e) => setExp((v) => v.map((x) => x.id === r.id ? { ...x, end_date: e.target.value } : x))} /></div><Textarea rows={3} placeholder="Description" value={r.description} onChange={(e) => setExp((v) => v.map((x) => x.id === r.id ? { ...x, description: e.target.value } : x))} /></div>)}</CardContent></Card>

            <Card className="card-float border-0"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Education</CardTitle><Button size="sm" variant="outline" onClick={() => setEdu((v) => [...v, emptyEdu()])}><Plus className="w-4 h-4 mr-2" />Add</Button></CardHeader><CardContent className="space-y-4">{edu.map((r, i) => <div key={r.id} className="rounded-xl border border-border/50 p-4 space-y-3"><div className="flex items-center justify-between"><h4 className="font-medium">Education #{i + 1}</h4>{edu.length > 1 && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setEdu((v) => v.filter((x) => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button>}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Input placeholder="School" value={r.school} onChange={(e) => setEdu((v) => v.map((x) => x.id === r.id ? { ...x, school: e.target.value } : x))} /><Input placeholder="Degree" value={r.degree} onChange={(e) => setEdu((v) => v.map((x) => x.id === r.id ? { ...x, degree: e.target.value } : x))} /><Input placeholder="Year" value={r.year} onChange={(e) => setEdu((v) => v.map((x) => x.id === r.id ? { ...x, year: e.target.value } : x))} /></div></div>)}</CardContent></Card>

            <Card className="card-float border-0"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Projects (Optional)</CardTitle><Button size="sm" variant="outline" onClick={() => setProjects((v) => [...v, emptyProject()])}><Plus className="w-4 h-4 mr-2" />Add</Button></CardHeader><CardContent className="space-y-3">{projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects added.</p> : projects.map((r) => <div key={r.id} className="rounded-xl border border-border/50 p-4 space-y-3"><div className="flex justify-end"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setProjects((v) => v.filter((x) => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button></div><Input placeholder="Project name" value={r.name} onChange={(e) => setProjects((v) => v.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} /><Input placeholder="Project link" value={r.link} onChange={(e) => setProjects((v) => v.map((x) => x.id === r.id ? { ...x, link: e.target.value } : x))} /><Textarea rows={3} placeholder="Project description" value={r.description} onChange={(e) => setProjects((v) => v.map((x) => x.id === r.id ? { ...x, description: e.target.value } : x))} /></div>)}</CardContent></Card>

            <Card className="card-float border-0"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Certifications (Optional)</CardTitle><Button size="sm" variant="outline" onClick={() => setCerts((v) => [...v, emptyCert()])}><Plus className="w-4 h-4 mr-2" />Add</Button></CardHeader><CardContent className="space-y-3">{certs.length === 0 ? <p className="text-sm text-muted-foreground">No certifications added.</p> : certs.map((r) => <div key={r.id} className="rounded-xl border border-border/50 p-4 space-y-3"><div className="flex justify-end"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCerts((v) => v.filter((x) => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Input placeholder="Certification" value={r.name} onChange={(e) => setCerts((v) => v.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} /><Input placeholder="Issuer" value={r.issuer} onChange={(e) => setCerts((v) => v.map((x) => x.id === r.id ? { ...x, issuer: e.target.value } : x))} /><Input placeholder="Year" value={r.year} onChange={(e) => setCerts((v) => v.map((x) => x.id === r.id ? { ...x, year: e.target.value } : x))} /></div></div>)}</CardContent></Card>
          </div>

          <div className="xl:sticky xl:top-24">
            <Card className="card-float border-0">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Live CV Preview</CardTitle><Badge variant="outline"><FileText className="w-3.5 h-3.5 mr-1" />Auto Updated</Badge></CardHeader>
              <CardContent>
                <div ref={previewRef} className="bg-white text-black rounded-xl border border-border p-6 md:p-8 min-h-[960px] space-y-5">
                  <div><h2 className="text-3xl font-bold">{personal.full_name || "Your Name"}</h2><p className="text-sm text-gray-700 mt-2">{[personal.email, personal.phone, personal.location].filter((x) => x.trim()).join(" | ") || "Email | Phone | Location"}</p></div>
                  <Separator className="bg-gray-200" />
                  <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Professional Summary</h3><p className="text-sm leading-6 whitespace-pre-wrap">{summary || "Add summary..."}</p></section>
                  <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Skills</h3>{skills.length ? <div className="flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="px-2 py-1 bg-gray-100 rounded text-xs">{s}</span>)}</div> : <p className="text-sm text-gray-500">No skills added.</p>}</section>
                  <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Work Experience</h3>{exp.some((x) => x.company || x.role || x.description) ? <div className="space-y-4">{exp.map((x) => <div key={x.id}><div className="flex justify-between items-start"><div><p className="font-semibold text-sm">{x.role || "Role"}</p><p className="text-sm text-gray-700">{x.company || "Company"}</p></div><p className="text-xs text-gray-600">{fmtRange(x.start_date, x.end_date)}</p></div>{x.description && <p className="text-sm mt-1 whitespace-pre-wrap">{x.description}</p>}</div>)}</div> : <p className="text-sm text-gray-500">No experience added.</p>}</section>
                  <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Education</h3>{edu.some((x) => x.school || x.degree || x.year) ? <div className="space-y-3">{edu.map((x) => <div key={x.id} className="text-sm"><p className="font-semibold">{x.degree || "Degree"}</p><p className="text-gray-700">{x.school || "School"}{x.year ? `, ${x.year}` : ""}</p></div>)}</div> : <p className="text-sm text-gray-500">No education added.</p>}</section>
                  {projects.length > 0 && <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Projects</h3><div className="space-y-3">{projects.map((x) => <div key={x.id} className="text-sm"><p className="font-semibold">{x.name || "Project"}</p>{x.description && <p>{x.description}</p>}{x.link && <p className="text-blue-700 break-all">{x.link}</p>}</div>)}</div></section>}
                  {certs.length > 0 && <section><h3 className="text-sm uppercase tracking-wide font-semibold text-gray-700 mb-2">Certifications</h3><div className="space-y-2">{certs.map((x) => <p key={x.id} className="text-sm"><span className="font-semibold">{x.name || "Certification"}</span>{(x.issuer || x.year) && <span>{` - ${x.issuer || "Issuer"}${x.year ? ` (${x.year})` : ""}`}</span>}</p>)}</div></section>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CVBuilder;
