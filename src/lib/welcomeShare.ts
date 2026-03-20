export type WelcomeShareRole = "candidate" | "employer" | "agency";

export interface WelcomeShareContext {
  role: WelcomeShareRole;
  fullName?: string;
  companyName?: string;
  inviteCodeApplied?: boolean;
  createdAt: string;
}

const WELCOME_SHARE_STORAGE_KEY = "tawthef:welcome-share-context";
const TAWTHEF_URL = "https://tawthef.com";

export const saveWelcomeShareContext = (context: WelcomeShareContext) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WELCOME_SHARE_STORAGE_KEY, JSON.stringify(context));
};

export const readWelcomeShareContext = (): WelcomeShareContext | null => {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(WELCOME_SHARE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WelcomeShareContext;
  } catch {
    return null;
  }
};

export const clearWelcomeShareContext = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(WELCOME_SHARE_STORAGE_KEY);
};

export const getWelcomeShareReferralLink = (userId?: string | null) =>
  userId ? `${TAWTHEF_URL}/invite/${userId}` : TAWTHEF_URL;

interface WelcomeShareCaptionParams {
  variant: "candidate" | "recruiter";
  name: string;
  profession: string;
  company: string;
  roleLabel: string;
  referralLink: string;
}

export const generateWelcomeShareCaption = ({
  variant,
  name,
  profession,
  company,
  roleLabel,
  referralLink,
}: WelcomeShareCaptionParams) => {
  if (variant === "candidate") {
    return [
      `I just joined Tawthef and I'm excited to share the next step in my journey as ${profession}.`,
      `If you're building teams or know the right opportunity, I'd love to connect.`,
      `Join me on ${TAWTHEF_URL}`,
      `Referral link: ${referralLink}`,
      "#Tawthef #OpenToWork #Careers",
    ].join("\n\n");
  }

  return [
    `${name} here. ${company} is growing, and I'm hiring on Tawthef as ${roleLabel}.`,
    "If you're looking for strong talent or your next role, let's connect there.",
    `Join me on ${TAWTHEF_URL}`,
    `Referral link: ${referralLink}`,
    "#Tawthef #Hiring #Recruitment",
  ].join("\n\n");
};
