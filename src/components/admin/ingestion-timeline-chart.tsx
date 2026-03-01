'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface IngestionDataPoint {
    date: string;
    count: number;
}

interface IngestionTimelineChartProps {
    data: IngestionDataPoint[];
    isLoading?: boolean;
}

export function IngestionTimelineChart({ data, isLoading }: IngestionTimelineChartProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-52 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Document Ingestion Timeline</CardTitle>
                <CardDescription>Number of documents added per day (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                        No activity in the last 30 days
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: 'hsl(var(--foreground))',
                                }}
                                formatter={(value: number) => [value, 'Documents']}
                            />
                            <Bar
                                dataKey="count"
                                fill="url(#barGradient)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
