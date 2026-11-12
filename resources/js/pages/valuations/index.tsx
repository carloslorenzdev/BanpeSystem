import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Award,
    Building2,
    Calendar,
    CalendarCheck2,
    CheckCircle2,
    Clock,
    DollarSign,
    ExternalLink,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    HardHat,
    Layers,
    MapPin,
    Printer,
    Search,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    TrendingUp,
    UserCheck,
    X,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CardGridSkeleton } from '@/components/skeletons';
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
import type { BreadcrumbItem } from '@/types';

type ProjectValuation = {
    id: number;
    code: string;
    name: string;
    client_name: string;
    location: string;
    budget_usd: number;
    executed_usd: number;
    progress_percentage: number;
    status: string;
    valuation_status: string;
    internal_valuation_date: string | null;
    internal_valuation_notes: string | null;
    external_valuation_date: string | null;
    external_valuation_notes: string | null;
    inspector_name: string | null;
    termination_act_number: string | null;
    start_date: string | null;
    estimated_end_date: string | null;
    actual_end_date: string | null;
    resident_engineer: {
        id: number;
        name: string;
        email: string;
        phone?: string;
    } | null;
    manager: {
        id: number;
        name: string;
        email: string;
    } | null;
    total_phases: number;
    completed_phases: number;
    phases: Array<{
        id: number;
        name: string;
        progress_percentage: number;
        status: string;
        start_date?: string;
        end_date?: string;
    }>;
    materials_count: number;
    materials: Array<{
        id: number;
        material_name: string;
        material_code: string;
        unit_symbol: string;
        estimated_quantity: number;
        dispatched_quantity: number;
        unit_price_usd: number;
        total_price_usd: number;
        executed_total_usd: number;
    }>;
};

type ValuationStats = {
    total_obras: number;
    pendientes_valuacion: number;
    valuacion_interna: number;
    valuacion_externa: number;
    cerradas_concluidas: number;
    total_presupuestado_usd: number;
};

interface ValuationsIndexProps {
    projects: ProjectValuation[];
    stats: ValuationStats;
    filters: {
        search?: string;
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Valuaciones de Cierre', href: '/valuations' },
];

export default function ValuationsIndex({ projects = [], stats, filters }: ValuationsIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [selectedStatusTab, setSelectedStatusTab] = useState(filters?.status || 'todas');

    // Modales de acción
    const [selectedProject, setSelectedProject] = useState<ProjectValuation | null>(null);
    const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
    const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isActaModalOpen, setIsActaModalOpen] = useState(false);

    // Formularios
    const internalForm = useForm({
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const externalForm = useForm({
        inspector_name: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const closeForm = useForm({
        acta_number: '',
        notes: '',
    });

    // Filtrar proyectos en cliente para búsqueda instantánea
    const filteredProjects = useMemo(() => {
        return projects.filter((project) => {
            const matchesSearch =
                searchTerm === '' ||
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.location.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                selectedStatusTab === 'todas' ||
                (selectedStatusTab === 'pendiente' && (project.valuation_status === 'pendiente' || !project.valuation_status)) ||
                project.valuation_status === selectedStatusTab ||
                (selectedStatusTab === 'cerrada' && project.status === 'culminada');

            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, selectedStatusTab]);

    const pagination = useTablePagination({
        items: filteredProjects,
        initialPerPage: 10,
    });

    // Abrir modal de Valuación Interna
    const handleOpenInternal = (project: ProjectValuation) => {
        setSelectedProject(project);
        internalForm.setData({
            date: new Date().toISOString().split('T')[0],
            notes: project.internal_valuation_notes || `Valuación técnica interna conforme. Se constata la culminación de ${project.completed_phases}/${project.total_phases} fases y cómputos métricos en sitio.`,
        });
        setIsInternalModalOpen(true);
    };

    const submitInternal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        internalForm.post(`/valuations/${selectedProject.id}/internal`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsInternalModalOpen(false);
                internalForm.reset();
            },
        });
    };

    // Abrir modal de Valuación Externa
    const handleOpenExternal = (project: ProjectValuation) => {
        setSelectedProject(project);
        externalForm.setData({
            inspector_name: project.inspector_name || '',
            date: new Date().toISOString().split('T')[0],
            notes: project.external_valuation_notes || 'Inspección técnica satisfactoria. Se otorga la conformidad por parte de la supervisión del cliente.',
        });
        setIsExternalModalOpen(true);
    };

    const submitExternal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        externalForm.post(`/valuations/${selectedProject.id}/external`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsExternalModalOpen(false);
                externalForm.reset();
            },
        });
    };

