import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Briefcase,
    Building2,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    Edit2,
    ExternalLink,
    FileSpreadsheet,
    HardHat,
    Layers,
    MapPin,
    MessageSquare,
    PauseCircle,
    Phone,
    Plus,
    Search,
    Shield,
    Trash2,
    TrendingUp,
    UploadCloud,
    Users,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useConfirm } from '@/contexts/confirm-context';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CardGridSkeleton } from '@/components/skeletons';
import InputError from '@/components/input-error';
import { CurrencyToggle } from '@/components/currency-toggle';
import { useCurrency } from '@/contexts/currency-context';
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
import type { BreadcrumbItem } from '@/types';

type UserOption = {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role?: {
        id: number;
        slug: string;
        name: string;
    } | null;
};

type ProjectPhase = {
    id: number;
    name: string;
    status: string;
    progress_percentage: number;
};

type ProjectMaterial = {
    id: number;
    material_id: number;
    estimated_quantity: number;
    dispatched_quantity: number;
    unit_price_usd: number;
    total_price_usd: number;
};

type Project = {
    id: number;
    code: string;
    name: string;
    client_name?: string;
    location: string;
    resident_engineer_id?: number;
    manager_id?: number;
    start_date?: string;
    estimated_end_date?: string;
    actual_end_date?: string;
    budget_usd: number | string;
    progress_percentage: number | string;
    status: 'licitacion' | 'en_ejecucion' | 'paralizada' | 'culminada';
    description?: string;
    resident_engineer?: UserOption;
    manager?: UserOption;
    phases?: ProjectPhase[];
    project_materials?: ProjectMaterial[];
};

type Stats = {
    total: number;
    en_ejecucion: number;
    licitacion: number;
    culminadas: number;
    paralizadas: number;
    total_budget_usd: number;
    avg_progress: number;
};

