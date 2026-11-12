export default function BanpeLogo({
    className = '',
    size = 'md',
    light = false,
}: {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    light?: boolean;
}) {
    const sizeClasses = {
        sm: 'h-8 max-w-[130px]',
        md: 'h-10 max-w-[160px]',
        lg: 'h-12 max-w-[200px]',
    };

    return (
        <div className={`flex items-center ${className}`}>
            {/* Contenedor blanco con bordes redondeados para garantizar máxima legibilidad en fondos oscuros o claros */}
            <div
                className={`relative flex items-center justify-center rounded-xl px-2.5 py-1.5 transition-all ${
                    light
                        ? 'bg-white shadow-md shadow-black/20 ring-1 ring-white/20'
                        : 'bg-white/95 dark:bg-white p-1.5 shadow-xs ring-1 ring-border/50'
                }`}
            >
                <img
                    src="/images/banpe-logo.png"
                    alt="BANPE C.A. - Ingeniería y Construcción"
                    className={`${sizeClasses[size]} w-auto object-contain select-none`}
                    loading="eager"
                />
            </div>
        </div>
    );
}
