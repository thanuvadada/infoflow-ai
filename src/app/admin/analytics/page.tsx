'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { FileText, Users, Link2, FileUp, BarChart3, RefreshCcw, Terminal } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { DocumentTypeChart } from '@/components/admin/document-type-chart';
import { IngestionTimelineChart } from '@/components/admin/ingestion-timeline-chart';
import { useAdmin } from '@/hooks/use-admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DocumentRecord {
    id: string;
    title: string;
    fileType: string;
    ingestedAt: Timestamp | null;
}

interface UserRecord {
    id: string;
    email: string;
}

interface AdminRoleRecord {
    id: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────

function buildTimelineData(
    docs: DocumentRecord[],
    days = 30
): { date: string; count: number }[] {
    const today = new Date();
    const from = subDays(today, days - 1);

    // Map date string → count
    const countMap: Record<string, number> = {};
    eachDayOfInterval({ start: from, end: today }).forEach((d) => {
        countMap[format(d, 'MMM d')] = 0;
    });

    docs.forEach((doc) => {
        if (!doc.ingestedAt?.toDate) return;
        const d = doc.ingestedAt.toDate();
        if (d >= from && d <= today) {
            const key = format(d, 'MMM d');
            if (key in countMap) countMap[key]++;
        }
    });

    // Only return days with non-zero counts, PLUS last 7 labels for context
    return Object.entries(countMap).map(([date, count]) => ({ date, count }));
}

// ─── Main Component ────────────────────────────────────────────────────────

function AnalyticsDashboardContent() {
    const [isClient, setIsClient] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const firestore = useFirestore();

    // ── Collections ────────────────────────────────────────────────────────
    const documentsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'documents') : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [firestore, refreshKey]
    );
    const documentsQuery = useMemoFirebase(
        () =>
            documentsCollection
                ? query(documentsCollection, orderBy('ingestedAt', 'desc'))
                : null,
        [documentsCollection]
    );

    const usersCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [firestore, refreshKey]
    );

    const adminRolesCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'roles_admin') : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [firestore, refreshKey]
    );

    // ── Snapshot data ──────────────────────────────────────────────────────
    const { data: documents, isLoading: docsLoading } =
        useCollection<DocumentRecord>(documentsQuery);
    const { data: users, isLoading: usersLoading } =
        useCollection<UserRecord>(usersCollection);
    const { data: adminRoles, isLoading: rolesLoading } =
        useCollection<AdminRoleRecord>(adminRolesCollection);

    const isLoading = !isClient || docsLoading || usersLoading || rolesLoading;

    // ── Derived stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        if (!documents || !users || !adminRoles) return null;

        const totalDocs = documents.length;
        const totalUsers = users.length;
        const totalAdmins = adminRoles.length;

        const typeCount: Record<string, number> = {};
        documents.forEach((d) => {
            typeCount[d.fileType] = (typeCount[d.fileType] ?? 0) + 1;
        });

        const docTypeData = Object.entries(typeCount).map(([name, value]) => ({
            name,
            value,
        }));

        // Most recently added document
        const latestDoc = documents.length > 0 ? documents[0] : null;
        const latestDocDate = latestDoc?.ingestedAt?.toDate
            ? format(latestDoc.ingestedAt.toDate(), 'MMM d, yyyy')
            : null;

        const timelineData = buildTimelineData(documents);

        // Docs added in last 7 days
        const weekAgo = subDays(new Date(), 7);
        const recentDocs = documents.filter(
            (d) => d.ingestedAt?.toDate && d.ingestedAt.toDate() >= weekAgo
        ).length;

        return {
            totalDocs,
            totalUsers,
            totalAdmins,
            docTypeData,
            timelineData,
            latestDocDate,
            recentDocs,
        };
    }, [documents, users, adminRoles]);

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Analytics
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Real-time overview of your knowledge base and users.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setRefreshKey((k) => k + 1)}
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Documents"
                    value={isLoading ? '-' : (stats?.totalDocs ?? 0)}
                    description={
                        stats?.latestDocDate
                            ? `Last added: ${stats.latestDocDate}`
                            : 'No documents yet'
                    }
                    icon={FileText}
                    isLoading={isLoading}
                    trend={
                        stats?.recentDocs != null
                            ? { value: stats.recentDocs, label: 'added this week' }
                            : undefined
                    }
                    colorClass="text-violet-500"
                />
                <StatCard
                    title="Registered Users"
                    value={isLoading ? '-' : (stats?.totalUsers ?? 0)}
                    description={`${stats?.totalAdmins ?? 0} administrator${(stats?.totalAdmins ?? 0) !== 1 ? 's' : ''}`}
                    icon={Users}
                    isLoading={isLoading}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="PDF Uploads"
                    value={
                        isLoading
                            ? '-'
                            : (stats?.docTypeData.find((d) => d.name === 'pdf')?.value ?? 0)
                    }
                    description="Documents from uploaded PDFs"
                    icon={FileUp}
                    isLoading={isLoading}
                    colorClass="text-emerald-500"
                />
                <StatCard
                    title="Web Imports"
                    value={
                        isLoading
                            ? '-'
                            : (stats?.docTypeData.find((d) => d.name === 'url')?.value ?? 0)
                    }
                    description="Documents imported from URLs"
                    icon={Link2}
                    isLoading={isLoading}
                    colorClass="text-cyan-500"
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Timeline (wider) */}
                <div className="lg:col-span-2">
                    <IngestionTimelineChart
                        data={stats?.timelineData ?? []}
                        isLoading={isLoading}
                    />
                </div>
                {/* Donut / Pie */}
                <div className="lg:col-span-1">
                    <DocumentTypeChart
                        data={stats?.docTypeData ?? []}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Recent Documents Activity Table */}
            <RecentDocumentsPanel documents={documents ?? []} isLoading={isLoading} />
        </div>
    );
}

// ─── Recent Documents Table ────────────────────────────────────────────────

function RecentDocumentsPanel({
    documents,
    isLoading,
}: {
    documents: DocumentRecord[];
    isLoading: boolean;
}) {
    const FILE_TYPE_LABELS: Record<string, string> = {
        manual: 'Text',
        pdf: 'PDF',
        url: 'URL',
    };

    const FILE_TYPE_COLORS: Record<string, string> = {
        manual: 'bg-violet-500/15 text-violet-400',
        pdf: 'bg-emerald-500/15 text-emerald-400',
        url: 'bg-cyan-500/15 text-cyan-400',
    };

    const recentDocs = documents.slice(0, 5);

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
                Recent Documents
            </h2>
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-1/5 animate-pulse rounded bg-muted" />
                        </div>
                    ))}
                </div>
            ) : recentDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents found.</p>
            ) : (
                <ul className="space-y-2">
                    {recentDocs.map((doc) => (
                        <li
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm font-medium">{doc.title}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${FILE_TYPE_COLORS[doc.fileType] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {doc.ingestedAt?.toDate
                                        ? format(doc.ingestedAt.toDate(), 'MMM d')
                                        : 'Pending'}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Access gate ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const { isAdmin, isAdminLoading } = useAdmin();

    if (isAdminLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-36 animate-pulse rounded bg-muted" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <StatCard
                            key={i}
                            title=""
                            value=""
                            icon={FileText}
                            isLoading
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page.
                </AlertDescription>
            </Alert>
        );
    }

    return <AnalyticsDashboardContent />;
}
