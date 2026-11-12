import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Boxes,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileText,
    HardHat,
    Layers,
    MapPin,
    PackageCheck,
    Plus,
    Printer,
    Search,
    Shield,
    Trash2,
    Truck,
    User,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CardGridSkeleton } from '@/components/skeletons';
import { SearchableMaterialSelect } from '@/components/searchable-material-select';
import { getMaterialUnitInfo, sanitizeQuantity, handleQuantityKeyDown } from '@/lib/material-units';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

type Warehouse = {
    id: number;
    code: string;
    name: string;
};

type Project = {
    id: number;
    code: string;
    name: string;
    location: string;
};

type MaterialUnit = {
    id: number;
    name: string;
    symbol: string;
};

type Material = {
    id: number;
    code: string;
    name: string;
    unit_id: number;
    estimated_price_usd: number | string;
    unit?: MaterialUnit;
};

type DispatchItem = {
    id: number;
    dispatch_id: number;
    material_id: number;
    quantity_sent: number | string;
    quantity_received?: number | string | null;
    unit_price_usd: number | string;
    notes?: string;
    material?: Material;
};

type Dispatch = {
    id: number;
    code: string;
    warehouse_id: number;
    project_id: number;
    material_request_id?: number | null;
    dispatcher_user_id: number;
    driver_name: string;
    driver_id_document?: string;
    vehicle_plate: string;
    vehicle_model?: string;
    departure_date: string;
    status: 'preparando' | 'en_transito' | 'entregado' | 'con_discrepancia';
    received_by_user_id?: number | null;
    reception_date?: string | null;
    receiver_name?: string | null;
    receiver_notes?: string | null;
    warehouse?: Warehouse;
    project?: Project;
    dispatcher?: { id: number; name: string };
    receiver?: { id: number; name: string; phone?: string };
    items: DispatchItem[];
};

type MaterialRequest = {
    id: number;
    code: string;
    project?: Project;
    items?: {
        id: number;
        material_id: number;
        requested_quantity: number | string;
        material?: Material;
    }[];
};

type Stats = {
    total: number;
    en_transito: number;
    entregados: number;
    con_discrepancia: number;
};

type InventoryItem = {
    id: number;
    warehouse_id: number;
    material_id: number;
    project_id?: number | null;
    quantity: number | string;
};

