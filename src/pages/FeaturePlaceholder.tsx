import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface FeaturePlaceholderProps {
    title: string;
    description?: string;
}

const FeaturePlaceholder = ({ title, description }: FeaturePlaceholderProps) => {
    return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full text-center border-dashed">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Construction className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl font-bold">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {description || "This feature module is currently under development."}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default FeaturePlaceholder;
