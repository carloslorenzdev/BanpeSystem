import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { CurrencyProvider } from '@/contexts/currency-context';
import { ErrorBoundary } from '@/components/error-boundary';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <CurrencyProvider>
            <ErrorBoundary>
                <AppLayoutTemplate breadcrumbs={breadcrumbs}>
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </AppLayoutTemplate>
            </ErrorBoundary>
        </CurrencyProvider>
    );
}
