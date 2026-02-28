import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
    variant: 'job_slots' | 'resume_access';
}

const content = {
    job_slots: {
        title: "Job Posting Limit Reached",
        description: "You've used all available job posting slots. Upgrade your plan to post more jobs and reach more candidates.",
        features: [
            "Post more open positions",
            "Extended listing duration",
            "Full applicant tracking",
        ],
    },
    resume_access: {
        title: "Resume Search Required",
        description: "Subscribe to Resume Search to unlock full candidate profiles, contact details, and messaging.",
        features: [
            "Search qualified candidates",
            "View full CV/Resume profiles",
            "Contact candidates directly",
        ],
    },
};

const UpgradeModal = ({ open, onClose, variant }: UpgradeModalProps) => {
    const c = content[variant];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center space-y-4 pt-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-bold">{c.title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {c.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {c.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-foreground">{f}</span>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex flex-col gap-3 sm:flex-col">
                    <Link to="/pricing" className="w-full">
                        <Button className="w-full shadow-lg shadow-primary/20" size="lg">
                            View Plans
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <Button variant="ghost" className="w-full" onClick={onClose}>
                        Maybe Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpgradeModal;
