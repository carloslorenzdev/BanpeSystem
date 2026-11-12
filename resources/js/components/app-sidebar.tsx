import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRightLeft,
    BadgeDollarSign,
    Boxes,
    Briefcase,
    Building2,
    CalendarClock,
    CheckSquare,
    ClipboardList,
    DollarSign,
    FileSpreadsheet,
    HardHat,
    Layers,
    LayoutGrid,
    MessageSquare,
    PackageCheck,
    PhoneCall,
    Shield,
    ShieldCheck,
    ShoppingCart,
    Truck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveRole } from '@/hooks/use-active-role';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

type SidebarGroupItem = {
    groupTitle: string;
    items: {
        title: string;
        href: string;
        icon: React.ComponentType<{ className?: string }>;
    }[];
};

export function AppSidebar() {
    const { role: roleSlug } = useActiveRole();
    const { isCurrentUrl } = useCurrentUrl();

    // Estructura TailAdmin: Menú agrupado y categorizado según el rol
    const getNavGroupsByRole = (role: string): SidebarGroupItem[] => {
        switch (role) {
            case 'admin':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel General', href: '/dashboard', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'ADMINISTRACIÓN DEL SISTEMA',
                        items: [
                            { title: 'Usuarios y Roles', href: '/admin/users', icon: ShieldCheck },
                            { title: 'Catálogo de Insumos', href: '/admin/materials', icon: Layers },
                        ],
                    },
                    {
                        groupTitle: 'OPERACIONES & CONTROL',
                        items: [
                            { title: 'Obras y Proyectos', href: '/projects', icon: Building2 },
                            { title: 'Valuaciones de Cierre', href: '/valuations', icon: FileSpreadsheet },
                            { title: 'Almacén Central & Obras', href: '/warehouse', icon: Boxes },
                            { title: 'Despachos de Camiones', href: '/dispatches', icon: Truck },
                            { title: 'Requisiciones de Obra', href: '/requisitions', icon: ClipboardList },
                            { title: 'Procura & Compras', href: '/purchases', icon: ShoppingCart },
                        ],
                    },
                    {
                        groupTitle: 'CANALES Y ALERTAS',
                        items: [
                            { title: 'Bot WhatsApp Cloud', href: '/dashboard', icon: MessageSquare },
                        ],
                    },
                ];

            case 'gerente_proyecto':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel Gerencial', href: '/dashboard', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'GESTIÓN DE OBRAS',
                        items: [
                            { title: 'Obras, Fases & Cronogramas', href: '/projects', icon: Building2 },
                            { title: 'Cómputos Maprex (Excel)', href: '/admin/materials', icon: Layers },
                        ],
                    },
                    {
                        groupTitle: 'FINANZAS Y CONTROL',
                        items: [
                            { title: 'Valuaciones de Cierre', href: '/valuations', icon: FileSpreadsheet },
                            { title: 'Costos de Materiales ($)', href: '/admin/materials', icon: DollarSign },
                        ],
                    },
                ];

            case 'almacen':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel de Almacén', href: '/dashboard', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'LOGÍSTICA & DESPACHOS',
                        items: [
                            { title: 'Despachos a Obra', href: '/dispatches', icon: Truck },
                            { title: 'Requisiciones por Despachar', href: '/requisitions', icon: ClipboardList },
                            { title: 'Recepción de Compras', href: '/dashboard', icon: PackageCheck },
                        ],
                    },
                    {
                        groupTitle: 'INVENTARIOS',
                        items: [
                            { title: 'Stock Libre vs Asignado', href: '/warehouse', icon: Boxes },
                            { title: 'Catálogo de Insumos', href: '/admin/materials', icon: Layers },
                        ],
                    },
                ];

            case 'compras':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel de Procura', href: '/purchases', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'GESTIÓN DE COMPRAS',
                        items: [
                            { title: 'Cuadro 3 Presupuestos', href: '/purchases?tab=comparativos', icon: FileSpreadsheet },
                            { title: 'Órdenes de Compra (O/C)', href: '/purchases?tab=ordenes', icon: ClipboardList },
                            { title: 'Directorio Proveedores', href: '/purchases?tab=proveedores', icon: Users },
                        ],
                    },
                ];

            case 'gerente_compras':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel de Aprobaciones', href: '/purchases', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'AUTORIZACIÓN FINANCIERA',
                        items: [
                            { title: 'Cuadros por Aprobar', href: '/purchases?tab=comparativos', icon: FileSpreadsheet },
                            { title: 'Autorización O/C', href: '/purchases?tab=ordenes', icon: ShoppingCart },
                        ],
                    },
                ];

            case 'ingeniero_residente':
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Mi Frente de Obra', href: '/projects', icon: HardHat },
                        ],
                    },
                    {
                        groupTitle: 'OPERACIONES EN CAMPO',
                        items: [
                            { title: 'Recepción de Camiones', href: '/dispatches', icon: Truck },
                            { title: 'Pedir Material (Requisición)', href: '/requisitions', icon: Boxes },
                            { title: 'Informe Semanal', href: '/dashboard', icon: ClipboardList },
                        ],
                    },
                ];

            case 'coordinador_proyecto':
            default:
                return [
                    {
                        groupTitle: 'MENÚ PRINCIPAL',
                        items: [
                            { title: 'Panel de Coordinación', href: '/dashboard', icon: LayoutGrid },
                        ],
                    },
                    {
                        groupTitle: 'PLANIFICACIÓN & LOGÍSTICA',
                        items: [
                            { title: 'Obras & Fases', href: '/projects', icon: Building2 },
                            { title: 'Valuaciones de Cierre', href: '/valuations', icon: FileSpreadsheet },
                            { title: 'Requisiciones de Materiales', href: '/requisitions', icon: ClipboardList },
                            { title: 'Almacenes & Sub-Almacenes', href: '/warehouse', icon: Boxes },
                            { title: 'Traspaso entre Obras', href: '/warehouse?action=traspaso', icon: ArrowRightLeft },
                            { title: 'Alertas WhatsApp', href: '/dashboard', icon: MessageSquare },
                        ],
                    },
                ];
        }
    };

    // Nombre legible del rol
    const getRoleLabel = (role: string): string => {
        switch (role) {
            case 'gerente_proyecto': return 'Gte. Proyectos';
            case 'coordinador_proyecto': return 'Coordinador';
            case 'almacen': return 'Jefe Almacén';
            case 'compras': return 'Analista Procura';
            case 'gerente_compras': return 'Gte. Compras';
            case 'ingeniero_residente': return 'Ing. Residente';
            case 'admin': default: return 'Administrador';
        }
    };

    const footerNavItems: NavItem[] = [
        {
            title: 'SGC BANPE (ISO 9001)',
            href: '/dashboard',
            icon: Shield,
        },
        {
            title: 'Soporte WhatsApp',
            href: 'https://wa.me/584120000001',
            icon: PhoneCall,
        },
    ];

    const navGroups = getNavGroupsByRole(roleSlug);

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-r border-border bg-sidebar">
            {/* Cabecera Estilo TailAdmin con Logo y Status */}
            <SidebarHeader className="border-b border-sidebar-border px-4 py-3.5 space-y-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent p-0">
                            <Link href="/dashboard" className="flex items-center gap-2.5">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Status y Rol estilo TailAdmin */}
                <div className="flex items-center justify-between pt-1 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </span>
                        <span>Sistema En Línea</span>
                    </div>

                    <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10"
                    >
                        {getRoleLabel(roleSlug)}
                    </Badge>
                </div>
            </SidebarHeader>

            {/* Menús Agrupados Estilo TailAdmin */}
            <SidebarContent className="px-3 py-3 space-y-4">
                {navGroups.map((group) => (
                    <SidebarGroup key={group.groupTitle} className="p-0 space-y-1">
                        <SidebarGroupLabel className="px-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                            {group.groupTitle}
                        </SidebarGroupLabel>
                        <SidebarMenu className="space-y-1">
                            {group.items.map((item) => {
                                const active = isCurrentUrl(item.href);
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={`${group.groupTitle}-${item.title}`}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                                                active
                                                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs hover:bg-amber-400 hover:text-zinc-950'
                                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                            }`}
                                        >
                                            <Link href={item.href} className="flex items-center gap-2.5 w-full">
                                                <Icon className={`size-4 shrink-0 ${active ? 'text-zinc-950' : 'text-muted-foreground'}`} />
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* Pie de Página */}
            <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