type Props = {
    projects: Project[];
    stats: Stats;
    users: UserOption[];
    filters: {
        search: string;
        status: string;
        resident_id: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control', href: '/dashboard' },
    { title: 'Obras & Proyectos', href: '/projects' },
];

export default function ProjectsIndex({
    projects = [],
    stats = {
        total: 0,
        en_ejecucion: 0,
        licitacion: 0,
        culminadas: 0,
        paralizadas: 0,
        total_budget_usd: 0,
        avg_progress: 0,
    },
    users = [],
    filters = { search: '', status: 'todas', resident_id: 'todos' },
}: Props) {
    const { currency, rate, formatMoney, currencySymbol } = useCurrency();
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal } = useConfirm();
    const pagination = useTablePagination({
        items: projects,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'todas');
    const [selectedResident, setSelectedResident] = useState(filters?.resident_id || 'todos');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Estado para Importación directa de Maprex
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importMode, setImportMode] = useState<'new' | 'existing'>('new');

    // Filtrar usuarios por roles correspondientes
    const availableResidents = useMemo(() => {
        const filtered = users.filter((u) => u.role?.slug === 'ingeniero_residente');
        return filtered.length > 0 ? filtered : users;
    }, [users]);

    const availableManagers = useMemo(() => {
        const filtered = users.filter((u) => u.role?.slug === 'gerente_proyecto');
        return filtered.length > 0 ? filtered : users;
    }, [users]);

    const importForm = useForm<{
        target_project_id: string;
        code: string;
        name: string;
        client_name: string;
        location: string;
        resident_engineer_id: string;
        status: string;
        currency: 'USD' | 'VES';
        exchange_rate: string;
        file: File | null;
    }>({
        target_project_id: '',
        code: `OBR-${new Date().getFullYear()}-${String((projects?.length || 0) + 1).padStart(3, '0')}`,
        name: '',
        client_name: '',
        location: '',
        resident_engineer_id: '',
        status: 'en_ejecucion',
        currency: 'USD',
        exchange_rate: String(rate || '899.27'),
        file: null,
    });

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (importMode === 'new') {
            importForm.post('/projects/import-new-maprex', {
                forceFormData: true,
                onSuccess: () => {
                    setIsImportDialogOpen(false);
                    importForm.reset();
                },
            });
        } else {
            if (!importForm.data.target_project_id) return;
            importForm.post(`/projects/${importForm.data.target_project_id}/import-maprex`, {
                forceFormData: true,
                onSuccess: () => {
                    setIsImportDialogOpen(false);
                    importForm.reset();
                },
            });
        }
    };

    const form = useForm({
        code: '',
        name: '',
        client_name: '',
        location: '',
        resident_engineer_id: '',
        manager_id: '',
        start_date: '',
        estimated_end_date: '',
        budget_usd: '',
        progress_percentage: '0.00',
        status: 'en_ejecucion',
        description: '',
    });

    // Abrir modal para crear
    const openCreateDialog = () => {
        setEditingProject(null);
        form.reset();
        form.setData({
            code: `OBR-${new Date().getFullYear()}-${String((projects?.length || 0) + 1).padStart(3, '0')}`,
            name: '',
            client_name: '',
            location: '',
            resident_engineer_id: '',
            manager_id: '',
            start_date: '',
            estimated_end_date: '',
            budget_usd: '',
            progress_percentage: '0.00',
            status: 'en_ejecucion',
            description: '',
        });
        setIsDialogOpen(true);
    };

    // Abrir modal para editar
    const openEditDialog = (project: Project) => {
        setEditingProject(project);
        form.setData({
            code: project.code,
            name: project.name,
            client_name: project.client_name || '',
            location: project.location,
            resident_engineer_id: project.resident_engineer_id ? String(project.resident_engineer_id) : '',
            manager_id: project.manager_id ? String(project.manager_id) : '',
            start_date: project.start_date || '',
            estimated_end_date: project.estimated_end_date || '',
            budget_usd: String(project.budget_usd || 0),
            progress_percentage: String(project.progress_percentage || 0),
            status: project.status,
            description: project.description || '',
        });
        setIsDialogOpen(true);
    };

    // Enviar formulario (crear o actualizar)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject) {
            form.put(`/projects/${editingProject.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            form.post('/projects', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    // Eliminar obra
    const handleDelete = async (id: number, name: string) => {
        const ok = await confirmModal({
            title: `¿Eliminar la obra "${name}"?`,
            description: `¿Estás seguro de que deseas eliminar esta obra? Esta acción borrará permanentemente sus fases, sub-almacenes asociados y presupuestos asignados.`,
            confirmText: 'Sí, eliminar obra',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/projects/${id}`, { preserveScroll: true });
        }
    };

    // Filtrar búsqueda
    const applyFilters = (newStatus?: string, newResident?: string) => {
        const s = newStatus !== undefined ? newStatus : selectedStatus;
        const r = newResident !== undefined ? newResident : selectedResident;
        router.get(
            '/projects',
            { search, status: s, resident_id: r },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const getStatusBadge = (status: Project['status']) => {
        switch (status) {
            case 'en_ejecucion':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        En Ejecución
                    </Badge>
                );
            case 'licitacion':
                return (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5">
                        <Clock className="size-3" />
                        En Licitación
                    </Badge>
                );
            case 'culminada':
                return (
                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="size-3" />
                        Culminada
                    </Badge>
                );
            case 'paralizada':
                return (
                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold flex items-center gap-1.5">
                        <PauseCircle className="size-3" />
                        Paralizada
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Obras y Proyectos" />

            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Building2 className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Gestión Integral de Obras & Proyectos
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control de contratos, cómputos métricos tipo Maprex, fases de cronograma y residentes en campo.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setImportMode('new');
                            importForm.reset();
                            importForm.setData({
                                target_project_id: '',
                                code: `OBR-${new Date().getFullYear()}-${String((projects?.length || 0) + 1).padStart(3, '0')}`,
                                name: '',
                                client_name: '',
                                location: '',
                                resident_engineer_id: '',
                                status: 'en_ejecucion',
                                file: null,
                            });
                            setIsImportDialogOpen(true);
                        }}
                        className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-bold shadow-xs flex items-center gap-2"
                    >
                        <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                        Importar desde Maprex (Excel/CSV)
                    </Button>
                    <Button
                        onClick={openCreateDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs flex items-center gap-2"
                    >
                        <Plus className="size-4" />
                        Nueva Obra / Proyecto
                    </Button>
                </div>
            </div>

            {/* KPIs Métricos TailAdmin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Total Obras BANPE
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300">
                            <Building2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.en_ejecucion} en ejecución activa
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Obras Activas
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {stats.en_ejecucion}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Frentes de trabajo abiertos en campo
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Presupuesto Global ({currencySymbol})
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <DollarSign className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {formatMoney(stats.total_budget_usd, { showCode: false })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Monto total de contratos en {currency}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Avance Físico Promedio
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <CalendarClock className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {stats.avg_progress}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, stats.avg_progress))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Búsqueda y Filtros de Estado */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-xs">
                {/* Formulario de búsqueda */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por código (OBR-...), nombre de obra, cliente o ciudad..."
                        className="pl-9 bg-background h-10 w-full"
                    />
                </form>

                {/* Filtro por Estado */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {[
                        { key: 'todas', label: 'Todas' },
                        { key: 'en_ejecucion', label: 'En Ejecución' },
                        { key: 'licitacion', label: 'Licitación' },
                        { key: 'culminada', label: 'Culminadas' },
                        { key: 'paralizada', label: 'Paralizadas' },
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

                {/* Selector de Residente */}
                <select
                    value={selectedResident}
                    onChange={(e) => {
                        setSelectedResident(e.target.value);
                        applyFilters(undefined, e.target.value);
                    }}
                    className="h-10 text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring shrink-0 font-medium"
                >
                    <option value="todos">Todos los Residentes</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>

                {/* Selector de Moneda Dual */}
                <div className="shrink-0">
                    <CurrencyToggle size="sm" />
                </div>
            </div>

            {/* Listado de Obras en Tarjetas de Alto Impacto con Efecto Skeleton MUI */}
            {isLoading ? (
                <CardGridSkeleton count={pagination.perPage} />
            ) : (
                <div className="space-y-6">
                    <div className="min-h-[400px]">
                        {pagination.isChangingPage ? (
                            <CardGridSkeleton count={pagination.perPage} />
                        ) : pagination.totalItems === 0 ? (
                            <Card className="border-dashed border-2 py-12 text-center">
                                <CardContent className="flex flex-col items-center justify-center space-y-3">
                                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                                        <Building2 className="size-8" />
                                    </div>
                                    <div className="text-lg font-bold text-foreground">
                                        No se encontraron obras registradas
                                    </div>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        No hay proyectos que coincidan con los filtros aplicados. Puedes crear una nueva obra o limpiar el filtro de búsqueda.
                                    </p>
                                    <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold mt-2">
                                        <Plus className="size-4 mr-1.5" />
                                        Crear Primera Obra
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {pagination.paginatedItems.map((project) => {
                        const progress = Number(project.progress_percentage || 0);
                        const budget = Number(project.budget_usd || 0);
                        const phasesCount = project.phases?.length || 0;
                        const materialsCount = project.project_materials?.length || 0;

                        return (
                            <Card
                                key={project.id}
                                className="group relative border border-border/70 hover:border-amber-500/50 transition-all duration-200 shadow-xs hover:shadow-md bg-card flex flex-col justify-between overflow-hidden"
                            >
                                {/* Borde superior de acento */}
                                <div
                                    className={`h-1.5 w-full ${
                                        project.status === 'en_ejecucion'
                                            ? 'bg-emerald-500'
                                            : project.status === 'licitacion'
                                            ? 'bg-amber-500'
                                            : project.status === 'culminada'
                                            ? 'bg-blue-500'
                                            : 'bg-zinc-500'
                                    }`}
                                />

                                <CardHeader className="pb-3 pt-4">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/50 border-border text-foreground">
                                            {project.code}
                                        </Badge>
                                        {getStatusBadge(project.status)}
                                    </div>

                                    <CardTitle className="text-lg font-black text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                                        <Link href={`/projects/${project.id}`}>
                                            {project.name}
                                        </Link>
                                    </CardTitle>

                                    {project.client_name && (
                                        <CardDescription className="text-xs font-medium text-muted-foreground line-clamp-1 flex items-center gap-1.5 mt-0.5">
                                            <Briefcase className="size-3 shrink-0 text-amber-500/80" />
                                            {project.client_name}
                                        </CardDescription>
                                    )}

                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                                        <MapPin className="size-3.5 shrink-0 text-zinc-400" />
                                        <span className="line-clamp-1">{project.location}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 text-xs pb-3">
                                    {/* Barra de Avance Físico */}
                                    <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                                <TrendingUp className="size-3 text-amber-500" />
                                                Avance de Obra:
                                            </span>
                                            <span className="font-extrabold text-foreground">{progress.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                    progress >= 100
                                                        ? 'bg-blue-500'
                                                        : progress > 50
                                                        ? 'bg-emerald-500'
                                                        : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Ingeniero Residente */}
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                                <HardHat className="size-4" />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                    Ing. Residente
                                                </div>
                                                <div className="font-bold text-foreground text-xs truncate">
                                                    {project.resident_engineer?.name || 'No asignado'}
                                                </div>
                                            </div>
                                        </div>

                                        {project.resident_engineer?.phone && (
                                            <a
                                                href={`https://wa.me/${project.resident_engineer.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(project.resident_engineer.name)},%20te%20contacto%20sobre%20la%20obra%20${encodeURIComponent(project.name)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                                                title={`Escribir WhatsApp a ${project.resident_engineer.name}`}
                                            >
                                                <MessageSquare className="size-4" />
                                            </a>
                                        )}
                                    </div>

                                    {/* Cifras Claves: Presupuesto, Fases, Insumos */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="bg-muted/40 p-2 rounded-md">
                                            <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                                                Presupuesto ({currency})
                                            </div>
                                            <div className="font-extrabold text-foreground text-sm">
                                                {formatMoney(budget, { showCode: false })}
                                            </div>
                                        </div>
                                        <div className="bg-muted/40 p-2 rounded-md">
                                            <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                                                Fases / Cómputos
                                            </div>
                                            <div className="font-bold text-foreground text-xs flex items-center gap-1.5 mt-0.5">
                                                <span className="flex items-center gap-0.5">
                                                    <CalendarClock className="size-3 text-amber-500" />
                                                    {phasesCount} fases
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-0.5">
                                                    <Layers className="size-3 text-blue-500" />
                                                    {materialsCount} insumos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-2 pb-4 border-t border-border/50 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(project)}
                                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                            title="Editar datos de obra"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(project.id, project.name)}
                                            className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                            title="Eliminar obra"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setImportMode('existing');
                                                importForm.setData('target_project_id', String(project.id));
                                                setIsImportDialogOpen(true);
                                            }}
                                            className="h-8 px-2 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1"
                                            title="Importar cómputos de Maprex a esta obra"
                                        >
                                            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="hidden sm:inline">Importar Maprex</span>
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold h-8 text-xs"
                                        >
                                            <Link href={`/projects/${project.id}`}>
                                                Ver Cómputos & Fases
                                                <ArrowRight className="size-3.5 ml-1.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                            </div>
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
                        itemLabel="obras"
                    />
                </div>
            )}

            {/* Modal Dialog: Crear / Editar Obra */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Building2 className="size-5 text-amber-500" />
                            {editingProject ? 'Editar Obra o Proyecto' : 'Registrar Nueva Obra en BANPE'}
                        </DialogTitle>
                        <DialogDescription>
                            Configura los parámetros del contrato, ubicación geográfica y equipo técnico a cargo.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Código de Obra */}
                            <div className="space-y-1.5">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    Código Único de Obra *
                                </Label>
                                <Input
                                    id="code"
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                                    placeholder="Ej: OBR-2026-004"
                                    className="font-mono"
                                    required
                                />
                                <InputError message={form.errors.code} />
                            </div>

                            {/* Estado del Proyecto */}
                            <div className="space-y-1.5">
                                <Label htmlFor="status" className="text-xs font-semibold">
                                    Estado Operativo *
                                </Label>
                                <select
                                    id="status"
                                    value={form.data.status}
                                    onChange={(e) => form.setData('status', e.target.value as Project['status'])}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="licitacion">En Licitación / Estudio</option>
                                    <option value="en_ejecucion">En Ejecución Activa</option>
                                    <option value="paralizada">Paralizada Temporalmente</option>
                                    <option value="culminada">Culminada / Cerrada</option>
                                </select>
                                <InputError message={form.errors.status} />
                            </div>
                        </div>

                        {/* Nombre de la Obra */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-semibold">
                                Nombre de la Obra / Proyecto *
                            </Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Ej: Construcción Centro Logístico San Diego"
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Cliente / Contratante */}
                            <div className="space-y-1.5">
                                <Label htmlFor="client_name" className="text-xs font-semibold">
                                    Cliente / Empresa Contratante
                                </Label>
                                <Input
                                    id="client_name"
                                    value={form.data.client_name}
                                    onChange={(e) => form.setData('client_name', e.target.value)}
                                    placeholder="Ej: Alimentos Polar C.A."
                                />
                                <InputError message={form.errors.client_name} />
                            </div>

                            {/* Ubicación */}
                            <div className="space-y-1.5">
                                <Label htmlFor="location" className="text-xs font-semibold">
                                    Ubicación Geográfica *
                                </Label>
                                <Input
                                    id="location"
                                    value={form.data.location}
                                    onChange={(e) => form.setData('location', e.target.value)}
                                    placeholder="Ej: Valencia, Estado Carabobo"
                                    required
                                />
                                <InputError message={form.errors.location} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Ingeniero Residente */}
                            <div className="space-y-1.5">
                                <Label htmlFor="resident_engineer_id" className="text-xs font-semibold">
                                    Ingeniero Residente en Obra
                                </Label>
                                <select
                                    id="resident_engineer_id"
                                    value={form.data.resident_engineer_id}
                                    onChange={(e) => form.setData('resident_engineer_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Seleccionar Ingeniero Residente...</option>
                                    {availableResidents.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role?.name || u.email})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.resident_engineer_id} />
                            </div>

                            {/* Gerente a Cargo */}
                            <div className="space-y-1.5">
                                <Label htmlFor="manager_id" className="text-xs font-semibold">
                                    Gerente de Proyecto Responsable
                                </Label>
                                <select
                                    id="manager_id"
                                    value={form.data.manager_id}
                                    onChange={(e) => form.setData('manager_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Seleccionar Gerente...</option>
                                    {availableManagers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role?.name || u.email})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.manager_id} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Presupuesto Total USD */}
                            <div className="space-y-1.5">
                                <Label htmlFor="budget_usd" className="text-xs font-semibold">
                                    Presupuesto Contratado ($ USD) *
                                </Label>
                                <Input
                                    id="budget_usd"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.data.budget_usd}
                                    onChange={(e) => form.setData('budget_usd', e.target.value)}
                                    required
                                />
                                <InputError message={form.errors.budget_usd} />
                            </div>

                            {/* Fecha de Inicio */}
                            <div className="space-y-1.5">
                                <Label htmlFor="start_date" className="text-xs font-semibold">
                                    Fecha de Inicio
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={form.data.start_date}
                                    onChange={(e) => form.setData('start_date', e.target.value)}
                                />
                                <InputError message={form.errors.start_date} />
                            </div>

                            {/* Fecha Estimada Fin */}
                            <div className="space-y-1.5">
                                <Label htmlFor="estimated_end_date" className="text-xs font-semibold">
                                    Fecha Culminación Estimada
                                </Label>
                                <Input
                                    id="estimated_end_date"
                                    type="date"
                                    value={form.data.estimated_end_date}
                                    onChange={(e) => form.setData('estimated_end_date', e.target.value)}
                                />
                                <InputError message={form.errors.estimated_end_date} />
                            </div>
                        </div>

                        {/* Avance en caso de edición */}
                        {editingProject && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="progress_percentage" className="text-xs font-semibold">
                                        Avance Físico Global de la Obra (%)
                                    </Label>
                                    <span className="text-xs font-bold text-amber-500">
                                        {Number(form.data.progress_percentage || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <Input
                                    id="progress_percentage"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={form.data.progress_percentage}
                                    onChange={(e) => form.setData('progress_percentage', e.target.value)}
                                />
                                <InputError message={form.errors.progress_percentage} />
                            </div>
                        )}

                        {/* Descripción y Alcance */}
                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs font-semibold">
                                Memoria Descriptiva & Alcance del Proyecto
                            </Label>
                            <textarea
                                id="description"
                                rows={3}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                placeholder="Detalles de fundaciones, estructura, especificaciones especiales..."
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {form.processing && <Spinner className="mr-2" />}
                                {editingProject ? 'Guardar Cambios' : 'Registrar Obra'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: IMPORTAR DESDE MAPREX (NUEVA OBRA O EXISTENTE) */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="sm:max-w-[760px] md:max-w-[840px] max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-lg font-black text-foreground">
                                Importador de Cómputos y Presupuestos Maprex
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Carga directamente los presupuestos exportados de Maprex en formato Excel (.xls / .xlsx) o CSV para integrarlos al sistema BANPE.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Pestañas de modo: Nueva Obra vs Obra Existente */}
                    <div className="flex items-center p-1 bg-muted/60 rounded-lg gap-1 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setImportMode('new')}
                            className={`flex-1 py-1.5 rounded-md transition-all ${
                                importMode === 'new'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            + Crear Nueva Obra desde Maprex
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportMode('existing')}
                            className={`flex-1 py-1.5 rounded-md transition-all ${
                                importMode === 'existing'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Cargar en Obra Existente
                        </button>
                    </div>

                    {/* Caja de descarga de archivos oficiales de Maprex */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
                        <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Download className="size-3.5" />
                            Archivos oficiales de Maprex listos para probar:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href="/templates/Presupuesto_Maprex_Carretera_Troncal.xls"
                                download="Presupuesto_Maprex_Carretera_Troncal.xls"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-muted text-foreground border border-border rounded-md font-bold text-[11px] transition-colors"
                            >
                                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                                Carretera Troncal (16 Partidas .xls)
                            </a>
                            <a
                                href="/templates/Presupuesto_Maprex_Carretera_Troncal.csv"
                                download="Presupuesto_Maprex_Carretera_Troncal.csv"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-muted text-foreground border border-border rounded-md font-bold text-[11px] transition-colors"
                            >
                                <Download className="size-3.5 text-blue-600" />
                                Carretera Troncal (.csv)
                            </a>
                            <a
                                href="/templates/Presupuesto_Maprex_Ejemplo_BANPE.xls"
                                download="Presupuesto_Maprex_Ejemplo_BANPE.xls"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-muted text-foreground border border-border rounded-md font-bold text-[11px] transition-colors"
                            >
                                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                                Ejemplo Edificación (12 Partidas .xls)
                            </a>
                        </div>
                    </div>

                    <form onSubmit={handleImportSubmit} className="space-y-3 pt-1">
                        {importMode === 'new' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="maprex_code" className="text-xs font-semibold">
                                        Código de Obra *
                                    </Label>
                                    <Input
                                        id="maprex_code"
                                        value={importForm.data.code}
                                        onChange={(e) => importForm.setData('code', e.target.value)}
                                        placeholder="OBR-2026-001"
                                        className="mt-1 h-9 text-xs font-mono"
                                        required
                                    />
                                    <InputError message={importForm.errors.code} />
                                </div>
                                <div>
                                    <Label htmlFor="maprex_status" className="text-xs font-semibold">
                                        Estado Inicial *
                                    </Label>
                                    <select
                                        id="maprex_status"
                                        value={importForm.data.status}
                                        onChange={(e) => importForm.setData('status', e.target.value)}
                                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                                    >
                                        <option value="en_ejecucion">En Ejecución</option>
                                        <option value="licitacion">En Licitación</option>
                                        <option value="paralizada">Paralizada</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <Label htmlFor="maprex_name" className="text-xs font-semibold">
                                        Nombre del Proyecto *
                                    </Label>
                                    <Input
                                        id="maprex_name"
                                        value={importForm.data.name}
                                        onChange={(e) => importForm.setData('name', e.target.value)}
                                        placeholder="Ej. Reparaciones en Carretera Troncal..."
                                        className="mt-1 h-9 text-xs"
                                        required
                                    />
                                    <InputError message={importForm.errors.name} />
                                </div>

                                <div>
                                    <Label htmlFor="maprex_client" className="text-xs font-semibold">
                                        Cliente / Ente Contratante
                                    </Label>
                                    <Input
                                        id="maprex_client"
                                        value={importForm.data.client_name}
                                        onChange={(e) => importForm.setData('client_name', e.target.value)}
                                        placeholder="Ej. Gobernación de Carabobo"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="maprex_location" className="text-xs font-semibold">
                                        Ubicación / Estado *
                                    </Label>
                                    <Input
                                        id="maprex_location"
                                        value={importForm.data.location}
                                        onChange={(e) => importForm.setData('location', e.target.value)}
                                        placeholder="Ej. Valencia, Carabobo"
                                        className="mt-1 h-9 text-xs"
                                        required
                                    />
                                    <InputError message={importForm.errors.location} />
                                </div>

                                <div>
                                    <Label htmlFor="maprex_resident" className="text-xs font-semibold">
                                        Ingeniero Residente Asignado
                                    </Label>
                                    <select
                                        id="maprex_resident"
                                        value={importForm.data.resident_engineer_id}
                                        onChange={(e) => importForm.setData('resident_engineer_id', e.target.value)}
                                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                                    >
                                        <option value="">Sin Asignar</option>
                                        {availableResidents.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role?.name || u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="file_maprex" className="text-xs font-semibold">
                                        Archivo Maprex (.xls, .xlsx, .csv, .txt) *
                                    </Label>
                                    <Input
                                        id="file_maprex"
                                        type="file"
                                        accept=".csv,.xls,.xlsx,.xml,.txt"
                                        onChange={(e) => importForm.setData('file', e.target.files?.[0] || null)}
                                        className="mt-1 cursor-pointer text-xs h-9"
                                        required
                                    />
                                    <InputError message={importForm.errors.file} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="target_project" className="text-xs font-semibold">
                                        Seleccionar Obra de Destino *
                                    </Label>
                                    <select
                                        id="target_project"
                                        value={importForm.data.target_project_id}
                                        onChange={(e) => importForm.setData('target_project_id', e.target.value)}
                                        className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs font-medium"
                                        required
                                    >
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                [{p.code}] {p.name} ({p.location})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Las partidas de Maprex se sumarán e integrarán a esta obra existente.
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="file_maprex_existing" className="text-xs font-semibold">
                                        Archivo de Presupuesto Maprex (.xls, .xlsx, .csv, .txt) *
                                    </Label>
                                    <Input
                                        id="file_maprex_existing"
                                        type="file"
                                        accept=".csv,.xls,.xlsx,.xml,.txt"
                                        onChange={(e) => importForm.setData('file', e.target.files?.[0] || null)}
                                        className="mt-1 cursor-pointer text-xs"
                                        required
                                    />
                                    <InputError message={importForm.errors.file} />
                                </div>
                            </div>
                        )}

                        {/* Selector de Moneda de Origen (Dólares vs Bolívares con tasa BCV) */}
                        <div className="p-3 rounded-lg border border-border/80 bg-muted/40 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <DollarSign className="size-3.5 text-amber-500" />
                                    Moneda del Presupuesto en Maprex:
                                </Label>
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {importForm.data.currency === 'USD'
                                        ? 'Importación directa en Dólares ($ USD)'
                                        : 'Conversión automática a USD con tasa BCV'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => importForm.setData('currency', 'USD')}
                                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center border ${
                                        importForm.data.currency === 'USD'
                                            ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs'
                                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                    }`}
                                >
                                    $ Dólares (USD)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => importForm.setData('currency', 'VES')}
                                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center border ${
                                        importForm.data.currency === 'VES'
                                            ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs'
                                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                    }`}
                                >
                                    Bs. Bolívares (VES)
                                </button>
                            </div>
                            {importForm.data.currency === 'VES' && (
                                <div className="pt-1.5 space-y-1.5 animate-in fade-in duration-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label htmlFor="exchange_rate" className="text-xs font-semibold text-muted-foreground shrink-0">
                                            Tasa de Cambio BCV / Referencial (Bs./$):
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="exchange_rate"
                                                type="number"
                                                step="0.0001"
                                                min="0.0001"
                                                value={importForm.data.exchange_rate}
                                                onChange={(e) => importForm.setData('exchange_rate', e.target.value)}
                                                placeholder={rate.toString()}
                                                className="h-8 text-xs font-bold font-mono text-amber-600 dark:text-amber-400 max-w-[130px]"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => importForm.setData('exchange_rate', rate.toString())}
                                                className="h-8 text-[11px] font-bold"
                                            >
                                                Usar BCV ({rate.toFixed(2)})
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Tasa oficial obtenida en tiempo real desde DolarApi. Puedes modificarla manualmente si lo deseas.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsImportDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={importForm.processing || !importForm.data.file}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {importForm.processing && <Spinner className="mr-2" />}
                                <UploadCloud className="size-4 mr-1.5" />
                                {importMode === 'new' ? 'Crear Obra e Importar Partidas' : 'Inyectar Partidas a la Obra'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

ProjectsIndex.layout = {
    breadcrumbs,
};

