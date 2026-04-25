import { useParams, Link } from "react-router-dom";
import { Clock, Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useClientReviewSheet, ClientReviewCandidate } from "@/hooks/useClientReview";
import logo from "@/assets/tawthef-logo-en.png";

export default function ClientReviewPage() {
  const { token } = useParams<{ token: string }>();
  const { data: sheet, isLoading } = useClientReviewSheet(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Link unavailable</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            This review link has expired or been revoked. Please contact the recruiter for a new link.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm">Go to Tawthef →</Link>
        </main>
        <PageFooter sharedBy="" organization="" expiresAt="" />
      </div>
    );
  }

  const expiresLabel = new Date(sheet.expires_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  function handleExportCsv() {
    const headers = [
      "Sr. No.", "Candidate Name", "Position Name", "Gender", "Nationality", "Age",
      "Current Location", "Years of Experience", "Education", "Additional Qualifications",
      "Agency", "Date of Submission", "Batch", "Remarks"
    ];

    const rows = sheet.candidates.map((c: ClientReviewCandidate, i: number) => [
      String(i + 1),
      c.full_name,
      c.position_name,
      "—",
      "—",
      "—",
      c.location || "—",
      c.years_experience != null ? String(c.years_experience) : "—",
      Array.isArray(c.education) ? c.education.join("; ") : "—",
      Array.isArray(c.certifications) ? c.certifications.map((cert: any) => cert.name || cert).join("; ") : "—",
      c.agency_name || "Direct",
      new Date(c.submitted_at).toLocaleDateString("en-GB"),
      String(i + 1),
      "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sheet.job_title.replace(/\s+/g, "_")}_candidates.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container max-w-full px-4 py-8 space-y-6">
        {/* Job info + export */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">{sheet.job_title}</h1>
            <p className="text-muted-foreground mt-1">{sheet.organization_name}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span>{sheet.candidates.length} candidate{sheet.candidates.length !== 1 ? "s" : ""} submitted</span>
              <span>·</span>
              <span>Link expires {expiresLabel}</span>
            </div>
          </div>
          <Button variant="outline" onClick={handleExportCsv} className="shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Candidates table */}
        {sheet.candidates.length === 0 ? (
          <div className="max-w-7xl mx-auto text-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No candidates submitted yet</p>
            <p className="text-sm mt-1">The recruiter has not submitted any candidates for this position yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
            <table className="w-full text-sm border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-muted/50">
                  {[
                    "Sr. No.", "Candidate Name", "Position Name", "Gender", "Nationality",
                    "Age", "Current Location", "Years of Experience", "Education",
                    "Additional Qualification / Certificates", "Agency", "Date of Submission",
                    "Batch", "Remarks"
                  ].map((col) => (
                    <th
                      key={col}
                      className="border border-border/30 px-3 py-3 text-left font-semibold text-foreground text-xs whitespace-nowrap bg-primary/5"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.candidates.map((c: ClientReviewCandidate, i: number) => (
                  <tr key={i} className="even:bg-muted/20 hover:bg-muted/40 transition-colors">
                    <td className="border border-border/20 px-3 py-3 text-center font-medium">{i + 1}</td>
                    <td className="border border-border/20 px-3 py-3 font-medium whitespace-nowrap">{c.full_name}</td>
                    <td className="border border-border/20 px-3 py-3 whitespace-nowrap">{c.position_name}</td>
                    <td className="border border-border/20 px-3 py-3 text-center text-muted-foreground">—</td>
                    <td className="border border-border/20 px-3 py-3 text-center text-muted-foreground">—</td>
                    <td className="border border-border/20 px-3 py-3 text-center text-muted-foreground">—</td>
                    <td className="border border-border/20 px-3 py-3">{c.location || "—"}</td>
                    <td className="border border-border/20 px-3 py-3 text-center">
                      {c.years_experience != null ? `${c.years_experience}+` : "—"}
                    </td>
                    <td className="border border-border/20 px-3 py-3 max-w-[220px]">
                      {Array.isArray(c.education) && c.education.length > 0
                        ? c.education.join(", ")
                        : "—"}
                    </td>
                    <td className="border border-border/20 px-3 py-3 max-w-[200px]">
                      {Array.isArray(c.certifications) && c.certifications.length > 0
                        ? c.certifications.map((cert: any) => cert.name || String(cert)).join(", ")
                        : "—"}
                    </td>
                    <td className="border border-border/20 px-3 py-3 whitespace-nowrap">{c.agency_name || "Direct"}</td>
                    <td className="border border-border/20 px-3 py-3 whitespace-nowrap">
                      {new Date(c.submitted_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </td>
                    <td className="border border-border/20 px-3 py-3 text-center">{i + 1}</td>
                    <td className="border border-border/20 px-3 py-3 min-w-[120px]"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <PageFooter
        sharedBy={sheet.shared_by_name}
        organization={sheet.organization_name}
        expiresAt={expiresLabel}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm py-3 px-4">
      <div className="container max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="Tawthef" className="h-10 w-auto" />
        </Link>
        <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          Confidential · For Client Review Only
        </span>
      </div>
    </header>
  );
}

function PageFooter({ sharedBy, organization, expiresAt }: { sharedBy: string; organization: string; expiresAt: string }) {
  return (
    <footer className="border-t bg-muted/30 py-6 px-4 mt-8">
      <div className="container max-w-7xl mx-auto text-center space-y-1">
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
          <Link to="/" className="text-primary hover:underline font-medium">Tawthef</Link>
          {" "}— AI-powered recruitment platform
        </p>
      </div>
    </footer>
  );
}
