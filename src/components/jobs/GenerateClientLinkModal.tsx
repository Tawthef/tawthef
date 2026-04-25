import { useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateClientReviewLink,
  useClientReviewLinks,
  useRevokeClientReviewLink,
  getClientReviewUrl,
} from "@/hooks/useClientReview";
import { toast } from "sonner";

interface GenerateClientLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: { id: string; title: string };
}

export function GenerateClientLinkModal({ open, onOpenChange, job }: GenerateClientLinkModalProps) {
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresDays, setExpiresDays] = useState("30");

  const createLink = useCreateClientReviewLink();
  const revokeLink = useRevokeClientReviewLink();
  const { data: activeLinks = [] } = useClientReviewLinks(job.id);

  const shareUrl = generatedToken ? getClientReviewUrl(generatedToken) : null;

  async function handleGenerate() {
    try {
      const token = await createLink.mutateAsync({ jobId: job.id, expiresDays: parseInt(expiresDays) });
      setGeneratedToken(token);
    } catch {
      toast.error("Failed to generate client review link");
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke(linkId: string) {
    try {
      await revokeLink.mutateAsync({ linkId, jobId: job.id });
      if (generatedToken) setGeneratedToken(null);
      toast.success("Link revoked");
    } catch {
      toast.error("Failed to revoke link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setGeneratedToken(null); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Generate Client Review Link
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share all submitted candidates for <span className="font-medium text-foreground">{job.title}</span> with your client.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
              <Label>Client Review URL</Label>
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
                Client opens this link — no login required. Shows all submitted (non-rejected) candidates in a reviewable table.
              </p>
            </div>
          ) : (
            <Button className="w-full" onClick={handleGenerate} disabled={createLink.isPending}>
              {createLink.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" />Generate Client Review Link</>
              )}
            </Button>
          )}

          {activeLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Active links</p>
              {activeLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px]">{link.view_count} views</Badge>
                    <span className="text-muted-foreground truncate">
                      Expires {new Date(link.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleRevoke(link.id)}
                    disabled={revokeLink.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