type Props = {
    dispatches: Dispatch[];
    stats: Stats;
    warehouses: Warehouse[];
    projects: Project[];
    materials: Material[];
    inventories?: InventoryItem[];
    pendingRequests: MaterialRequest[];
    filters: {
        search: string;
        status: string;
        project_id: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control', href: '/dashboard' },
    { title: 'Despachos de Camiones a Obra', href: '/dispatches' },
];

export default function DispatchesIndex({
    dispatches,
    stats,
    warehouses,
    projects,
    materials,
    inventories = [],
    pendingRequests,
    filters,
}: Props) {
    const { isLoading } = usePageLoading();
    const pagination = useTablePagination({
        items: dispatches,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'todos');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'todos');

    // Modales
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isReceptionDialogOpen, setIsReceptionDialogOpen] = useState(false);
    const [activeDispatchForReception, setActiveDispatchForReception] = useState<Dispatch | null>(null);

    // Formulario de Creación de Despacho
    const createForm = useForm<{
        warehouse_id: string;
        project_id: string;
        material_request_id: string;
        driver_name: string;
        driver_id_document: string;
        vehicle_plate: string;
        vehicle_model: string;
        departure_date: string;
        items: { material_id: string; quantity_sent: string }[];
    }>({
        warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
        project_id: '',
        material_request_id: '',
        driver_name: '',
        driver_id_document: '',
        vehicle_plate: '',
        vehicle_model: '',
        departure_date: new Date().toISOString().split('T')[0],
        items: [{ material_id: '', quantity_sent: '' }],
    });

    // Consultar existencia disponible en almacén para el material seleccionado
    const getAvailableStockForDispatch = (
        materialId: string | number,
        warehouseId: string | number,
        projectId?: string | number
    ): number => {
        if (!materialId || !warehouseId) return 0;
        const wId = Number(warehouseId);
        const mId = Number(materialId);
        const pId = projectId ? Number(projectId) : null;

        // Sumar existencias libres y asignadas a esta obra en el almacén indicado
        return (inventories || [])
            .filter(
                (inv) =>
                    Number(inv.warehouse_id) === wId &&
                    Number(inv.material_id) === mId &&
                    (inv.project_id === null || (pId !== null && Number(inv.project_id) === pId))
            )
            .reduce((acc, curr) => acc + Number(curr.quantity), 0);
    };

    const openCreateDialog = () => {
        createForm.reset();
        createForm.setData({
            warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
            project_id: '',
            material_request_id: '',
            driver_name: '',
            driver_id_document: '',
            vehicle_plate: '',
            vehicle_model: '',
            departure_date: new Date().toISOString().split('T')[0],
            items: [{ material_id: '', quantity_sent: '' }],
        });
        createForm.clearErrors();
        setIsCreateDialogOpen(true);
    };

    // Formulario de Recepción en Obra
    const receptionForm = useForm<{
        receiver_name: string;
        receiver_notes: string;
        items: { id: number; quantity_received: string }[];
    }>({
        receiver_name: '',
        receiver_notes: '',
        items: [],
    });

    const openReceptionDialog = (d: Dispatch) => {
        setActiveDispatchForReception(d);
        receptionForm.setData({
            receiver_name: d.receiver_name || '',
            receiver_notes: '',
            items: d.items.map((it) => ({
                id: it.id,
                quantity_received: String(it.quantity_sent),
            })),
        });
        setIsReceptionDialogOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/dispatches', {
            onSuccess: () => setIsCreateDialogOpen(false),
        });
    };

    const handleReceptionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDispatchForReception) return;
        receptionForm.post(`/dispatches/${activeDispatchForReception.id}/reception`, {
            onSuccess: () => setIsReceptionDialogOpen(false),
        });
    };

    const addItemToDispatch = () => {
        createForm.setData('items', [
            ...createForm.data.items,
            { material_id: '', quantity_sent: '' },
        ]);
    };

    const removeItemFromDispatch = (idx: number) => {
        const next = [...createForm.data.items];
        next.splice(idx, 1);
        createForm.setData('items', next);
    };

    const applyFilters = (newStatus?: string, newProj?: string) => {
        const s = newStatus !== undefined ? newStatus : selectedStatus;
        const p = newProj !== undefined ? newProj : selectedProject;
        router.get(
            '/dispatches',
            { search, status: s, project_id: p },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const getStatusBadge = (status: Dispatch['status']) => {
        switch (status) {
            case 'en_transito':
                return (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5 text-xs">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        Camión en Ruta
                    </Badge>
                );
            case 'entregado':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="size-3" />
                        Entregado Conforme
                    </Badge>
                );
            case 'con_discrepancia':
                return (
                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="size-3" />
                        Con Discrepancia / Merma
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Guías de Despacho de Camiones - BANPE" />

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Truck className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Despacho de Camiones & Recepción en Obra
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control de guías de remisión oficiales (`BANPE-FO-12-0004`), choferes, placas de transporte y validación física de recepción por ingenieros residentes.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        onClick={openCreateDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs text-xs flex items-center gap-2"
                    >
                        <Plus className="size-4" />
                        Emitir Guía de Despacho
                    </Button>
                </div>
            </div>

            {/* KPIs Métricos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Total Despachos
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300">
                            <Truck className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Guías emitidas en el sistema</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Camiones en Ruta
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {stats.en_transito}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">En trayecto hacia el frente de obra</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Entregados Conformes
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {stats.entregados}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Recepción validada sin faltantes</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Con Discrepancia
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                            {stats.con_discrepancia}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Mermas o material faltante en campo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por código de guía (DSP-...), chofer, placa o destino..."
                        className="pl-9 bg-background h-10 w-full text-xs"
                    />
                </form>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'en_transito', label: 'En Ruta' },
                        { key: 'entregado', label: 'Entregados' },
                        { key: 'con_discrepancia', label: 'Con Novedad' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setSelectedStatus(tab.key);
                                applyFilters(tab.key, undefined);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedStatus === tab.key
                                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <select
                    value={selectedProject}
                    onChange={(e) => {
                        setSelectedProject(e.target.value);
                        applyFilters(undefined, e.target.value);
                    }}
                    className="h-10 text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-medium shrink-0"
                >
                    <option value="todos">Todas las Obras de Destino</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            [{p.code}] {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Listado de Guías de Despacho con Efecto Skeleton MUI */}
            <div className="space-y-4">
                {isLoading ? (
                    <CardGridSkeleton count={pagination.perPage} />
                ) : (
                    <>
                        <div className="min-h-[400px] space-y-4">
                            {pagination.isChangingPage ? (
                                <CardGridSkeleton count={pagination.perPage} />
                            ) : pagination.totalItems === 0 ? (
                                <Card className="py-12 text-center border-dashed">
                                    <CardContent className="space-y-3">
                                        <Truck className="size-8 mx-auto text-muted-foreground" />
                                        <div className="text-base font-bold text-foreground">
                                            No hay guías de despacho registradas con estos filtros
                                        </div>
                                        <Button onClick={openCreateDialog} className="bg-amber-500 text-zinc-950 font-bold text-xs mt-2">
                                            <Plus className="size-3.5 mr-1.5" />
                                            Emitir Primer Despacho
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                pagination.paginatedItems.map((dispatch) => {
                                    return (
                                        <Card
                                            key={dispatch.id}
                                            className="border border-border/70 hover:border-amber-500/40 transition-colors shadow-xs bg-card overflow-hidden"
                                        >
                                            <CardHeader className="bg-muted/30 pb-3 pt-4 border-b border-border/50">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <Badge variant="outline" className="font-mono text-xs font-bold bg-background text-foreground">
                                                            {dispatch.code}
                                                        </Badge>
                                                        {getStatusBadge(dispatch.status)}
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="size-3" />
                                                            Salida: {dispatch.departure_date}
                                                        </span>
                                                    </div>

                                                    {/* Botón de Recepción para el Residente */}
                                                    <div className="flex items-center gap-2">
                                                        {dispatch.status === 'en_transito' ? (
                                                            <Button
                                                                onClick={() => openReceptionDialog(dispatch)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                                                            >
                                                                <PackageCheck className="size-3.5 mr-1.5" />
                                                                Confirmar Recepción en Obra
                                                            </Button>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[11px] text-muted-foreground bg-background">
                                                                Recepción cerrada
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="p-4 sm:p-5 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                    {/* Destino */}
                                                    <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                                        <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                                            <Building2 className="size-3 text-amber-500" />
                                                            Obra de Destino
                                                        </div>
                                                        <div className="font-bold text-foreground text-sm">
                                                            {dispatch.project?.name}
                                                        </div>
                                                        <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                                                            <MapPin className="size-3 text-zinc-400" />
                                                            {dispatch.project?.location}
                                                        </div>
                                                    </div>

                                                    {/* Chofer y Camión */}
                                                    <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                                        <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                                            <Truck className="size-3 text-amber-500" />
                                                            Transporte & Chofer
                                                        </div>
                                                        <div className="font-bold text-foreground text-sm">
                                                            {dispatch.driver_name} {dispatch.driver_id_document && `(${dispatch.driver_id_document})`}
                                                        </div>
                                                        <div className="text-muted-foreground text-[11px]">
                                                            Vehículo: <strong className="text-foreground">{dispatch.vehicle_plate}</strong> • {dispatch.vehicle_model || 'Camión de carga'}
                                                        </div>
                                                    </div>

                                                    {/* Receptor / Despachador */}
                                                    <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                                        <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                                            <UserCheck className="size-3 text-emerald-500" />
                                                            Trazabilidad de Entrega
                                                        </div>
                                                        <div className="text-foreground font-semibold">
                                                            Despachó: <strong>{dispatch.dispatcher?.name || 'Almacén Central'}</strong>
                                                        </div>
                                                        <div className="text-muted-foreground text-[11px]">
                                                            Receptor: <strong className="text-foreground">{dispatch.receiver_name || dispatch.receiver?.name || 'En camino (pendiente)'}</strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Tabla de Ítems Despachados */}
                                                <div className="rounded-lg border border-border/60 overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-muted/40">
                                                            <TableRow>
                                                                <TableHead className="text-[11px] font-bold">Cód. Insumo</TableHead>
                                                                <TableHead className="text-[11px] font-bold">Descripción del Material</TableHead>
                                                                <TableHead className="text-[11px] font-bold text-right">Cant. Despachada</TableHead>
                                                                <TableHead className="text-[11px] font-bold text-right">Cant. Recibida en Obra</TableHead>
                                                                <TableHead className="text-[11px] font-bold text-center">Estado</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {dispatch.items.map((it) => {
                                                                const sent = Number(it.quantity_sent || 0);
                                                                const received = it.quantity_received !== null && it.quantity_received !== undefined ? Number(it.quantity_received) : null;
                                                                const unit = it.material?.unit?.symbol || 'und';

                                                                return (
                                                                    <TableRow key={it.id} className="text-xs">
                                                                        <TableCell className="font-mono font-bold text-foreground">
                                                                            {it.material?.code}
                                                                        </TableCell>
                                                                        <TableCell className="font-semibold text-foreground">
                                                                            {it.material?.name}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-extrabold text-foreground">
                                                                            {sent.toLocaleString('en-US')} {unit}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-black">
                                                                            {received !== null ? (
                                                                                <span className={received < sent ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}>
                                                                                    {received.toLocaleString('en-US')} {unit}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-muted-foreground italic">En tránsito</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {received === null ? (
                                                                                <Badge variant="outline" className="text-[10px]">En Ruta</Badge>
                                                                            ) : received < sent ? (
                                                                                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                                                                                    Faltante: -{(sent - received).toLocaleString('en-US')}
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                                                    Completo
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Observaciones de Recepción / Discrepancias */}
                                                {dispatch.receiver_notes && (
                                                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                                                        <span className="font-bold text-muted-foreground uppercase text-[10px]">
                                                            Bitácora de Recepción en Campo:
                                                        </span>
                                                        <p className="text-foreground mt-0.5 italic">
                                                            "{dispatch.receiver_notes}"
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>

                        <DataTablePagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            fromIndex={pagination.fromIndex}
                            toIndex={pagination.toIndex}
                            perPage={pagination.perPage}
                            onPageChange={pagination.goToPage}
                            onPerPageChange={pagination.setPerPage}
                            itemLabel="guías de despacho"
                        />
                    </>
                )}
            </div>

            {/* MODAL: EMITIR NUEVA GUÍA DE DESPACHO */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="w-[96vw] max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Truck className="size-5 text-amber-500" />
                            Emitir Guía de Despacho en Camión (BANPE-FO-12-0004)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Registra la salida del vehículo de almacén hacia el frente de obra. Descuenta inventario automáticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                        {/* Alerta de Errores Globales */}
                        {Object.keys(createForm.errors).length > 0 && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                                <div className="font-semibold flex items-center gap-1.5">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <span>Por favor revise los siguientes requerimientos:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                                    {Object.entries(createForm.errors).map(([key, msg]) => (
                                        <li key={key}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Almacén Origen */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_warehouse" className="text-xs font-semibold">Almacén Origen *</Label>
                                <select
                                    id="d_warehouse"
                                    value={createForm.data.warehouse_id}
                                    onChange={(e) => createForm.setData('warehouse_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="">Seleccione Almacén de Origen...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.warehouse_id} />
                            </div>

                            {/* Obra Destino */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_project" className="text-xs font-semibold">Obra de Destino *</Label>
                                <select
                                    id="d_project"
                                    value={createForm.data.project_id}
                                    onChange={(e) => createForm.setData('project_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="">Seleccione Obra de Destino...</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.code}] {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.project_id} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Chofer */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_driver" className="text-xs font-semibold">Nombre Chofer *</Label>
                                <Input
                                    id="d_driver"
                                    value={createForm.data.driver_name}
                                    onChange={(e) => createForm.setData('driver_name', e.target.value)}
                                    placeholder="Ej: Pedro Peréz"
                                    required
                                />
                                <InputError message={createForm.errors.driver_name} />
                            </div>

                            {/* Cédula */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_cedula" className="text-xs font-semibold">Cédula Chofer</Label>
                                <Input
                                    id="d_cedula"
                                    value={createForm.data.driver_id_document}
                                    onChange={(e) => createForm.setData('driver_id_document', e.target.value)}
                                    placeholder="Ej: V-00.000.000"
                                />
                                <InputError message={createForm.errors.driver_id_document} />
                            </div>

                            {/* Placa */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_plate" className="text-xs font-semibold">Placa Vehículo *</Label>
                                <Input
                                    id="d_plate"
                                    value={createForm.data.vehicle_plate}
                                    onChange={(e) => createForm.setData('vehicle_plate', e.target.value.toUpperCase())}
                                    placeholder="Ej: A42BB9C"
                                    required
                                />
                                <InputError message={createForm.errors.vehicle_plate} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Modelo Vehículo */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_model" className="text-xs font-semibold">Modelo Camión / Transporte</Label>
                                <Input
                                    id="d_model"
                                    value={createForm.data.vehicle_model}
                                    onChange={(e) => createForm.setData('vehicle_model', e.target.value)}
                                    placeholder="Ej: Camión Ford F-350 / Volteo"
                                />
                                <InputError message={createForm.errors.vehicle_model} />
                            </div>

                            {/* Fecha Salida */}
                            <div className="space-y-1.5">
                                <Label htmlFor="d_date" className="text-xs font-semibold">Fecha de Despacho *</Label>
                                <Input
                                    id="d_date"
                                    type="date"
                                    value={createForm.data.departure_date}
                                    onChange={(e) => createForm.setData('departure_date', e.target.value)}
                                    required
                                />
                                <InputError message={createForm.errors.departure_date} />
                            </div>
                        </div>

                        {/* Ítems a despachar */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Materiales Cargados en el Camión
                                    </Label>
                                    <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                        {createForm.data.items.length} {createForm.data.items.length === 1 ? 'insumo' : 'insumos'}
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItemToDispatch}
                                    className="text-xs h-7 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                >
                                    <Plus className="size-3 mr-1" />
                                    Agregar Insumo
                                </Button>
                            </div>

                            <div className="space-y-2.5">
                                {createForm.data.items.map((it, idx) => {
                                    const mat = materials.find((m) => String(m.id) === it.material_id);
                                    const unitInfo = getMaterialUnitInfo(mat?.unit, mat?.name);
                                    const stockAvailable = getAvailableStockForDispatch(
                                        it.material_id,
                                        createForm.data.warehouse_id,
                                        createForm.data.project_id
                                    );
                                    const qtyVal = parseFloat(it.quantity_sent) || 0;
                                    const exceedsStock = it.material_id && stockAvailable > 0 && qtyVal > stockAvailable;
                                    const hasZeroStock = it.material_id && stockAvailable <= 0;

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-xl border border-border bg-card/60 space-y-2 hover:border-amber-500/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-muted-foreground">Insumo #{idx + 1}</span>
                                                {it.material_id && (
                                                    hasZeroStock ? (
                                                        <Badge variant="destructive" className="text-[10px] px-2 py-0">
                                                            Sin existencia en el almacén seleccionado (0 {unitInfo.shortSymbol})
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-2 py-0 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                        >
                                                            Disponible en almacén: {stockAvailable} {unitInfo.shortSymbol}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                                                <div className="md:col-span-7">
                                                    <SearchableMaterialSelect
                                                        materials={materials}
                                                        value={it.material_id}
                                                        onChange={(newId) => {
                                                            const next = [...createForm.data.items];
                                                            next[idx].material_id = newId;
                                                            const found = materials.find((m) => String(m.id) === newId);
                                                            const uInfo = getMaterialUnitInfo(found?.unit, found?.name);
                                                            next[idx].quantity_sent = sanitizeQuantity(next[idx].quantity_sent, uInfo.isIntegerOnly);
                                                            createForm.setData('items', next);
                                                        }}
                                                        getAvailableStock={(matId) =>
                                                            getAvailableStockForDispatch(
                                                                matId,
                                                                createForm.data.warehouse_id,
                                                                createForm.data.project_id
                                                            )
                                                        }
                                                        placeholder="Buscar insumo por código o nombre..."
                                                    />
                                                </div>

                                                <div className="md:col-span-4">
                                                    <div className="relative flex items-center">
                                                        <Input
                                                            type="text"
                                                            inputMode={unitInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                            value={it.quantity_sent}
                                                            onChange={(e) => {
                                                                const next = [...createForm.data.items];
                                                                next[idx].quantity_sent = sanitizeQuantity(e.target.value, unitInfo.isIntegerOnly);
                                                                createForm.setData('items', next);
                                                            }}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, unitInfo.isIntegerOnly)}
                                                            placeholder={unitInfo.placeholder}
                                                            className={`w-full text-xs h-9 pr-14 font-semibold ${
                                                                exceedsStock
                                                                    ? 'border-destructive focus-visible:ring-destructive bg-destructive/5'
                                                                    : ''
                                                            }`}
                                                            required
                                                        />
                                                        <span
                                                            className="absolute right-2 px-1 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none truncate max-w-[48px]"
                                                            title={unitInfo.humanName}
                                                        >
                                                            {unitInfo.shortSymbol}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-1 flex justify-end">
                                                    {createForm.data.items.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeItemFromDispatch(idx)}
                                                            className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                                            title="Eliminar insumo"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {exceedsStock && (
                                                <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                                                    <AlertTriangle className="size-3 shrink-0" />
                                                    <span>
                                                        La cantidad ({qtyVal}) excede la existencia disponible ({stockAvailable} {unitInfo.shortSymbol}).
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    createForm.processing ||
                                    !createForm.data.warehouse_id ||
                                    !createForm.data.project_id ||
                                    !createForm.data.driver_name ||
                                    !createForm.data.vehicle_plate ||
                                    createForm.data.items.length === 0 ||
                                    createForm.data.items.some((it) => {
                                        if (!it.material_id || !it.quantity_sent || parseFloat(it.quantity_sent) <= 0) return true;
                                        const stock = getAvailableStockForDispatch(
                                            it.material_id,
                                            createForm.data.warehouse_id,
                                            createForm.data.project_id
                                        );
                                        return parseFloat(it.quantity_sent) > stock;
                                    })
                                }
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold disabled:opacity-50"
                            >
                                {createForm.processing && <Spinner className="mr-2" />}
                                Emitir Guía y Despachar Camión
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: CONFIRMAR RECEPCIÓN EN OBRA (INGENIERO RESIDENTE) */}
            <Dialog open={isReceptionDialogOpen} onOpenChange={setIsReceptionDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            <PackageCheck className="size-5" />
                            Validación de Recepción en Obra
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Guía {activeDispatchForReception?.code} con destino a {activeDispatchForReception?.project?.name}. Verifica la cantidad física descargada del camión.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReceptionSubmit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Chequeo de Insumos Recibidos vs Despachados
                            </Label>

                            {activeDispatchForReception?.items.map((item, idx) => (
                                <div key={item.id} className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex-1">
                                        <div className="font-bold text-foreground">
                                            [{item.material?.code}] {item.material?.name}
                                        </div>
                                        <div className="text-muted-foreground text-[11px]">
                                            Despachado en camión: <strong>{item.quantity_sent} {item.material?.unit?.symbol}</strong>
                                        </div>
                                    </div>

                                    <div className="w-32">
                                        <Label className="text-[10px] text-muted-foreground font-semibold">Cant. Recibida</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={receptionForm.data.items[idx]?.quantity_received || ''}
                                            onChange={(e) => {
                                                const next = [...receptionForm.data.items];
                                                next[idx].quantity_received = e.target.value;
                                                receptionForm.setData('items', next);
                                            }}
                                            className="h-8 text-xs font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Receptor y Novedades */}
                        <div className="space-y-1.5">
                            <Label htmlFor="r_notes" className="text-xs font-semibold">
                                Observaciones / Novedades de Campo
                            </Label>
                            <textarea
                                id="r_notes"
                                rows={2}
                                value={receptionForm.data.receiver_notes}
                                onChange={(e) => receptionForm.setData('receiver_notes', e.target.value)}
                                placeholder="Indica si hubo alguna merma, sacos rotos o si todo se recibió conforme..."
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsReceptionDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={receptionForm.processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {receptionForm.processing && <Spinner className="mr-2" />}
                                Confirmar y Asentar en Obra
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

DispatchesIndex.layout = {
    breadcrumbs,
};

