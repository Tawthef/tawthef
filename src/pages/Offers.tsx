import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, CheckCircle, XCircle, DollarSign, Calendar, Clock } from "lucide-react";
import { useOffers } from "@/hooks/useOffers";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

const statusConfig: Record<string, { label: string; className: string }> = {
    sent: { label: "Pending", className: "bg-warning/10 text-warning" },
    accepted: { label: "Accepted", className: "bg-success/10 text-success" },
    declined: { label: "Declined", className: "bg-destructive/10 text-destructive" },
    expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const Offers = () => {
    const { offers, isLoading, respondToOffer, isResponding } = useOffers();
    const { profile } = useProfile();
    const [respondingId, setRespondingId] = useState<string | null>(null);

    const isCandidate = profile?.role === 'candidate';

    const handleRespond = async (offerId: string, response: 'accepted' | 'declined') => {
        setRespondingId(offerId);
        try {
            await respondToOffer({ offerId, response });
        } catch (err) {
            console.error('[Offers] Response error:', err);
        } finally {
            setRespondingId(null);
        }
    };

    const pendingOffers = offers.filter(o => o.status === 'sent');
    const respondedOffers = offers.filter(o => o.status !== 'sent');

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Offers</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        {isCandidate ? "View and respond to job offers" : "Manage job offers sent to candidates"}
                    </p>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && offers.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Gift className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No offers yet</h3>
                            <p className="text-muted-foreground">
                                {isCandidate ? "Offers will appear here when employers send them." : "Send offers to candidates after successful interviews."}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Offers */}
                {!isLoading && pendingOffers.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Pending Offers ({pendingOffers.length})</h2>
                        {pendingOffers.map((offer) => (
                            <Card key={offer.id} className="card-float border-0 overflow-hidden">
                                <CardContent className="p-8 lg:p-10">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                        {/* Offer info */}
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center flex-shrink-0">
                                                <Gift className="w-7 h-7 text-success" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-foreground">
                                                        {isCandidate ? offer.job_title : offer.candidate_name}
                                                    </h3>
                                                    <Badge className={statusConfig[offer.status]?.className + " border-0 text-xs px-3 py-1"}>
                                                        {statusConfig[offer.status]?.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm">
                                                    <span className="flex items-center gap-2 text-foreground font-semibold">
                                                        <DollarSign className="w-4 h-4 text-success" />
                                                        {formatCurrency(offer.salary, offer.currency)}
                                                    </span>
                                                    <span className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="w-4 h-4" />
                                                        Start: {formatDate(offer.start_date)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Sent {formatDate(offer.sent_at)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions - Candidate only */}
                                        {isCandidate && offer.status === 'sent' && (
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-11 px-5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRespond(offer.id, 'declined')}
                                                    disabled={respondingId === offer.id}
                                                >
                                                    {respondingId === offer.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Decline
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    className="h-11 px-5 rounded-xl shadow-lg shadow-success/20 bg-success hover:bg-success/90"
                                                    onClick={() => handleRespond(offer.id, 'accepted')}
                                                    disabled={respondingId === offer.id}
                                                >
                                                    {respondingId === offer.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Accept Offer
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Responded Offers */}
                {!isLoading && respondedOffers.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Past Offers ({respondedOffers.length})</h2>
                        {respondedOffers.map((offer) => (
                            <Card key={offer.id} className="card-float border-0 overflow-hidden opacity-70">
                                <CardContent className="p-8 lg:p-10">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                                                {offer.status === 'accepted' ? (
                                                    <CheckCircle className="w-7 h-7 text-success" />
                                                ) : (
                                                    <XCircle className="w-7 h-7 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {isCandidate ? offer.job_title : offer.candidate_name}
                                                </h3>
                                                <p className="text-muted-foreground">{formatCurrency(offer.salary, offer.currency)}</p>
                                            </div>
                                        </div>
                                        <Badge className={statusConfig[offer.status]?.className + " border-0"}>
                                            {statusConfig[offer.status]?.label}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Offers;