    // Abrir modal de Cierre y Finiquito
    const handleOpenClose = (project: ProjectValuation) => {
        setSelectedProject(project);
        const autoActa = `ACT-TERM-${new Date().getFullYear()}-${String(project.id).padStart(3, '0')}`;
        closeForm.setData({
            acta_number: project.termination_act_number || autoActa,
            notes: 'Finiquito definitivo de obra. Cumplimiento de metas físicas y contractuales sin observaciones pendientes.',
        });
        setIsCloseModalOpen(true);
    };

    const submitClose = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        closeForm.post(`/valuations/${selectedProject.id}/close`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCloseModalOpen(false);
                closeForm.reset();
            },
        });
    };

    // Ver detalle de cómputos
    const handleOpenDetail = (project: ProjectValuation) => {
        setSelectedProject(project);
        setIsDetailModalOpen(true);
    };

    // Ver comprobante formal de Acta
    const handleOpenActa = (project: ProjectValuation) => {
        setSelectedProject(project);
        setIsActaModalOpen(true);
    };

    const getValuationBadge = (status: string, projectStatus: string) => {
        if (projectStatus === 'culminada' || status === 'cerrada') {
            return (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 font-semibold">
                    <CheckCircle2 className="size-3.5" />
                    Obra Finiquitada (Cerrada)
                </Badge>
            );
        }
        switch (status) {
            case 'valuacion_externa_aprobada':
                return (
                    <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 gap-1.5 font-semibold">
                        <UserCheck className="size-3.5" />
                        Valuación Externa Aprobada
                    </Badge>
                );
            case 'valuacion_interna_aprobada':
                return (
                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 gap-1.5 font-semibold">
                        <FileCheck2 className="size-3.5" />
                        Valuación Interna Aprobada
                    </Badge>
                );
            case 'pendiente':
            default:
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1.5 font-semibold">
                        <Clock className="size-3.5" />
                        Pendiente de Valuación
                    </Badge>
                );
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Valuaciones de Cierre y Liquidación | BANPE" />

            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <FileSpreadsheet className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Valuaciones de Cierre y Liquidación de Obras
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Procedimiento BANPE-DFO-04-a (ISO 9001). Valuación técnica interna, conformidad de inspección de cliente y finiquito con acta.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-card border-border text-foreground gap-1.5 shadow-xs">
                        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Norma ISO 9001:2015
                    </Badge>
                    <Link href="/projects">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Building2 className="size-4" />
                            Ver Obras Activas
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stepper Informativo ISO 9001 BANPE-DFO-04-a */}
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="size-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Flujo Normativo de Cierre de Obras (BANPE SGC)
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">1</span>
                        <div>
                            <p className="font-bold text-foreground">Cómputo y Fases 100%</p>
                            <p className="text-muted-foreground mt-0.5">Finiquito de partidas despachadas y medición de metas físicas.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold">2</span>
                        <div>
                            <p className="font-bold text-foreground">Valuación Interna</p>
                            <p className="text-muted-foreground mt-0.5">Revisión y visto bueno técnico por el Ing. Residente y Coordinación.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold">3</span>
                        <div>
                            <p className="font-bold text-foreground">Valuación Externa</p>
                            <p className="text-muted-foreground mt-0.5">Inspección en sitio y conformidad firmada por la supervisión del Cliente.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">4</span>
                        <div>
                            <p className="font-bold text-foreground">Acta de Terminación</p>
                            <p className="text-muted-foreground mt-0.5">Cierre definitivo y retorno automático de remanentes a Stock Libre.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjetas Métricas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <Card className="border border-border/70 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Total Obras
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300">
                            <Building2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.total_obras}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">En registro SGC BANPE</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Pendientes
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendientes_valuacion}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Por iniciar valuación</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Val. Interna
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <FileCheck2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.valuacion_interna}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Aprobadas por Residencia</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Val. Externa
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <UserCheck className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.valuacion_externa}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Listas para Acta Final</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Finiquitadas
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Award className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.cerradas_concluidas}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Con Acta de Terminación</p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar por código, obra, cliente o ubicación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 h-9"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <Button
                        size="sm"
                        variant={selectedStatusTab === 'todas' ? 'default' : 'outline'}
                        onClick={() => setSelectedStatusTab('todas')}
                        className={`h-8 text-xs font-semibold ${selectedStatusTab === 'todas' ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950' : ''}`}
                    >
                        Todas ({projects.length})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedStatusTab === 'pendiente' ? 'default' : 'outline'}
                        onClick={() => setSelectedStatusTab('pendiente')}
                        className={`h-8 text-xs font-semibold ${selectedStatusTab === 'pendiente' ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950' : ''}`}
                    >
                        Pendientes ({stats.pendientes_valuacion})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedStatusTab === 'valuacion_interna_aprobada' ? 'default' : 'outline'}
                        onClick={() => setSelectedStatusTab('valuacion_interna_aprobada')}
                        className={`h-8 text-xs font-semibold ${selectedStatusTab === 'valuacion_interna_aprobada' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                    >
                        Val. Interna ({stats.valuacion_interna})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedStatusTab === 'valuacion_externa_aprobada' ? 'default' : 'outline'}
                        onClick={() => setSelectedStatusTab('valuacion_externa_aprobada')}
                        className={`h-8 text-xs font-semibold ${selectedStatusTab === 'valuacion_externa_aprobada' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                    >
                        Val. Externa ({stats.valuacion_externa})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedStatusTab === 'cerrada' ? 'default' : 'outline'}
                        onClick={() => setSelectedStatusTab('cerrada')}
                        className={`h-8 text-xs font-semibold ${selectedStatusTab === 'cerrada' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                    >
                        Finiquitadas ({stats.cerradas_concluidas})
                    </Button>
                </div>
            </div>

            {/* Listado / Tabla de Obras para Valuación */}
            {pagination.isChangingPage ? (
                <CardGridSkeleton count={4} />
            ) : pagination.paginatedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border bg-card">
                    <FileSpreadsheet className="size-12 text-muted-foreground/50 mb-3" />
                    <h3 className="text-base font-bold text-foreground">No se encontraron obras para este filtro</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        Intenta ajustar el término de búsqueda o selecciona otra pestaña de estado.
                    </p>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {pagination.paginatedItems.map((project) => {
                        const isClosed = project.status === 'culminada' || project.valuation_status === 'cerrada';
                        const hasInternal = project.valuation_status === 'valuacion_interna_aprobada' || project.valuation_status === 'valuacion_externa_aprobada' || isClosed;
                        const hasExternal = project.valuation_status === 'valuacion_externa_aprobada' || isClosed;

                        const financialPct = project.budget_usd > 0
                            ? Math.min(100, Math.round((project.executed_usd / project.budget_usd) * 100))
                            : 0;

                        return (
                            <div
                                key={project.id}
                                className={`rounded-xl border transition-all p-4 sm:p-5 shadow-xs bg-card ${
                                    isClosed
                                        ? 'border-emerald-500/40 bg-emerald-500/5'
                                        : 'border-border/80 hover:border-amber-500/40'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Información de la Obra */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                {project.code}
                                            </span>
                                            <h3 className="text-base font-extrabold text-foreground truncate">
                                                {project.name}
                                            </h3>
                                            {getValuationBadge(project.valuation_status, project.status)}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                                                <Building2 className="size-3.5 text-muted-foreground" />
                                                Cliente: {project.client_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="size-3.5 text-muted-foreground" />
                                                {project.location}
                                            </span>
                                            {project.resident_engineer && (
                                                <span className="flex items-center gap-1">
                                                    <HardHat className="size-3.5 text-muted-foreground" />
                                                    Residente: {project.resident_engineer.name}
                                                </span>
                                            )}
                                            {project.inspector_name && (
                                                <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-semibold">
                                                    <UserCheck className="size-3.5" />
                                                    Inspector: {project.inspector_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progreso Físico y Financiero */}
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 shrink-0 border-y sm:border-y-0 sm:border-l border-border/60 py-2 sm:py-0 sm:pl-4">
                                        <div className="text-left sm:text-right min-w-[130px]">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Avance Físico ({project.completed_phases}/{project.total_phases} Fases)
                                            </p>
                                            <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                                                <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            project.progress_percentage >= 100
                                                                ? 'bg-emerald-500'
                                                                : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-black text-foreground">
                                                    {Number(project.progress_percentage).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right min-w-[150px]">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Ejecutado vs Presupuesto
                                            </p>
                                            <p className="text-sm font-black text-foreground">
                                                ${project.executed_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-xs text-muted-foreground font-normal ml-1">
                                                    / ${project.budget_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Valuado financiero: {financialPct}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenDetail(project)}
                                            className="h-8 gap-1.5 text-xs font-semibold"
                                        >
                                            <Eye className="size-3.5" />
                                            Cómputos ({project.materials_count})
                                        </Button>

                                        {!hasInternal && !isClosed && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenInternal(project)}
                                                className="h-8 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                            >
                                                <FileCheck2 className="size-3.5" />
                                                Valuación Interna
                                            </Button>
                                        )}

                                        {hasInternal && !hasExternal && !isClosed && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenExternal(project)}
                                                className="h-8 gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                                            >
                                                <UserCheck className="size-3.5" />
                                                Valuación Externa (Cliente)
                                            </Button>
                                        )}

                                        {hasExternal && !isClosed && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenClose(project)}
                                                className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                            >
                                                <Award className="size-3.5" />
                                                Emitir Acta de Terminación
                                            </Button>
                                        )}

                                        {isClosed && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenActa(project)}
                                                className="h-8 gap-1.5 text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                            >
                                                <FileText className="size-3.5" />
                                                Acta #{project.termination_act_number || project.id}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Componente de Paginación */}
                    <DataTablePagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        fromIndex={pagination.fromIndex}
                        toIndex={pagination.toIndex}
                        perPage={pagination.perPage}
                        onPageChange={pagination.goToPage}
                        onPerPageChange={pagination.setPerPage}
                    />
                </div>
            )}

            {/* Modal: Valuación Interna */}
            <Dialog open={isInternalModalOpen} onOpenChange={setIsInternalModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <FileCheck2 className="size-5" />
                            Aprobación de Valuación Interna
                        </DialogTitle>
                        <DialogDescription>
                            Dictamen emitido por el Ing. Residente y Coordinación certificando la correcta ejecución de partidas en la obra <span className="font-semibold text-foreground">{selectedProject?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitInternal} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="internal_date">Fecha de Valuación Interna *</Label>
                            <Input
                                id="internal_date"
                                type="date"
                                value={internalForm.data.date}
                                onChange={(e) => internalForm.setData('date', e.target.value)}
                                required
                            />
                            <InputError message={internalForm.errors.date} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="internal_notes">Observaciones Técnicas / Dictamen *</Label>
                            <textarea
                                id="internal_notes"
                                rows={4}
                                value={internalForm.data.notes}
                                onChange={(e) => internalForm.setData('notes', e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Indique el detalle de revisión técnica y computos en sitio..."
                                required
                            />
                            <InputError message={internalForm.errors.notes} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInternalModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={internalForm.processing}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {internalForm.processing && <Spinner className="mr-2" />}
                                Registrar Valuación Interna
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Valuación Externa (Cliente) */}
            <Dialog open={isExternalModalOpen} onOpenChange={setIsExternalModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <UserCheck className="size-5" />
                            Aprobación de Valuación Externa (Cliente)
                        </DialogTitle>
                        <DialogDescription>
                            Conformidad y visto bueno de la inspección fiscal del cliente para la obra <span className="font-semibold text-foreground">{selectedProject?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitExternal} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="inspector_name">Ingeniero Inspector o Fiscal del Cliente *</Label>
                            <Input
                                id="inspector_name"
                                type="text"
                                placeholder="Ej: Ing. Carlos Pérez (Supervisión Externa)"
                                value={externalForm.data.inspector_name}
                                onChange={(e) => externalForm.setData('inspector_name', e.target.value)}
                                required
                            />
                            <InputError message={externalForm.errors.inspector_name} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="external_date">Fecha de Valuación del Cliente *</Label>
                            <Input
                                id="external_date"
                                type="date"
                                value={externalForm.data.date}
                                onChange={(e) => externalForm.setData('date', e.target.value)}
                                required
                            />
                            <InputError message={externalForm.errors.date} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="external_notes">Dictamen / Conformidad del Cliente *</Label>
                            <textarea
                                id="external_notes"
                                rows={4}
                                value={externalForm.data.notes}
                                onChange={(e) => externalForm.setData('notes', e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Observaciones de conformidad emitidas por el cliente..."
                                required
                            />
                            <InputError message={externalForm.errors.notes} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsExternalModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={externalForm.processing}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                            >
                                {externalForm.processing && <Spinner className="mr-2" />}
                                Registrar Conformidad Cliente
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Acta de Terminación y Cierre Definitivo */}
            <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Award className="size-5" />
                            Emisión de Acta de Terminación & Finiquito
                        </DialogTitle>
                        <DialogDescription>
                            Procedimiento final BANPE-DFO-04-a para culminar oficialmente la obra <span className="font-semibold text-foreground">{selectedProject?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitClose} className="space-y-4 pt-2">
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="size-4" />
                                Efectos automáticos del cierre:
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                                <li>El proyecto se marca formalmente como <strong>CULMINADO (100%)</strong>.</li>
                                <li>Todas las fases pendientes se cierran como completadas.</li>
                                <li>Cualquier insumo asignado remanente en su sub-almacén se <strong>devuelve automáticamente a Stock Libre Central</strong>.</li>
                            </ul>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="acta_number">Número de Acta de Terminación</Label>
                            <Input
                                id="acta_number"
                                type="text"
                                value={closeForm.data.acta_number}
                                onChange={(e) => closeForm.setData('acta_number', e.target.value)}
                                placeholder="Ej: ACT-TERM-2026-001"
                            />
                            <InputError message={closeForm.errors.acta_number} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="close_notes">Observaciones Finales / Finiquito</Label>
                            <textarea
                                id="close_notes"
                                rows={3}
                                value={closeForm.data.notes}
                                onChange={(e) => closeForm.setData('notes', e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Observaciones finales de entrega..."
                            />
                            <InputError message={closeForm.errors.notes} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCloseModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={closeForm.processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {closeForm.processing && <Spinner className="mr-2" />}
                                Finiquitar Obra y Emitir Acta
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Detalle de Cómputos Métricos y Partidas */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="size-5 text-amber-500" />
                            Cómputos Métricos y Ejecución: {selectedProject?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Código: <span className="font-mono font-semibold">{selectedProject?.code}</span> | Cliente: {selectedProject?.client_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Resumen de Fases */}
                        <div className="border border-border/70 rounded-xl p-3.5 bg-muted/20">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Layers className="size-4" />
                                Cronograma de Fases ({selectedProject?.completed_phases}/{selectedProject?.total_phases} Concluidas)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {selectedProject?.phases?.map((ph) => (
                                    <div key={ph.id} className="flex items-center justify-between p-2 rounded bg-card border border-border/60">
                                        <div className="truncate pr-2">
                                            <p className="font-semibold text-foreground truncate">{ph.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{ph.start_date || 'Sin fecha'} - {ph.end_date || 'En curso'}</p>
                                        </div>
                                        <Badge variant={ph.status === 'completada' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                                            {Number(ph.progress_percentage).toFixed(0)}%
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabla de Partidas */}
                        <div className="border border-border/70 rounded-xl overflow-hidden">
                            <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Partidas Presupuestadas vs Despachadas a Obra
                                </h4>
                                <span className="text-xs font-semibold text-foreground">
                                    Total: {selectedProject?.materials?.length || 0} Partidas
                                </span>
                            </div>
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 text-left">Partida / Insumo</th>
                                            <th className="py-2 px-3 text-right">Presupuestado</th>
                                            <th className="py-2 px-3 text-right">Despachado</th>
                                            <th className="py-2 px-3 text-right">P.U. ($)</th>
                                            <th className="py-2 px-3 text-right">Ejecutado ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {selectedProject?.materials?.map((m) => (
                                            <tr key={m.id} className="hover:bg-muted/20">
                                                <td className="py-2 px-3">
                                                    <p className="font-medium text-foreground">{m.material_name}</p>
                                                    <p className="font-mono text-[10px] text-muted-foreground">{m.material_code}</p>
                                                </td>
                                                <td className="py-2 px-3 text-right font-medium">
                                                    {m.estimated_quantity} {m.unit_symbol}
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                                    {m.dispatched_quantity} {m.unit_symbol}
                                                </td>
                                                <td className="py-2 px-3 text-right text-muted-foreground">
                                                    ${m.unit_price_usd.toFixed(2)}
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                                    ${m.executed_total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDetailModalOpen(false)}
                        >
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Comprobante Formal de Acta de Terminación */}
            <Dialog open={isActaModalOpen} onOpenChange={setIsActaModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Award className="size-5" />
                            Acta de Terminación de Obra
                        </DialogTitle>
                        <DialogDescription>
                            Registro oficial de recepción definitiva emitido bajo la norma ISO 9001 (BANPE-DFO-04-a).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2 text-xs border border-border/70 rounded-xl p-4 bg-muted/10">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-foreground">BANPE INGENIERÍA Y CONSTRUCCIÓN</h3>
                                <p className="text-muted-foreground text-[11px]">Sistema de Gestión de la Calidad (ISO 9001:2015)</p>
                            </div>
                            <div className="text-right">
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    {selectedProject?.termination_act_number || `ACT-${selectedProject?.id}`}
                                </span>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fecha: {selectedProject?.actual_end_date || new Date().toISOString().split('T')[0]}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1">
                            <div>
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Obra / Proyecto:</span>
                                <span className="font-bold text-foreground">{selectedProject?.name}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cliente Contratante:</span>
                                <span className="font-bold text-foreground">{selectedProject?.client_name}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ubicación:</span>
                                <span className="font-medium text-foreground">{selectedProject?.location}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Monto Liquidado:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    ${selectedProject?.executed_usd?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-border/60 pt-3">
                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Dictamen de Cierre:</span>
                            <p className="mt-1 text-foreground/90 italic bg-card p-2.5 rounded border border-border/50">
                                "{selectedProject?.external_valuation_notes || selectedProject?.internal_valuation_notes || 'Se certifica la culminación al 100% de las fases y partidas de acuerdo a las especificaciones técnicas contractuales.'}"
                            </p>
                        </div>

                        <div className="border-t border-border/60 pt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div className="border-t border-dashed border-border/80 pt-2">
                                <p className="font-bold text-foreground">{selectedProject?.resident_engineer?.name || 'Ing. Residente'}</p>
                                <p className="text-muted-foreground">Residente BANPE</p>
                            </div>
                            <div className="border-t border-dashed border-border/80 pt-2">
                                <p className="font-bold text-foreground">{selectedProject?.inspector_name || 'Inspector Cliente'}</p>
                                <p className="text-muted-foreground">Inspección Fiscal</p>
                            </div>
                            <div className="border-t border-dashed border-border/80 pt-2">
                                <p className="font-bold text-foreground">Gerencia General</p>
                                <p className="text-muted-foreground">Aprobación Final</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 flex justify-between items-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="gap-1.5"
                        >
                            <Printer className="size-4" />
                            Imprimir Acta
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setIsActaModalOpen(false)}
                        >
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

ValuationsIndex.layout = {
    breadcrumbs,
};
