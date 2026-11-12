import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.ComponentProps<'div'> {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    animation?: 'wave' | 'pulse' | false;
    width?: number | string;
    height?: number | string;
}

/**
 * Skeleton component with full Material-UI (MUI) compatibility:
 * - Variants: 'text', 'circular', 'rectangular', 'rounded'
 * - Animations: 'wave' (shimmer gradient), 'pulse', or false
 * - Responsive widths & heights
 */
export function Skeleton({
    className,
    variant = 'rounded',
    animation = 'wave',
    width,
    height,
    style,
    ...props
}: SkeletonProps) {
    const variantClasses = {
        text: 'h-4 w-full rounded-sm my-1',
        circular: 'rounded-full shrink-0',
        rectangular: 'rounded-none',
        rounded: 'rounded-lg',
    };

    const animationClasses = {
        wave: 'skeleton-wave',
        pulse: 'animate-pulse bg-muted/80',
        false: 'bg-muted/70',
    };

    const inlineStyle: React.CSSProperties = {
        ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
        ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
        ...style,
    };

    return (
        <div
            data-slot="skeleton"
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={cn(
                'select-none pointer-events-none',
                variantClasses[variant],
                animation ? animationClasses[animation] : animationClasses.false,
                className
            )}
            style={inlineStyle}
            {...props}
        />
    );
}

export default Skeleton;
