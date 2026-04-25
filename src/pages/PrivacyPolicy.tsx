import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                        <CardHeader className="text-center pb-8 border-b">
                            <CardTitle className="text-4xl font-bold tracking-tight text-foreground">Privacy Policy</CardTitle>
                            <p className="text-muted-foreground mt-2">Last Updated: January 2026</p>
                        </CardHeader>
                        <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8 space-y-6">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We collect information you provide directly to us when you create an account, update your profile, apply for jobs, or communicate with us. This includes your name, email address, resume data, and job preferences.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We use the information we collect to provide, maintain, and improve our services, match candidates with jobs, process applications, and communicate with you.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Sharing of Information</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We may share your information with potential employers if you are a candidate, or with candidates if you are an employer, as part of the job application process. We do not sell your personal data.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Contact Us</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@tawthef.com" className="text-primary hover:underline">support@tawthef.com</a>.
                                </p>
                            </section>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
