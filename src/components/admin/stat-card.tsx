import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    isLoading?: boolean;
    trend?: { value: number; label: string };
    colorClass?: string;
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    isLoading,
    trend,
    colorClass = 'text-primary',
}: StatCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
            {/* Subtle background glow */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/5 blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn('rounded-md bg-muted p-2', colorClass)}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                {description && (
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                )}
                {trend && (
                    <p
                        className={cn(
                            'mt-1 text-xs font-medium',
                            trend.value >= 0 ? 'text-green-500' : 'text-red-500'
                        )}
                    >
                        {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
