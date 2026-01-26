import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

type InitialRole = "candidate" | "recruiter";
type RecruiterType = "employer" | "agency";

const AccountSetup = () => {
    const [selectedRole, setSelectedRole] = useState<InitialRole | "">("");
    const [recruiterType, setRecruiterType] = useState<RecruiterType | "">("");
    const [companyName, setCompanyName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const getFinalRole = (): string => {
        if (selectedRole === "candidate") return "candidate";
        if (selectedRole === "recruiter" && recruiterType === "employer") return "employer";
        if (selectedRole === "recruiter" && recruiterType === "agency") return "agency";
        return "candidate";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole) {
            toast({
                title: "Role Required",
                description: "Please select how you'll use Tawthef",
                variant: "destructive",
            });
            return;
        }

        if (selectedRole === "recruiter" && !recruiterType) {
            toast({
                title: "Recruiter Type Required",
                description: "Please select your recruiter type",
                variant: "destructive",
            });
            return;
        }

        if (selectedRole === "recruiter" && !companyName.trim()) {
            toast({
                title: "Company Name Required",
                description: "Please enter your company name",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const finalRole = getFinalRole();
            let orgId = null;

            // Create organization if recruiter
            if (["employer", "agency"].includes(finalRole)) {
                const { data: org, error: orgError } = await supabase
                    .from("organizations")
                    .insert({
                        name: companyName,
                        type: finalRole,
                    })
                    .select()
                    .single();

                if (orgError) {
                    console.error("[AccountSetup] Organization creation error:", orgError);
                    toast({
                        title: "Error",
                        description: "Failed to create organization",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }

                orgId = org.id;
            }

            // Update profile (use UPDATE instead of UPSERT to avoid RLS recursion)
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    role: finalRole,
                    organization_id: orgId,
                })
                .eq('id', user?.id);

            if (profileError) {
                console.error("[AccountSetup] Profile update error:", profileError);
                toast({
                    title: "Error",
                    description: "Failed to update profile",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }

            toast({
                title: "Account Setup Complete",
                description: "Your account has been configured successfully",
            });

            // Redirect to dashboard
            navigate("/dashboard");
        } catch (error) {
            console.error("[AccountSetup] Error:", error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-warning" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Complete Account Setup</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Please select your account type to continue
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Step 1: Initial Role Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">How will you use Tawthef?</Label>
                            <RadioGroup value={selectedRole} onValueChange={(value) => {
                                setSelectedRole(value as InitialRole);
                                if (value === "candidate") {
                                    setRecruiterType("");
                                    setCompanyName("");
                                }
                            }}>
                                <div className="flex items-center space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer">
                                    <RadioGroupItem value="candidate" id="candidate" />
                                    <Label htmlFor="candidate" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Candidate</div>
                                        <div className="text-sm text-muted-foreground">
                                            Discover and apply to opportunities
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer">
                                    <RadioGroupItem value="recruiter" id="recruiter" />
                                    <Label htmlFor="recruiter" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Recruiter</div>
                                        <div className="text-sm text-muted-foreground">
                                            Source and place talent for employers
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Step 1.5: Recruiter Type (if recruiter selected) */}
                        {selectedRole === "recruiter" && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-base font-semibold">What type of recruiter are you?</Label>
                                <RadioGroup value={recruiterType} onValueChange={(value) => setRecruiterType(value as RecruiterType)}>
                                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer">
                                        <RadioGroupItem value="employer" id="employer" />
                                        <Label htmlFor="employer" className="flex-1 cursor-pointer">
                                            <div className="font-medium">Employer</div>
                                            <div className="text-sm text-muted-foreground">
                                                Hiring for my own company
                                            </div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-4 rounded-lg border hover:border-primary cursor-pointer">
                                        <RadioGroupItem value="agency" id="agency" />
                                        <Label htmlFor="agency" className="flex-1 cursor-pointer">
                                            <div className="font-medium">Recruitment Agency</div>
                                            <div className="text-sm text-muted-foreground">
                                                Placing candidates for clients
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {/* Company Name (if recruiter selected) */}
                        {selectedRole === "recruiter" && recruiterType && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="companyName">
                                    {recruiterType === "employer" ? "Company Name" : "Agency Name"}
                                </Label>
                                <Input
                                    id="companyName"
                                    placeholder={recruiterType === "employer" ? "Enter your company name" : "Enter your agency name"}
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required={selectedRole === "recruiter"}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12"
                            disabled={
                                !selectedRole ||
                                (selectedRole === "recruiter" && (!recruiterType || !companyName.trim())) ||
                                isLoading
                            }
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                "Complete Setup"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AccountSetup;
