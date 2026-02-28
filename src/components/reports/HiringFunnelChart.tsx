import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart, Funnel, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

interface FunnelChartProps {
    data: Array<{
        stage: string;
        count: number;
        fill: string;
    }>;
}

const FUNNEL_COLORS = [
    'hsl(220, 70%, 50%)',  // Applied
    'hsl(220, 80%, 55%)',  // Agency Shortlisted
    'hsl(250, 70%, 55%)',  // HR Shortlisted
    'hsl(280, 60%, 55%)',  // Technical
    'hsl(35, 90%, 50%)',   // Interview
    'hsl(45, 90%, 50%)',   // Offer
    'hsl(145, 70%, 45%)',  // Hired
];

const HiringFunnelChart = ({ data }: FunnelChartProps) => {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Hiring Funnel</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">No funnel data available</p>
                        <p className="text-sm text-muted-foreground/60">
                            Data will appear once candidates progress through stages
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // For the horizontal bar funnel (more reliable than Recharts FunnelChart)
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Hiring Funnel</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data.map((item, index) => {
                        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        const color = FUNNEL_COLORS[index] || FUNNEL_COLORS[0];
                        return (
                            <div key={item.stage} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">{item.stage}</span>
                                    <span className="text-muted-foreground font-semibold">{item.count}</span>
                                </div>
                                <div className="w-full bg-muted/30 rounded-full h-8 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3"
                                        style={{
                                            width: `${Math.max(percentage, 4)}%`,
                                            backgroundColor: color,
                                        }}
                                    >
                                        {percentage > 15 && (
                                            <span className="text-xs font-medium text-white">
                                                {Math.round(percentage)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default HiringFunnelChart;
