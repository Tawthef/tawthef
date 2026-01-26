import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InterviewSuitabilityChartProps {
    data: {
        suitable: number;
        not_suitable: number;
    };
}

const COLORS = {
    suitable: 'hsl(var(--success))',
    not_suitable: 'hsl(var(--muted))',
};

const InterviewSuitabilityChart = ({ data }: InterviewSuitabilityChartProps) => {
    const total = data.suitable + data.not_suitable;

    if (total === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Interview Suitability</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">No suitability data available</p>
                        <p className="text-sm text-muted-foreground/60">
                            Data will appear once candidates are reviewed
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = [
        { name: 'Suitable', value: data.suitable },
        { name: 'Not Suitable', value: data.not_suitable },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Interview Suitability</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={index === 0 ? COLORS.suitable : COLORS.not_suitable}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default InterviewSuitabilityChart;
