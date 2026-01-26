import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface GeographyChartProps {
    data: Array<{
        country: string;
        count: number;
    }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const GeographyChart = ({ data }: GeographyChartProps) => {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Candidate Geography</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">No geography data available</p>
                        <p className="text-sm text-muted-foreground/60">
                            Data will appear once candidates provide location information
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Group into top 5 + others
    const top5 = data.slice(0, 5);
    const others = data.slice(5);
    const othersTotal = others.reduce((sum, item) => sum + item.count, 0);

    const chartData = [
        ...top5.map(item => ({ name: item.country, value: item.count })),
        ...(othersTotal > 0 ? [{ name: 'Others', value: othersTotal }] : [])
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Candidate Geography</CardTitle>
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
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

export default GeographyChart;
