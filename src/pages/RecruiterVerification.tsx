import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BadgeCheck, FileText, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRecruiterVerificationPortal } from "@/hooks/useRecruiterVerificationPortal";

const getStatusClass = (status: string | null | undefined) => {
  if (status === "verified") return "bg-success/10 text-success border-success/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const getStatusMessage = (status: string | null | undefined) => {
  if (status === "verified") return "Your recruiter account is verified.";
  if (status === "rejected") return "Your last verification submission was rejected. Upload updated documents to restart review.";
  return "Your verification request is pending review.";
};

const getFileNameFromUrl = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() || "Document");
  } catch {
    return "Document";
  }
};

const RecruiterVerification = () => {
  const { toast } = useToast();
  const { profile, companyName, documents, uploadDocuments, isUploading } = useRecruiterVerificationPortal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const isRecruiter = profile?.role === "employer" || profile?.role === "agency";

  const verificationStatus = profile?.verification_status || "pending";
  const selectedFileNames = useMemo(() => selectedFiles.map((file) => file.name), [selectedFiles]);

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isRecruiter) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No documents selected",
        description: "Choose one or more verification documents before uploading.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadDocuments(selectedFiles);
      toast({
        title: "Documents uploaded",
        description: "Your recruiter verification documents were uploaded successfully.",
      });
      setSelectedFiles([]);
    } catch (uploadError: any) {
      toast({
        title: "Upload failed",
        description: uploadError?.message || "Could not upload verification documents.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Recruiter Verification
            </h1>
            {verificationStatus === "verified" && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                Verified Recruiter
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Upload your business documents and track your verification status for {companyName}.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className={getStatusClass(verificationStatus)}>
                {verificationStatus}
              </Badge>
              <p className="text-sm text-muted-foreground">{getStatusMessage(verificationStatus)}</p>
              <p className="text-xs text-muted-foreground">
                Status message: {verificationStatus}
              </p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                />
                <p className="text-xs text-muted-foreground">
                  Upload company registration, business license, or similar documents. Max 10MB per file.
                </p>
              </div>

              {selectedFileNames.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected files</p>
                  <div className="space-y-1">
                    {selectedFileNames.map((fileName) => (
                      <div key={fileName} className="text-sm text-muted-foreground">
                        {fileName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                Upload Documents
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Submitted Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No verification documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    {getFileNameFromUrl(url)}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterVerification;
