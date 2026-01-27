import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookiePolicy = () => {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Button variant="ghost" asChild className="mb-4">
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </Button>

                <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center pb-8 border-b">
                        <CardTitle className="text-4xl font-bold tracking-tight text-foreground">Cookie Policy</CardTitle>
                        <p className="text-muted-foreground mt-2">Last Updated: January 2026</p>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8 space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">What are cookies?</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to remember your actions and preferences over a period of time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">How we use cookies</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                We use cookies for the following purposes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>
                                    <strong className="text-foreground">Essential Cookies:</strong> These are necessary for the website to function properly (e.g., keeping you logged in).
                                </li>
                                <li>
                                    <strong className="text-foreground">Analytics Cookies:</strong> These help us understand how visitors interact with our website by collecting and reporting information anonymously.
                                </li>
                                <li>
                                    <strong className="text-foreground">Marketing Cookies:</strong> These are used to track visitors across websites to display relevant ads.
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">Managing Cookies</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site and some services and functionalities may not work.
                            </p>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CookiePolicy;
