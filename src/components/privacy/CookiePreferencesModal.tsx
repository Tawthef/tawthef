import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
}

interface CookiePreferencesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (preferences: CookiePreferences) => void;
    initialPreferences?: CookiePreferences;
}

export function CookiePreferencesModal({
    open,
    onOpenChange,
    onSave,
    initialPreferences,
}: CookiePreferencesModalProps) {
    const [preferences, setPreferences] = useState<CookiePreferences>({
        essential: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        if (initialPreferences) {
            setPreferences(initialPreferences);
        }
    }, [initialPreferences]);

    const handleSave = () => {
        onSave(preferences);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cookie Preferences</DialogTitle>
                    <DialogDescription>
                        Manage your cookie settings. Essential cookies are always enabled.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="essential" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Essential
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                Required for the website to function.
                            </span>
                        </div>
                        <Switch id="essential" checked={true} disabled />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="analytics" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Analytics
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                Help us improve our website by collecting anonymous usage data.
                            </span>
                        </div>
                        <Switch
                            id="analytics"
                            checked={preferences.analytics}
                            onCheckedChange={(checked) =>
                                setPreferences((prev) => ({ ...prev, analytics: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="marketing" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Marketing
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                Used to show you relevant advertisements.
                            </span>
                        </div>
                        <Switch
                            id="marketing"
                            checked={preferences.marketing}
                            onCheckedChange={(checked) =>
                                setPreferences((prev) => ({ ...prev, marketing: checked }))
                            }
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Preferences</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
