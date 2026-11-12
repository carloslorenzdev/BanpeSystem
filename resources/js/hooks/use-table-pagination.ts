import { useState, useMemo, useEffect, useRef } from 'react';

export interface UseTablePaginationOptions<T> {
    items: T[];
    initialPerPage?: 10 | 15;
    skeletonDelay?: number;
}

export function useTablePagination<T>({
    items,
    initialPerPage = 10,
    skeletonDelay = 280,
}: UseTablePaginationOptions<T>) {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage, setPerPageState] = useState<10 | 15>(initialPerPage);
    const [isChangingPage, setIsChangingPage] = useState<boolean>(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    // Clamp current page within valid range if items change
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const triggerTransition = (callback: () => void) => {
        if (typeof window !== 'undefined') {
            const scrollY = window.scrollY;
            setIsChangingPage(true);
            callback();
            requestAnimationFrame(() => {
                window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
            });

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                setIsChangingPage(false);
                requestAnimationFrame(() => {
                    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
                });
            }, skeletonDelay);
        } else {
            setIsChangingPage(true);
            callback();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                setIsChangingPage(false);
            }, skeletonDelay);
        }
    };

    const goToPage = (page: number) => {
        const targetPage = Math.max(1, Math.min(page, totalPages));
        if (targetPage === currentPage) return;
        triggerTransition(() => setCurrentPage(targetPage));
    };

    const setPerPage = (newPerPage: 10 | 15) => {
        if (newPerPage === perPage) return;
        triggerTransition(() => {
            setPerPageState(newPerPage);
            setCurrentPage(1);
        });
    };

    const nextPage = () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    };

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * perPage;
        return items.slice(startIndex, startIndex + perPage);
    }, [items, currentPage, perPage]);

    const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const toIndex = Math.min(currentPage * perPage, totalItems);

    return {
        currentPage,
        perPage,
        totalPages,
        totalItems,
        fromIndex,
        toIndex,
        paginatedItems,
        isChangingPage,
        goToPage,
        setPerPage,
        nextPage,
        prevPage,
        canNext: currentPage < totalPages,
        canPrev: currentPage > 1,
    };
}

