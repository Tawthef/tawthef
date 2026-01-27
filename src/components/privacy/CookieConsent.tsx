import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CookiePreferencesModal } from "./CookiePreferencesModal";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    const handleAcceptAll = () => {
        const preferences = {
            essential: true,
            analytics: true,
            marketing: true,
        };
        savePreferences(preferences);
        localStorage.setItem("cookie_consent", "accepted");
        setShowBanner(false);
    };

    const handleSavePreferences = (preferences: {
        essential: boolean;
        analytics: boolean;
        marketing: boolean;
    }) => {
        savePreferences(preferences);
        localStorage.setItem("cookie_consent", "custom");
        setShowBanner(false);
    };

    const savePreferences = (preferences: any) => {
        localStorage.setItem("cookie_preferences", JSON.stringify(preferences));
        // Here you would typically trigger your analytics/marketing scripts based on these values
        console.log("Cookie preferences saved:", preferences);
    };

    if (!showBanner) return null;

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-500">
                <div className="container max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-lg font-semibold text-foreground">We value your privacy</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                            By clicking "Accept cookies", you consent to our use of cookies. We use cookies to enhance your experience, serve personalized ads or content, and analyze our traffic. Learn more in our{" "}
                            <Link to="/cookie-policy" className="underline hover:text-primary transition-colors">
                                Cookie Policy
                            </Link>
                            .
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto rounded-xl"
                        >
                            Manage cookies
                        </Button>
                        <Button
                            onClick={handleAcceptAll}
                            className="w-full sm:w-auto rounded-xl shadow-lg shadow-primary/20"
                        >
                            Accept cookies
                        </Button>
                    </div>
                </div>
            </div>

            <CookiePreferencesModal
                open={showModal}
                onOpenChange={setShowModal}
                onSave={handleSavePreferences}
                initialPreferences={{
                    essential: true,
                    analytics: false,
                    marketing: false
                }}
            />
        </>
    );
}
