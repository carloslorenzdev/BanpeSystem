import type { InertiaLinkProps } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { toUrl } from '@/lib/utils';

export type IsCurrentUrlFn = (
    urlToCheck: NonNullable<InertiaLinkProps['href']>,
    currentUrl?: string,
    startsWith?: boolean,
) => boolean;

export type IsCurrentOrParentUrlFn = (
    urlToCheck: NonNullable<InertiaLinkProps['href']>,
    currentUrl?: string,
) => boolean;

export type WhenCurrentUrlFn = <TIfTrue, TIfFalse = null>(
    urlToCheck: NonNullable<InertiaLinkProps['href']>,
    ifTrue: TIfTrue,
    ifFalse?: TIfFalse,
) => TIfTrue | TIfFalse;

export type UseCurrentUrlReturn = {
    currentUrl: string;
    isCurrentUrl: IsCurrentUrlFn;
    isCurrentOrParentUrl: IsCurrentOrParentUrlFn;
    whenCurrentUrl: WhenCurrentUrlFn;
};

export function useCurrentUrl(): UseCurrentUrlReturn {
    const page = usePage();
    const pageUrlObj = new URL(
        page.url,
        typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost',
    );
    const currentUrlPath = pageUrlObj.pathname;
    const currentSearch = pageUrlObj.search;

    const isCurrentUrl: IsCurrentUrlFn = (
        urlToCheck: NonNullable<InertiaLinkProps['href']>,
        currentUrl?: string,
        startsWith: boolean = false,
    ) => {
        const urlToCompare = currentUrl ?? currentUrlPath;
        const urlString = toUrl(urlToCheck);

        try {
            const checkUrlObj = new URL(urlString, 'http://localhost');
            const checkPath = checkUrlObj.pathname;
            const checkSearch = checkUrlObj.search;

            if (checkSearch) {
                // Si la URL a verificar tiene parámetros de búsqueda (ej. ?action=traspaso)
                const matchesPath = startsWith ? currentUrlPath.startsWith(checkPath) : currentUrlPath === checkPath;
                if (!matchesPath) return false;
                const checkParams = new URLSearchParams(checkSearch);
                const currentParams = new URLSearchParams(currentSearch);
                for (const [key, val] of checkParams.entries()) {
                    if (currentParams.get(key) !== val) return false;
                }
                return true;
            } else {
                // Si la URL a verificar NO tiene parámetros pero la actual sí tiene un parámetro específico
                if (currentSearch && new URLSearchParams(currentSearch).has('action')) {
                    return false;
                }
                return startsWith ? urlToCompare.startsWith(checkPath) : checkPath === urlToCompare;
            }
        } catch {
            return false;
        }
    };

    const isCurrentOrParentUrl: IsCurrentOrParentUrlFn = (
        urlToCheck: NonNullable<InertiaLinkProps['href']>,
        currentUrl?: string,
    ) => {
        return isCurrentUrl(urlToCheck, currentUrl, true);
    };

    const whenCurrentUrl: WhenCurrentUrlFn = <TIfTrue, TIfFalse = null>(
        urlToCheck: NonNullable<InertiaLinkProps['href']>,
        ifTrue: TIfTrue,
        ifFalse: TIfFalse = null as TIfFalse,
    ): TIfTrue | TIfFalse => {
        return isCurrentUrl(urlToCheck) ? ifTrue : ifFalse;
    };

    return {
        currentUrl: currentUrlPath,
        isCurrentUrl,
        isCurrentOrParentUrl,
        whenCurrentUrl,
    };
}
