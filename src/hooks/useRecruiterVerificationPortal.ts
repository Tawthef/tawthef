import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const sanitizeFileName = (value: string) =>
  value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");

export function useRecruiterVerificationPortal() {
  const { profile, updateProfile, refetch } = useProfile();

  const organizationQuery = useQuery({
    queryKey: ["recruiter-verification-org", profile?.organization_id],
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
    enabled: !!profile?.organization_id,
    staleTime: 60 * 1000,
  });

  const documents = useMemo(() => profile?.verification_documents || [], [profile?.verification_documents]);

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!profile?.id) throw new Error("Not authenticated");
      if (files.length === 0) throw new Error("Select at least one document.");

      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`${file.name} exceeds the 10MB limit.`);
        }

        const filePath = `${profile.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("recruiter_documents")
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("recruiter_documents").getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }

      const uniqueDocuments = Array.from(new Set([...(profile.verification_documents || []), ...uploadedUrls]));

      const nextStatus = profile.verification_status === "verified" ? "verified" : "pending";
      const { error } = await updateProfile({
        verification_documents: uniqueDocuments,
        verification_status: nextStatus,
      });

      if (error) throw error;
      await refetch();
      return uploadedUrls;
    },
  });

  return {
    profile,
    companyName: organizationQuery.data?.name || "Your Company",
    documents,
    uploadDocuments: uploadDocumentsMutation.mutateAsync,
    isUploading: uploadDocumentsMutation.isPending,
    uploadError: uploadDocumentsMutation.error,
  };
}
