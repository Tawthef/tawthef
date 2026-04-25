import { useState } from "react";
import { Copy, Check, Download, Mail, FileSpreadsheet, Link2, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateCandidateShare,
  useRevokeCandidateShare,
  useCandidateShares,
  getShareUrl,
  CandidateShareProfile,
} from "@/hooks/useCandidateShare";
import { toast } from "sonner";

interface CandidateBasic {
  id: string;
  full_name: string;
  email?: string;
  skills?: string[];
  years_experience?: number;
  location?: string;
  job_title?: string;
  summary?: string;
}

interface ShareCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateBasic;
  jobId?: string;
  /** Pass the share profile data if already loaded (used for PDF/CSV content) */
  profileData?: CandidateShareProfile | null;
}

export function ShareCandidateModal({
  open,
  onOpenChange,
  candidate,
  jobId,
  profileData,
}: ShareCandidateModalProps) {
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresDays, setExpiresDays] = useState("30");
  const [pdfLoading, setPdfLoading] = useState(false);

  const createShare = useCreateCandidateShare();
  const revokeShare = useRevokeCandidateShare();
  const { data: existingShares } = useCandidateShares(candidate.id);

  const shareUrl = generatedToken ? getShareUrl(generatedToken) : null;

  async function handleGenerateLink() {
    try {
      const token = await createShare.mutateAsync({
        candidateId: candidate.id,
        jobId,
        expiresDays: parseInt(expiresDays),
      });
      setGeneratedToken(token);
    } catch {
      toast.error("Failed to generate share link");
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke(shareId: string) {
    try {
      await revokeShare.mutateAsync({ shareId, candidateId: candidate.id });
      if (generatedToken) setGeneratedToken(null);
      toast.success("Link revoked");
    } catch {
      toast.error("Failed to revoke link");
    }
  }

  async function handlePdfExport() {
    setPdfLoading(true);
    try {
      const el = document.getElementById("share-candidate-pdf-target");
      if (!el) throw new Error("Target element not found");
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${candidate.full_name.replace(/\s+/g, "_")}_profile.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Profile exported as image");
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleCsvExport() {
    const profile = profileData;
    const rows: string[][] = [
      ["Field", "Value"],
      ["Name", candidate.full_name],
      ["Email", candidate.email ?? ""],
      ["Job Title", candidate.job_title ?? profile?.job_title ?? ""],
      ["Location", candidate.location ?? profile?.location ?? ""],
      ["Years of Experience", String(candidate.years_experience ?? profile?.years_experience ?? "")],
      ["Summary", (profile?.summary ?? candidate.summary ?? "").replace(/,/g, ";")],
      ["Skills", (profile?.skills ?? candidate.skills ?? []).join("; ")],
      ["Languages", (profile?.languages ?? []).join("; ")],
    ];

    if (profile?.experience) {
      profile.experience.forEach((exp: any, i: number) => {
        rows.push([`Experience ${i + 1}`, `${exp.title ?? ""} at ${exp.company ?? ""} (${exp.duration ?? ""})`]);
      });
    }
    if (profile?.education) {
      profile.education.forEach((edu: any, i: number) => {
        rows.push([`Education ${i + 1}`, `${edu.degree ?? ""} — ${edu.institution ?? ""}`]);
      });
    }

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${candidate.full_name.replace(/\s+/g, "_")}_profile.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Profile exported as CSV");
  }

  function handleEmailShare() {
    if (!shareUrl) {
      toast.error("Generate a shareable link first");
      return;
    }
    const subject = encodeURIComponent(`Candidate Profile: ${candidate.full_name}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find the candidate profile for ${candidate.full_name} below:\n\n${shareUrl}\n\nThis link expires in ${expiresDays} days.\n\nBest regards`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const activeShares = existingShares?.filter((s) => new Date(s.expires_at) > new Date()) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Share {candidate.full_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="link" className="text-xs">Link</TabsTrigger>
            <TabsTrigger value="pdf" className="text-xs">PDF / Image</TabsTrigger>
            <TabsTrigger value="csv" className="text-xs">CSV</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
          </TabsList>

          {/* ── Shareable Link ── */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Link expiry</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareUrl ? (
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-xs font-mono" />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="outline">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view the full candidate profile. No login required.
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={handleGenerateLink}
                disabled={createShare.isPending}
              >
                {createShare.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Generate Shareable Link</>
                )}
              </Button>
            )}

            {/* Active shares for this candidate */}
            {activeShares.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Active links</p>
                {activeShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px]">
                        {share.view_count} views
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        Expires {new Date(share.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleRevoke(share.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PDF / Image Export ── */}
          <TabsContent value="pdf" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Downloads the candidate's profile as a high-resolution PNG image (suitable for printing or attaching to emails).
            </p>
            <div
              id="share-candidate-pdf-target"
              className="border rounded-lg p-5 bg-white space-y-3 text-sm"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <div className="flex items-start gap-3">
                {profileData?.avatar_url ? (
                  <img src={profileData.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {candidate.full_name[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-base">{candidate.full_name}</p>
                  <p className="text-muted-foreground text-xs">{candidate.job_title ?? profileData?.job_title}</p>
                  <p className="text-muted-foreground text-xs">{candidate.location ?? profileData?.location}</p>
                </div>
              </div>
              {(profileData?.summary ?? candidate.summary) && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {profileData?.summary ?? candidate.summary}
                </p>
              )}
              {(profileData?.skills ?? candidate.skills ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(profileData?.skills ?? candidate.skills ?? []).slice(0, 12).map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 pt-2 border-t">Shared via Tawthef · tawthef.com</p>
            </div>
            <Button
              className="w-full"
              onClick={handlePdfExport}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Download as Image</>
              )}
            </Button>
          </TabsContent>

          {/* ── CSV Export ── */}
          <TabsContent value="csv" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Downloads all candidate data as a CSV file — open directly in Excel, Google Sheets, or any spreadsheet tool.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Columns included:</p>
              <p>Name · Email · Job Title · Location · Years of Experience</p>
              <p>Summary · Skills · Languages</p>
              <p>Experience entries · Education entries</p>
            </div>
            <Button className="w-full" onClick={handleCsvExport}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Download as CSV
            </Button>
          </TabsContent>

          {/* ── Email ── */}
          <TabsContent value="email" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Opens your email client with a pre-written message containing the shareable link.
            </p>
            {!shareUrl && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Generate a shareable link first (Link tab), then come back here to email it.
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleEmailShare}
              disabled={!shareUrl}
            >
              <Mail className="w-4 h-4 mr-2" />
              Open Email Client
            </Button>
            {shareUrl && (
              <p className="text-xs text-muted-foreground text-center">
                Your default email app will open with the link pre-filled.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
