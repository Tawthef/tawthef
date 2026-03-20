import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BriefcaseBusiness, Gift, Loader2, Sparkles, Upload, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ShareBanner from "@/components/ShareBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  clearWelcomeShareContext,
  generateWelcomeShareCaption,
  getWelcomeShareReferralLink,
  readWelcomeShareContext,
  type WelcomeShareContext,
} from "@/lib/welcomeShare";

const formatRoleLabel = (role?: string | null) => {
  if (role === "agency") return "Agency Recruiter";
  if (role === "employer") return "Employer";
  return "Candidate";
};

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const sanitizeFileName = (value: string) =>
  value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");

const WelcomeShare = () => {
  const { user } = useAuth();
  const { profile, isLoading: isProfileLoading, updateProfile } = useProfile();
  const { toast } = useToast();
  const [shareContext] = useState<WelcomeShareContext | null>(() => readWelcomeShareContext());
  const [isMarkingBannerShown, setIsMarkingBannerShown] = useState(false);
  const [hasMarkedBannerShown, setHasMarkedBannerShown] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    clearWelcomeShareContext();
  }, []);

  useEffect(() => {
    let isActive = true;

    if (profile?.share_banner_shown !== false || hasMarkedBannerShown) return () => {
      isActive = false;
    };

    const markBannerShown = async () => {
      setHasMarkedBannerShown(true);
      setIsMarkingBannerShown(true);
      await updateProfile({ share_banner_shown: true });
      if (isActive) setIsMarkingBannerShown(false);
    };

    void markBannerShown();

    return () => {
      isActive = false;
    };
  }, [hasMarkedBannerShown, profile?.share_banner_shown, updateProfile]);

  const candidateProfileQuery = useQuery({
    queryKey: ["welcome-share", "candidate-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("job_titles")
        .eq("candidate_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as { job_titles?: string[] | null } | null;
    },
    enabled: !!user?.id && profile?.role === "candidate",
    staleTime: 60 * 1000,
  });

  const organizationQuery = useQuery({
    queryKey: ["welcome-share", "organization", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (error) throw error;
      return data as { name?: string | null } | null;
    },
    enabled: !!profile?.organization_id && !!profile?.role && ["employer", "agency"].includes(profile.role),
    staleTime: 60 * 1000,
  });

  if (!isProfileLoading && (!profile || !["candidate", "employer", "agency"].includes(profile.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = isProfileLoading || candidateProfileQuery.isLoading || organizationQuery.isLoading || isMarkingBannerShown;

  const name =
    profile?.full_name ||
    shareContext?.fullName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Tawthef Member";

  const profession =
    candidateProfileQuery.data?.job_titles?.[0] ||
    user?.user_metadata?.profession ||
    user?.user_metadata?.job_title ||
    "Career Explorer";

  const company =
    organizationQuery.data?.name ||
    shareContext?.companyName ||
    user?.user_metadata?.company_name ||
    "Your Company";

  const roleLabel = formatRoleLabel(profile?.role);
  const variant = profile?.role === "candidate" ? "candidate" : "recruiter";
  const referralLink = getWelcomeShareReferralLink(user?.id);
  const bannerAvatarUrl = avatarUrlOverride || profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const caption = useMemo(() => {
    return generateWelcomeShareCaption({
      variant,
      name,
      profession,
      company,
      roleLabel,
      referralLink,
    });
  }, [company, name, profession, referralLink, roleLabel, variant]);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please choose an image file for your profile photo.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: "Profile photos must be 5MB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/welcome-share-${Date.now()}-${sanitizeFileName(file.name || `avatar.${extension}`)}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await updateProfile({ avatar_url: publicUrl });
      if (profileError) throw profileError;

      setAvatarUrlOverride(publicUrl);
      toast({
        title: "Profile photo updated",
        description: "Your banner preview now uses your uploaded photo.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload your profile photo.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Welcome to Tawthef
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Share your arrival</h1>
          <p className="max-w-2xl text-muted-foreground">
            Your onboarding banner is ready. Download it, copy the caption, or post it to LinkedIn before you continue to your dashboard.
          </p>
        </section>

        {shareContext?.inviteCodeApplied && variant === "recruiter" && (
          <Alert className="border-success/20 bg-success/5 text-success">
            <Gift className="h-4 w-4" />
            <AlertTitle>Invite code applied</AlertTitle>
            <AlertDescription>You received free access via invite code</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="card-dashboard">
              <CardContent className="p-6">
                <Skeleton className="aspect-square w-full rounded-[2rem]" />
              </CardContent>
            </Card>
            <Card className="card-dashboard">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Preview your post</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review the banner and caption before you share. Your post now includes a stronger CTA, hashtags, and your personal invite link.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload profile photo
              </Button>
              <p className="text-sm text-muted-foreground">
                Add a clear profile image to improve how your banner appears when you share it.
              </p>
            </div>
            <ShareBanner
              variant={variant}
              name={name}
              profession={profession}
              company={company}
              roleLabel={roleLabel}
              avatarUrl={bannerAvatarUrl}
              caption={caption}
            />
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="card-dashboard">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Grow your reach</p>
                <p className="text-sm text-muted-foreground">
                  Announce your Tawthef profile to your network and bring more eyes to your next move.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="rounded-2xl bg-accent/15 p-3 text-accent">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Promote your presence</p>
                <p className="text-sm text-muted-foreground">
                  Use the generated PNG on LinkedIn, WhatsApp, or internal channels without any extra design work.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard md:col-span-2 xl:col-span-1">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
              <div className="space-y-1">
                <p className="font-medium">Continue onboarding</p>
                <p className="text-sm text-muted-foreground">
                  You can come back later, but this is the best moment to share your new Tawthef presence.
                </p>
              </div>
              <div className="grid gap-3">
                <Button asChild className="w-full">
                  <Link to="/dashboard">
                    Remind me later
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard">Skip</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default WelcomeShare;
