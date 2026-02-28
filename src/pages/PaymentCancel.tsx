import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tawthef-logo-en.png";

const PaymentCancel = () => (
    <div className="min-h-screen bg-[hsl(224,25%,6%)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-destructive/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-destructive/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md text-center space-y-8">
            <div className="flex justify-center">
                <img src={logo} alt="Tawthef" className="h-12 w-auto opacity-80" />
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-10 shadow-2xl space-y-6">
                <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto ring-4 ring-destructive/20">
                    <XCircle className="w-10 h-10 text-destructive" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
                    <p className="text-white/50 text-sm">
                        No charges were made. You can try again whenever you're ready.
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <Link to="/pricing">
                        <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    </Link>
                    <Link to="/dashboard">
                        <Button variant="outline" className="w-full h-11 rounded-xl border-white/10 text-white hover:bg-white/5">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>

            <p className="text-white/20 text-xs">
                Need help? Contact support@tawthef.com
            </p>
        </div>
    </div>
);

export default PaymentCancel;
