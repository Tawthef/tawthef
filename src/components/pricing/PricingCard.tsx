import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
    name: string;
    price: number;
    duration: string;
    features: string[];
    featured?: boolean;
    onPurchase: () => void;
    disabled?: boolean;
}

const PricingCard = ({
    name,
    price,
    duration,
    features,
    featured = false,
    onPurchase,
    disabled = false
}: PricingCardProps) => {
    return (
        <Card className={cn(
            "relative card-float",
            featured && "border-primary shadow-xl shadow-primary/10"
        )}>
            {featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1.5 text-xs font-semibold">
                        Most Popular
                    </Badge>
                </div>
            )}

            <CardHeader className="text-center pb-8 pt-10">
                <h3 className="text-2xl font-bold text-foreground mb-2">{name}</h3>
                <div className="mt-4">
                    <span className="text-5xl font-bold text-foreground">${price}</span>
                    <span className="text-muted-foreground ml-2">/ {duration}</span>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-8">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-sm text-foreground/80">{feature}</span>
                    </div>
                ))}
            </CardContent>

            <CardFooter>
                <Button
                    className={cn(
                        "w-full h-12 text-sm font-semibold rounded-lg",
                        featured && "shadow-lg shadow-primary/20"
                    )}
                    variant={featured ? "default" : "outline"}
                    onClick={onPurchase}
                    disabled={disabled}
                >
                    {disabled ? "Recruiter Only" : "Buy Now"}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default PricingCard;
