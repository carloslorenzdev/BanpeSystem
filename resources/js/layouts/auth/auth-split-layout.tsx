import { Link } from '@inertiajs/react';
import {
    Boxes,
    Building2,
    CheckCircle2,
    MessageSquare,
    ShieldCheck,
    Truck,
} from 'lucide-react';
import BanpeLogo from '@/components/banpe-logo';
import { Badge } from '@/components/ui/badge';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative grid min-h-screen w-full lg:grid-cols-12 bg-background">
            {/* Columna Izquierda: Identidad de Marca y Propuesta de Valor (Desktop) */}
            <div className="relative hidden lg:col-span-6 xl:col-span-7 lg:flex flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white">
                {/* Patrón de fondo tipo cuadrícula técnica / plano de ingeniería */}
                <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
                <div className="absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                {/* Encabezado Superior Izquierdo */}
                <div className="relative z-20 flex items-center justify-between">
                    <Link href={home()} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg">
                        <BanpeLogo light />
                    </Link>
                    <Badge variant="outline" className="border-zinc-800 bg-zinc-900/80 text-zinc-300 font-medium px-3 py-1 text-xs">
                        ISO 9001:2015 Ready
                    </Badge>
                </div>

                {/* Contenido Central: Mensaje y Pilares Operativos */}
                <div className="relative z-20 my-auto py-12 max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/30 mb-6">
                        <ShieldCheck className="size-3.5" />
                        Control Total de Operaciones
                    </div>

                    <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                        Gestión Integral de Obras, Almacenes y Cadena de Suministro
                    </h1>

                    <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                        Controla cada fase de tus proyectos de construcción: desde el presupuesto inicial hasta el despacho físico a pie de obra y la conciliación financiera.
                    </p>

                    {/* Características clave */}
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                            <Building2 className="size-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200">Proyectos & Obras</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">Control de materiales asignados vs. consumidos.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                            <Boxes className="size-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200">Almacén Inteligente</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">Stock reservado por obra y stock libre.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                            <Truck className="size-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200">Despacho en Camión</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">Guía de chofer y cotejo de faltantes en sitio.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                            <MessageSquare className="size-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200">Alertas WhatsApp</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">Notificaciones inmediatas a ingenieros y gerencia.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie de Página Izquierdo */}
                <div className="relative z-20 border-t border-zinc-800/80 pt-6 flex items-center justify-between text-xs text-zinc-400">
                    <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-amber-400" />
                        Sistema validado para operaciones en campo
                    </p>
                    <span>© {new Date().getFullYear()} BANPE C.A. • Venezuela</span>
                </div>
            </div>

            {/* Columna Derecha: Formulario de Autenticación */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16">
                <div className="mx-auto w-full max-w-[420px]">
                    {/* Logo solo en Móvil */}
                    <div className="mb-8 flex justify-center lg:hidden">
                        <Link href={home()}>
                            <BanpeLogo />
                        </Link>
                    </div>

                    {/* Cabecera del Formulario */}
                    <div className="mb-8 space-y-2 text-center lg:text-left">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {title || 'Iniciar Sesión'}
                        </h2>
                        <p className="text-sm text-muted-foreground text-balance">
                            {description || 'Ingresa tus credenciales para acceder al sistema'}
                        </p>
                    </div>

                    {/* Contenido del formulario */}
                    {children}
                </div>
            </div>
        </div>
    );
}
