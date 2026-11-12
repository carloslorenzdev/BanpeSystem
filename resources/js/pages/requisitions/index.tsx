import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Boxes,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileText,
    HardHat,
    Layers,
    MessageSquare,
    Plus,
    Search,
    Send,
    ShoppingCart,
    Trash2,
    Truck,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CardGridSkeleton } from '@/components/skeletons';
import { SearchableMaterialSelect } from '@/components/searchable-material-select';
import { getMaterialUnitInfo, sanitizeQuantity, handleQuantityKeyDown } from '@/lib/material-units';
import { useConfirm } from '@/contexts/confirm-context';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
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

type ProjectPhase = {
    id: number;
    name: string;
};

type Project = {
    id: number;
    code: string;
    name: string;
    phases?: ProjectPhase[];
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

type RequisitionItem = {
    id: number;
    material_request_id: number;
    material_id: number;
    requested_quantity: number | string;
    approved_quantity: number | string;
    dispatched_quantity: number | string;
    status: 'pendiente' | 'disponible_almacen' | 'por_comprar' | 'despachado';
    notes?: string;
    material?: Material;
};

type MaterialRequest = {
    id: number;
    code: string;
    project_id: number;
    project_phase_id?: number | null;
    requester_user_id: number;
    request_date: string;
    status: 'pendiente' | 'aprobada' | 'despachada_parcial' | 'despachada_total' | 'enviada_a_compras' | 'rechazada';
    priority: 'baja' | 'normal' | 'urgente';
    notes?: string | null;
    project?: Project;
    phase?: ProjectPhase;
    requester?: { id: number; name: string; phone?: string };
    items: RequisitionItem[];
    dispatches?: { id: number; code: string; status: string }[];
};

type Stats = {
    total: number;
    pendientes: number;
    enviadas_a_compras: number;
    despachadas: number;
};

type Props = {
    requests: MaterialRequest[];
    stats: Stats;
    projects: Project[];
    materials: Material[];
    filters: {
        search: string;
        status: string;
        project_id: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control', href: '/dashboard' },
    { title: 'Requisiciones de Materiales', href: '/requisitions' },
];

export default function RequisitionsIndex({
    requests,
    stats,
    projects,
    materials,
    filters,
}: Props) {
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal } = useConfirm();
    const pagination = useTablePagination({
        items: requests,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'todos');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'todos');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Formulario de Nueva Requisición
    const createForm = useForm<{
        project_id: string;
        project_phase_id: string;
        priority: 'baja' | 'normal' | 'urgente';
        notes: string;
        items: { material_id: string; requested_quantity: string }[];
    }>({
        project_id: '',
        project_phase_id: '',
        priority: 'normal',
        notes: '',
        items: [{ material_id: '', requested_quantity: '' }],
    });

    const openCreateDialog = () => {
        createForm.reset();
        createForm.setData({
            project_id: '',
            project_phase_id: '',
            priority: 'normal',
            notes: '',
            items: [{ material_id: '', requested_quantity: '' }],
        });
        createForm.clearErrors();
        setIsCreateDialogOpen(true);
    };

    const activeProjectPhases = projects.find((p) => String(p.id) === createForm.data.project_id)?.phases || [];

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/requisitions', {
            onSuccess: () => setIsCreateDialogOpen(false),
        });
    };

    const handleSendToPurchasing = async (reqId: number, reqCode: string) => {
        const ok = await confirmModal({
            title: `Canalizar Requisición ${reqCode}`,
            description: `¿Desea canalizar la requisición ${reqCode} al departamento de compras para cotizar con los 3 presupuestos requeridos?`,
            confirmText: 'Canalizar a Compras',
            variant: 'default',
        });
        if (ok) {
            router.post(`/requisitions/${reqId}/send-to-purchasing`, {}, { preserveScroll: true });
        }
    };

    const addItem = () => {
        createForm.setData('items', [
            ...createForm.data.items,
            { material_id: '', requested_quantity: '' },
        ]);
    };

    const removeItem = (idx: number) => {
        const next = [...createForm.data.items];
        next.splice(idx, 1);
        createForm.setData('items', next);
    };

    const applyFilters = (newStatus?: string, newProj?: string) => {
        const s = newStatus !== undefined ? newStatus : selectedStatus;
        const p = newProj !== undefined ? newProj : selectedProject;
        router.get(
            '/requisitions',
            { search, status: s, project_id: p },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const getStatusBadge = (status: MaterialRequest['status']) => {
        switch (status) {
            case 'pendiente':
                return (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-xs">
                        Pendiente en Almacén
                    </Badge>
                );
            case 'enviada_a_compras':
                return (
                    <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold text-xs flex items-center gap-1">
                        <ShoppingCart className="size-3" />
                        En Procura / Compras
                    </Badge>
                );
            case 'despachada_total':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-xs flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        Despachada Total
                    </Badge>
                );
            case 'despachada_parcial':
                return (
                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold text-xs">
                        Despachada Parcial
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Requisiciones de Materiales de Obra - BANPE" />

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <FileText className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Requisiciones de Materiales desde Obra
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Formato oficial `BANPE-FO-05-0001` para solicitudes de insumos desde frentes de trabajo hacia Almacén y Procura.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        onClick={openCreateDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs text-xs flex items-center gap-2"
                    >
                        <Plus className="size-4" />
                        Nueva Requisición de Obra
                    </Button>
                </div>
            </div>

            {/* KPIs Métricos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Total Requisiciones
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300">
                            <FileText className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Solicitudes registradas en campo</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Por Atender en Almacén
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {stats.pendientes}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Esperando preparación de despacho</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Canalizadas a Compras
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <ShoppingCart className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {stats.enviadas_a_compras}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Sin stock, enviadas a cotizar (3 presup.)</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Despachadas / Cerradas
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {stats.despachadas}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Insumos entregados en obra</p>
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
                        placeholder="Buscar por código (REQ-...) u obra..."
                        className="pl-9 bg-background h-10 w-full text-xs"
                    />
                </form>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {[
                        { key: 'todos', label: 'Todas' },
                        { key: 'pendiente', label: 'Pendientes' },
                        { key: 'enviada_a_compras', label: 'En Compras' },
                        { key: 'despachada_total', label: 'Despachadas' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setSelectedStatus(tab.key);
                                applyFilters(tab.key, undefined);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                selectedStatus === tab.key
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
                    <option value="todos">Todas las Obras</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            [{p.code}] {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Listado de Requisiciones con Efecto Skeleton MUI */}
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
                                        <FileText className="size-8 mx-auto text-muted-foreground" />
                                        <div className="text-base font-bold text-foreground">
                                            No se encontraron requisiciones registradas
                                        </div>
                                        <Button onClick={openCreateDialog} className="bg-amber-500 text-zinc-950 font-bold text-xs mt-2">
                                            <Plus className="size-3.5 mr-1.5" />
                                            Crear Primera Requisición
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                pagination.paginatedItems.map((req) => {
                                    return (
                                        <Card
                                            key={req.id}
                                            className="border border-border/70 hover:border-amber-500/40 transition-colors shadow-xs bg-card overflow-hidden"
                                        >
                            <CardHeader className="bg-muted/30 pb-3 pt-4 border-b border-border/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <Badge variant="outline" className="font-mono text-xs font-bold bg-background text-foreground">
                                            {req.code}
                                        </Badge>
                                        {getStatusBadge(req.status)}
                                        {req.priority === 'urgente' && (
                                            <Badge className="bg-rose-500 text-white font-bold text-[10px] animate-pulse">
                                                Urgente
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            {req.request_date}
                                        </span>
                                    </div>

                                    {/* Botón de canalización a compras si está pendiente */}
                                    {req.status === 'pendiente' && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleSendToPurchasing(req.id, req.code)}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs font-bold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 h-8"
                                            >
                                                <ShoppingCart className="size-3.5 mr-1.5" />
                                                Pasar a Compras (Sin Stock)
                                            </Button>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-8"
                                            >
                                                <Link href="/dispatches">
                                                    <Truck className="size-3.5 mr-1.5" />
                                                    Despachar en Camión
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 sm:p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Obra & Fase</div>
                                        <div className="font-bold text-foreground text-sm">{req.project?.name}</div>
                                        <div className="text-muted-foreground text-[11px]">{req.phase?.name || 'Fase General'}</div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Solicitante</div>
                                        <div className="font-bold text-foreground text-sm">{req.requester?.name}</div>
                                        <div className="text-muted-foreground text-[11px]">{req.requester?.phone || 'Ingeniero Residente'}</div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Justificación</div>
                                        <div className="text-foreground text-xs italic">
                                            {req.notes ? `"${req.notes}"` : 'Sin justificación escrita'}
                                        </div>
                                    </div>
                                </div>

                                {/* Ítems solicitados */}
                                <div className="rounded-lg border border-border/60 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="text-[11px] font-bold">Cód. Insumo</TableHead>
                                                <TableHead className="text-[11px] font-bold">Descripción del Insumo</TableHead>
                                                <TableHead className="text-[11px] font-bold text-right">Cant. Solicitada</TableHead>
                                                <TableHead className="text-[11px] font-bold text-right">Cant. Despachada</TableHead>
                                                <TableHead className="text-[11px] font-bold text-center">Estado Ítem</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {req.items.map((it) => (
                                                <TableRow key={it.id} className="text-xs">
                                                    <TableCell className="font-mono font-bold text-foreground">
                                                        {it.material?.code}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-foreground">
                                                        {it.material?.name}
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-foreground">
                                                        {Number(it.requested_quantity).toLocaleString('en-US')} {it.material?.unit?.symbol}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        {Number(it.dispatched_quantity).toLocaleString('en-US')} {it.material?.unit?.symbol}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {it.status === 'por_comprar' ? 'En Procura' : it.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
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
                    itemLabel="requisiciones"
                />
            </>
            )}
            </div>

            {/* MODAL: NUEVA REQUISICIÓN DE MATERIALES */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="w-[96vw] max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <FileText className="size-5 text-amber-500" />
                            Nueva Requisición de Materiales (BANPE-FO-05-0001)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Emite un requerimiento formal desde el frente de obra para que Almacén verifique disponibilidad o pase a Procura.
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
                            <div className="space-y-1.5">
                                <Label htmlFor="req_proj" className="text-xs font-semibold">Obra Solicitante *</Label>
                                <select
                                    id="req_proj"
                                    value={createForm.data.project_id}
                                    onChange={(e) => {
                                        createForm.setData('project_id', e.target.value);
                                        createForm.setData('project_phase_id', '');
                                    }}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="">Seleccione Obra Solicitante...</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.code}] {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.project_id} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="req_phase" className="text-xs font-semibold">Fase Constructiva</Label>
                                <select
                                    id="req_phase"
                                    value={createForm.data.project_phase_id}
                                    onChange={(e) => createForm.setData('project_phase_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Fase General / No especificada</option>
                                    {activeProjectPhases.map((ph) => (
                                        <option key={ph.id} value={ph.id}>
                                            {ph.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.project_phase_id} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="req_prio" className="text-xs font-semibold">Prioridad de Entrega</Label>
                            <select
                                id="req_prio"
                                value={createForm.data.priority}
                                onChange={(e) => createForm.setData('priority', e.target.value as 'baja' | 'normal' | 'urgente')}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            >
                                <option value="normal">Normal (según cronograma de obra)</option>
                                <option value="urgente">Urgente (detiene frente de vaciado)</option>
                                <option value="baja">Baja (acopio preventivo)</option>
                            </select>
                            <InputError message={createForm.errors.priority} />
                        </div>

                        {/* Justificación */}
                        <div className="space-y-1.5">
                            <Label htmlFor="req_notes" className="text-xs font-semibold">
                                Justificación / Destino del Material
                            </Label>
                            <textarea
                                id="req_notes"
                                rows={2}
                                value={createForm.data.notes}
                                onChange={(e) => createForm.setData('notes', e.target.value)}
                                placeholder="Ej: Material requerido para fundaciones de zapatas según cronograma..."
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                            <InputError message={createForm.errors.notes} />
                        </div>

                        {/* Lista de Ítems */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Insumos Solicitados
                                    </Label>
                                    <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                        {createForm.data.items.length} {createForm.data.items.length === 1 ? 'insumo' : 'insumos'}
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
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
                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-xl border border-border bg-card/60 space-y-2 hover:border-amber-500/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-muted-foreground">Insumo #{idx + 1}</span>
                                                {mat && (
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {unitInfo.helpText}
                                                    </span>
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
                                                            next[idx].requested_quantity = sanitizeQuantity(next[idx].requested_quantity, uInfo.isIntegerOnly);
                                                            createForm.setData('items', next);
                                                        }}
                                                        placeholder="Buscar insumo por código o nombre..."
                                                    />
                                                </div>

                                                <div className="md:col-span-4">
                                                    <div className="relative flex items-center">
                                                        <Input
                                                            type="text"
                                                            inputMode={unitInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                            value={it.requested_quantity}
                                                            onChange={(e) => {
                                                                const next = [...createForm.data.items];
                                                                next[idx].requested_quantity = sanitizeQuantity(e.target.value, unitInfo.isIntegerOnly);
                                                                createForm.setData('items', next);
                                                            }}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, unitInfo.isIntegerOnly)}
                                                            placeholder={unitInfo.placeholder}
                                                            className="w-full text-xs h-9 pr-14 font-semibold"
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
                                                            onClick={() => removeItem(idx)}
                                                            className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                                            title="Eliminar insumo"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {(createForm.errors as any).items && (
                                <InputError message={(createForm.errors as any).items} />
                            )}
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
                                    !createForm.data.project_id ||
                                    createForm.data.items.length === 0 ||
                                    createForm.data.items.some((it) => !it.material_id || !it.requested_quantity || parseFloat(it.requested_quantity) <= 0)
                                }
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold disabled:opacity-50"
                            >
                                {createForm.processing && <Spinner className="mr-2" />}
                                Emitir Requisición
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

RequisitionsIndex.layout = {
    breadcrumbs,
};

