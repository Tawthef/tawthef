import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";

const RecruiterVerificationBanner = () => {
  const { profile } = useProfile();

  if (!profile || !["employer", "agency"].includes(profile.role) || profile.verification_status === "verified") {
    return null;
  }

  const description =
    profile.verification_status === "rejected"
      ? "Update your verification documents and resubmit your recruiter account for review."
      : "Complete recruiter verification to unlock job posting and resume search.";

  return (
    <Alert className="border-warning/30 bg-warning/5">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertTitle>Your account is under review</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{description}</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/verification">Open Verification</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default RecruiterVerificationBanner;
