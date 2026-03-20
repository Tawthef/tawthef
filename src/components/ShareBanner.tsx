import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Download, Linkedin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logo from "@/assets/tawthef-logo-en.png";

type ShareBannerVariant = "candidate" | "recruiter";

interface ShareBannerProps {
  variant: ShareBannerVariant;
  name: string;
  profession?: string;
  company?: string;
  roleLabel?: string;
  avatarUrl?: string | null;
  caption: string;
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * BannerTemplate
 *
 * Uses CSS container queries (containerType: "size") so every measurement is
 * expressed in `cqw` (container-query width units). This means the banner
 * looks IDENTICAL whether it is rendered at 400 px (in-page preview) or
 * 1 200 px (hidden export node) — text never wraps unexpectedly.
 *
 * Mapping guide (1 cqw = 1% of the container width):
 *   1200 px export  |  preview at any size
 *   2.5 cqw ≈ 30 px |  scales down proportionally
 *   7   cqw ≈ 84 px |  …
 *   9.5 cqw ≈ 114 px|  (avatar)
 */
const BannerTemplate = ({
  variant,
  name,
  profession,
  company,
  roleLabel,
  avatarUrl,
}: Omit<ShareBannerProps, "caption"> & { preview?: boolean }) => {
  const rocket = "\u{1F680}";
  const message =
    variant === "candidate"
      ? `${rocket} I just joined Tawthef`
      : `${rocket} We're hiring on Tawthef`;
  const subtitle =
    variant === "candidate"
      ? profession || "Open to new opportunities"
      : [company || "Your company", roleLabel].filter(Boolean).join(" · ");

  const textShadow = "0 4px 16px rgba(15, 23, 42, 0.45)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        containerType: "size",
        position: "relative",
        overflow: "hidden",
        borderRadius: "3cqw",
        background:
          "linear-gradient(155deg, #0d1b3e 0%, #1a2f7a 38%, #1d4ed8 72%, #2563eb 100%)",
        color: "white",
        flexShrink: 0,
      }}
    >
      {/* Grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.11) 1px, transparent 1px)",
          backgroundSize: "4.3cqw 4.3cqw",
        }}
      />
      {/* Radial glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 80% 15%, rgba(255,255,255,0.14) 0%, transparent 25%), radial-gradient(circle at 15% 85%, rgba(96,165,250,0.18) 0%, transparent 30%)",
        }}
      />
      {/* Inner border frame */}
      <div
        style={{
          position: "absolute",
          inset: "1cqw",
          borderRadius: "2.3cqw",
          border: "1px solid rgba(255,255,255,0.14)",
          pointerEvents: "none",
        }}
      />
      {/* Glowing orbs */}
      <div
        style={{
          position: "absolute",
          right: "8%",
          top: "6%",
          width: "22%",
          height: "22%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.10)",
          filter: "blur(3cqw)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "8%",
          width: "18%",
          height: "18%",
          borderRadius: "50%",
          background: "rgba(96,165,250,0.15)",
          filter: "blur(3cqw)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          textAlign: "center",
          paddingInline: "4cqw",
          paddingTop: "4cqw",
          paddingBottom: "4cqw",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Tawthef"
          draggable={false}
          style={{
            width: "13cqw",
            height: "auto",
            flexShrink: 0,
            display: "block",
            filter:
              "brightness(0) invert(1) drop-shadow(0 0.3cqw 1cqw rgba(15,23,42,0.4))",
          }}
        />

        {/* Text block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5cqw",
          }}
        >
          {/* "🚀 I just joined Tawthef" — on ONE line */}
          <p
            style={{
              fontSize: "2.6cqw",
              fontWeight: 600,
              color: "white",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              textShadow,
              margin: 0,
            }}
          >
            {message}
          </p>

          {/* Name */}
          <p
            style={{
              fontSize: "5.8cqw",
              fontWeight: 700,
              backgroundImage:
                "linear-gradient(180deg, #ffffff 0%, #bfdbfe 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              lineHeight: 1.05,
              maxWidth: "90%",
              wordBreak: "break-word",
              margin: 0,
            }}
          >
            {name}
          </p>

          {/* Subtitle / profession */}
          <p
            style={{
              fontSize: "2cqw",
              fontWeight: 400,
              color: "rgba(255,255,255,0.9)",
              textShadow,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Avatar — rounded portrait rectangle */}
        <div
          style={{
            width: "13cqw",
            height: "16cqw",
            flexShrink: 0,
            borderRadius: "2cqw",
            overflow: "hidden",
            border: "0.4cqw solid rgba(255,255,255,0.9)",
            boxShadow:
              "0 0 0 0.15cqw rgba(255,255,255,0.35), 0 1cqw 4cqw rgba(15,23,42,0.4)",
            background: "linear-gradient(135deg, #f5efe0 0%, #ede0c4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: "5.5cqw",
                fontWeight: 700,
                color: "#334155",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {name.trim().charAt(0).toUpperCase() || "T"}
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1cqw",
            textShadow,
          }}
        >
          <p
            style={{
              fontSize: "2cqw",
              color: "rgba(255,255,255,0.75)",
              fontWeight: 400,
              margin: 0,
            }}
          >
            Ready to connect?
          </p>
          <p
            style={{
              fontSize: "2cqw",
              color: "white",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Join me on tawthef.com
          </p>
          <p
            style={{
              fontSize: "1.6cqw",
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
              letterSpacing: "0.2em",
              margin: 0,
            }}
          >
            #Tawthef
          </p>
        </div>
      </div>
    </div>
  );
};

const ShareBanner = ({
  variant,
  name,
  profession,
  company,
  roleLabel,
  avatarUrl,
  caption,
}: ShareBannerProps) => {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(avatarUrl || null);
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;

    if (!avatarUrl) {
      setResolvedAvatarUrl(null);
      return () => {
        isActive = false;
      };
    }

    const loadAvatar = async () => {
      try {
        const response = await fetch(avatarUrl);
        const blob = await response.blob();
        const dataUrl = await toDataUrl(blob);
        if (isActive) setResolvedAvatarUrl(dataUrl);
      } catch {
        if (isActive) setResolvedAvatarUrl(null);
      }
    };

    void loadAvatar();

    return () => {
      isActive = false;
    };
  }, [avatarUrl]);

  const generationKey = useMemo(
    () => [variant, name, profession, company, roleLabel, resolvedAvatarUrl].join("|"),
    [variant, name, profession, company, roleLabel, resolvedAvatarUrl],
  );

  useEffect(() => {
    let isActive = true;

    const generateImage = async () => {
      if (!exportRef.current) return;

      setIsGenerating(true);

      try {
        if ("fonts" in document) {
          await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        }

        await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));

        const png = await toPng(exportRef.current, {
          cacheBust: true,
          pixelRatio: 1,
          canvasWidth: 1200,
          canvasHeight: 1200,
        });

        if (isActive) setImageUrl(png);
      } catch (error) {
        console.error("[ShareBanner] Failed to generate banner:", error);
        if (isActive) {
          setImageUrl(null);
          toast({
            title: "Banner preview unavailable",
            description: "The share banner could not be rendered as an image yet. You can try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (isActive) setIsGenerating(false);
      }
    };

    void generateImage();

    return () => {
      isActive = false;
    };
  }, [generationKey, toast]);

  const handleDownload = async () => {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `tawthef-share-banner-${variant}.png`;
    link.click();
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast({
        title: "Caption copied",
        description: "Your social caption is ready to paste.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access was not available.",
        variant: "destructive",
      });
    }
  };

  const handleLinkedInShare = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // Ignore clipboard failures here.
    }

    window.open("https://www.linkedin.com/feed/", "_blank", "noopener,noreferrer");

    toast({
      title: "LinkedIn opened",
      description: "Paste the copied caption into your LinkedIn post.",
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="card-dashboard">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Banner Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Outer preview wrapper — light gradient background like a social feed */}
          <div className="relative flex items-center justify-center rounded-3xl border border-border/30 bg-gradient-to-b from-muted/30 to-muted/10 p-4 sm:p-6">
            {/* Social card shell — fills the full width of the preview area */}
            <div className="w-full overflow-hidden rounded-2xl border border-border/25 bg-card shadow-[0_20px_60px_rgba(15,23,42,0.13)] sm:rounded-3xl">
              {/* LinkedIn-style header row */}
              <div className="flex items-center gap-3 border-b border-border/20 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
                <div
                  className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10"
                  style={{ background: "linear-gradient(160deg, #0d1b3e 0%, #1d4ed8 100%)" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Tawthef Social Preview</p>
                  <p className="text-xs text-muted-foreground">Designed for LinkedIn sharing</p>
                </div>
              </div>
              {/* Banner image area */}
              <div className="relative bg-muted/10 p-3 sm:p-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-xl sm:rounded-2xl">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Share banner preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BannerTemplate
                      variant={variant}
                      name={name}
                      profession={profession}
                      company={company}
                      roleLabel={roleLabel}
                      avatarUrl={resolvedAvatarUrl}
                    />
                  )}
                </div>
              </div>
            </div>
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/90 px-4 py-2 text-sm shadow">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Generating PNG
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-dashboard">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Caption Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/30 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Caption</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground">{caption}</p>
          </div>

          <div className="grid gap-3">
            <Button onClick={handleDownload} disabled={!imageUrl || isGenerating} className="w-full justify-start">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button onClick={handleCopyCaption} variant="outline" className="w-full justify-start">
              <Copy className="h-4 w-4" />
              Copy Caption
            </Button>
            <Button onClick={handleLinkedInShare} variant="outline" className="w-full justify-start">
              <Linkedin className="h-4 w-4" />
              Copy &amp; Open LinkedIn
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The banner is rendered at 1200 × 1200 and optimized for LinkedIn, WhatsApp, and Instagram posts.
          </p>
        </CardContent>
      </Card>

      <div className="fixed left-[-2000px] top-0 pointer-events-none opacity-0">
        <div ref={exportRef} className={cn("h-[1200px] w-[1200px]")}>
          <BannerTemplate
            variant={variant}
            name={name}
            profession={profession}
            company={company}
            roleLabel={roleLabel}
            avatarUrl={resolvedAvatarUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareBanner;
