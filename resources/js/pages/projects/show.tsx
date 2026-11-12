import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Boxes,
    Briefcase,
    Building2,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    Edit2,
    FileSpreadsheet,
    FileText,
    HardHat,
    Layers,
    MapPin,
    MessageSquare,
    PauseCircle,
    Percent,
    Play,
    Plus,
    Search,
    Shield,
    Trash2,
    TrendingUp,
    Truck,
    Users,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useConfirm } from '@/contexts/confirm-context';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { TableSkeleton, TableBodySkeleton } from '@/components/skeletons';
import { SearchableMaterialSelect } from '@/components/searchable-material-select';
import { getMaterialUnitInfo, sanitizeQuantity, handleQuantityKeyDown } from '@/lib/material-units';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

type MaterialUnit = {
    id: number;
    name: string;
    symbol: string;
};

type MaterialCategory = {
    id: number;
    name: string;
    slug: string;
};

type AvailableMaterial = {
    id: number;
    code: string;
    name: string;
    category_id: number;
    unit_id: number;
    estimated_price_usd: number | string;
    unit?: MaterialUnit;
    category?: MaterialCategory;
};

type ProjectPhase = {
    id: number;
    project_id: number;
    name: string;
    start_date?: string;
    end_date?: string;
    status: 'pendiente' | 'en_progreso' | 'completada' | 'retrasada';
    progress_percentage: number | string;
    description?: string;
};

type ProjectMaterial = {
    id: number;
    project_id: number;
    material_id: number;
    project_phase_id?: number;
    estimated_quantity: number | string;
    dispatched_quantity: number | string;
    unit_price_usd: number | string;
    total_price_usd: number | string;
    material?: AvailableMaterial;
    phase?: ProjectPhase;
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
    pause_reason?: string | null;
    description?: string;
    resident_engineer?: UserOption;
    manager?: UserOption;
    phases: ProjectPhase[];
    project_materials: ProjectMaterial[];
};

type FinancialSummary = {
    budget_contract_usd: number;
    total_materials_budget_usd: number;
    total_dispatched_usd: number;
    remaining_material_budget_usd: number;
    execution_rate_percentage: number;
    materials_count: number;
    fully_dispatched_count: number;
};

type Props = {
    project: Project;
    availableMaterials: AvailableMaterial[];
    users: UserOption[];
    financialSummary: FinancialSummary;
};

export default function ProjectShow({
    project,
    availableMaterials = [],
    users = [],
    financialSummary = {
        budget_contract_usd: 0,
        total_materials_budget_usd: 0,
        total_dispatched_usd: 0,
        remaining_material_budget_usd: 0,
        execution_rate_percentage: 0,
        materials_count: 0,
        fully_dispatched_count: 0,
    },
}: Props) {
    const { currency, rate, formatMoney, currencySymbol } = useCurrency();
    const { confirm: confirmModal } = useConfirm();
    const { isLoading } = usePageLoading();
    const phases = project?.phases || [];
    const projectMaterials = project?.project_materials || [];
    const [activeTab, setActiveTab] = useState<'materials' | 'phases' | 'overview'>('materials');
    const [materialSearch, setMaterialSearch] = useState('');

    // Modales de control
    const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
    const [editingProjectMaterial, setEditingProjectMaterial] = useState<ProjectMaterial | null>(null);

    const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
    const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);

    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    // Formulario de Importación Maprex
    const importForm = useForm<{
        file: File | null;
        default_phase_id: string;
        currency: 'USD' | 'VES';
        exchange_rate: string;
    }>({
        file: null,
        default_phase_id: '',
        currency: 'USD',
        exchange_rate: String(rate || '899.27'),
    });

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(`/projects/${project.id}/import-maprex`, {
            forceFormData: true,
            onSuccess: () => {
                setIsImportDialogOpen(false);
                importForm.reset();
            },
        });
    };

    // Filtrar usuarios según roles
    const availableResidents = useMemo(() => {
        const filtered = users.filter((u) => u.role?.slug === 'ingeniero_residente');
        return filtered.length > 0 ? filtered : users;
    }, [users]);

    const availableManagers = useMemo(() => {
        const filtered = users.filter((u) => u.role?.slug === 'gerente_proyecto');
        return filtered.length > 0 ? filtered : users;
    }, [users]);

    // Modal y formulario de paralización de obra
    const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
    const pauseForm = useForm({
        pause_reason: '',
    });

    const handleStartExecution = () => {
        router.patch(`/projects/${project.id}/status`, { status: 'en_ejecucion' });
    };

    const handleResumeExecution = () => {
        router.patch(`/projects/${project.id}/status`, { status: 'en_ejecucion' });
    };

    const handlePauseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.patch(`/projects/${project.id}/status`, {
            status: 'paralizada',
            pause_reason: pauseForm.data.pause_reason,
        }, {
            onSuccess: () => {
                setIsPauseDialogOpen(false);
                pauseForm.reset();
            },
        });
    };

    const handleQuickCompletePhase = (phaseId: number) => {
        router.post(`/projects/${project.id}/phases/${phaseId}/complete`, {}, {
            preserveScroll: true,
        });
    };

    // Formulario de Insumo Presupuestado (Maprex)
    const materialForm = useForm({
        material_id: '',
        project_phase_id: '',
        estimated_quantity: '',
        unit_price_usd: '',
    });

    // Formulario de Fase de Cronograma
    const phaseForm = useForm({
        name: '',
        start_date: '',
        end_date: '',
        status: 'en_progreso',
        progress_percentage: '0.00',
        description: '',
    });

    // Formulario de Edición de Obra
    const editProjectForm = useForm({
        code: project.code,
        name: project.name,
        client_name: project.client_name || '',
        location: project.location,
        resident_engineer_id: project.resident_engineer_id ? String(project.resident_engineer_id) : '',
        manager_id: project.manager_id ? String(project.manager_id) : '',
        start_date: project.start_date || '',
        estimated_end_date: project.estimated_end_date || '',
        actual_end_date: project.actual_end_date || '',
        budget_usd: String(project.budget_usd || 0),
        progress_percentage: String(project.progress_percentage || 0),
        status: project.status,
        description: project.description || '',
    });

    // Formulario de Cierre de Obra
    const closeForm = useForm({});

    // Abrir modal de asignación de material
    const openAddMaterialDialog = () => {
        setEditingProjectMaterial(null);
        materialForm.reset();
        materialForm.setData({
            material_id: '',
            project_phase_id: '',
            estimated_quantity: '',
            unit_price_usd: '',
        });
        setIsMaterialDialogOpen(true);
    };

    // Al seleccionar un material del catálogo, autocompletar su precio estimado
    const handleMaterialChange = (matId: string) => {
        materialForm.setData('material_id', matId);
        const selected = availableMaterials.find((m) => String(m.id) === matId);
        if (selected) {
            materialForm.setData('unit_price_usd', String(selected.estimated_price_usd || '0.00'));
        }
    };

    const handleMaterialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProjectMaterial) {
            materialForm.put(`/projects/${project.id}/materials/${editingProjectMaterial.id}`, {
                onSuccess: () => setIsMaterialDialogOpen(false),
            });
        } else {
            materialForm.post(`/projects/${project.id}/materials`, {
                onSuccess: () => setIsMaterialDialogOpen(false),
            });
        }
    };

    const handleRemoveMaterial = async (pmId: number, matName?: string) => {
        const ok = await confirmModal({
            title: '¿Eliminar insumo del presupuesto?',
            description: `¿Estás seguro de que deseas eliminar "${matName || 'este insumo'}" del presupuesto de la obra?`,
            confirmText: 'Sí, eliminar insumo',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/projects/${project.id}/materials/${pmId}`, { preserveScroll: true });
        }
    };

    // Fases de cronograma
    const openAddPhaseDialog = () => {
        setEditingPhase(null);
        phaseForm.reset();
        phaseForm.setData({
            name: `Fase ${project.phases.length + 1}: `,
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            status: 'en_progreso',
            progress_percentage: '0.00',
            description: '',
        });
        setIsPhaseDialogOpen(true);
    };

    const openEditPhaseDialog = (phase: ProjectPhase) => {
        setEditingPhase(phase);
        phaseForm.setData({
            name: phase.name,
            start_date: phase.start_date || '',
            end_date: phase.end_date || '',
            status: phase.status,
            progress_percentage: String(phase.progress_percentage || 0),
            description: phase.description || '',
        });
        setIsPhaseDialogOpen(true);
    };

    const handlePhaseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPhase) {
            phaseForm.put(`/projects/${project.id}/phases/${editingPhase.id}`, {
                onSuccess: () => setIsPhaseDialogOpen(false),
            });
        } else {
            phaseForm.post(`/projects/${project.id}/phases`, {
                onSuccess: () => setIsPhaseDialogOpen(false),
            });
        }
    };

    const handleDeletePhase = async (phaseId: number, phaseName: string) => {
        const ok = await confirmModal({
            title: '¿Eliminar fase del cronograma?',
            description: `¿Estás seguro de eliminar la fase "${phaseName}"? Los materiales asociados quedarán sin fase asignada en el proyecto.`,
            confirmText: 'Sí, eliminar fase',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/projects/${project.id}/phases/${phaseId}`, { preserveScroll: true });
        }
    };

    // Actualizar Obra
    const handleEditProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editProjectForm.put(`/projects/${project.id}`, {
            onSuccess: () => setIsEditProjectDialogOpen(false),
        });
    };

    // Cierre formal de obra
    const handleCloseProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        closeForm.post(`/projects/${project.id}/close`, {
            onSuccess: () => setIsCloseDialogOpen(false),
        });
    };

    // Exportar cómputos a CSV
    const exportMaterialsToCsv = () => {
        const headers = ['Código Maprex', 'Descripción Insumo', 'Categoría', 'Unidad', 'Fase', 'Cant. Presupuestada', 'Cant. Despachada', 'P.U. USD', 'Total USD'];
        const rows = project.project_materials.map((pm) => [
            pm.material?.code || '',
            `"${pm.material?.name || ''}"`,
            `"${pm.material?.category?.name || ''}"`,
            pm.material?.unit?.symbol || '',
            `"${pm.phase?.name || 'General'}"`,
            pm.estimated_quantity,
            pm.dispatched_quantity,
            pm.unit_price_usd,
            pm.total_price_usd,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Computos_Maprex_${project.code}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtro reactivo de materiales
    const filteredMaterials = project.project_materials.filter((pm) => {
        if (!materialSearch) return true;
        const q = materialSearch.toLowerCase();
        return (
            pm.material?.name.toLowerCase().includes(q) ||
            pm.material?.code.toLowerCase().includes(q) ||
            pm.phase?.name.toLowerCase().includes(q)
        );
    });

    const materialsPagination = useTablePagination({
        items: filteredMaterials,
        initialPerPage: 10,
    });

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

    const getPhaseStatusBadge = (status: ProjectPhase['status']) => {
        switch (status) {
            case 'completada':
                return (
                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold text-[11px]">
                        Completada
                    </Badge>
                );
            case 'en_progreso':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-[11px]">
                        En Progreso
                    </Badge>
                );
            case 'retrasada':
                return (
                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold text-[11px]">
                        Retrasada
                    </Badge>
                );
            case 'pendiente':
            default:
                return (
                    <Badge className="bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 font-semibold text-[11px]">
                        Pendiente
                    </Badge>
                );
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title={`${project.code} - ${project.name}`} />

            {/* Navegación y Cabecera de la Obra */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground -ml-2"
                    >
                        <Link href="/projects">
                            <ArrowLeft className="size-4 mr-1.5" />
                            Volver a Obras y Proyectos
                        </Link>
                    </Button>

                    <div className="flex items-center gap-2 flex-wrap">
                        {project.status === 'licitacion' && (
                            <Button
                                size="sm"
                                onClick={handleStartExecution}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                                <Play className="size-3.5 mr-1" />
                                Iniciar Ejecución
                            </Button>
                        )}

                        {project.status === 'en_ejecucion' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        pauseForm.setData('pause_reason', '');
                                        setIsPauseDialogOpen(true);
                                    }}
                                    className="text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                >
                                    <PauseCircle className="size-3.5 mr-1" />
                                    Paralizar Obra
                                </Button>
                                <Link href="/valuations">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs font-semibold border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
                                    >
                                        <FileSpreadsheet className="size-3.5 mr-1" />
                                        Valuación y Cierre
                                    </Button>
                                </Link>
                            </>
                        )}

                        {project.status === 'paralizada' && (
                            <Button
                                size="sm"
                                onClick={handleResumeExecution}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                                <Play className="size-3.5 mr-1" />
                                Reanudar Obra
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditProjectDialogOpen(true)}
                            className="text-xs font-semibold"
                        >
                            <Edit2 className="size-3.5 mr-1.5" />
                            Editar Obra
                        </Button>

                        {project.status !== 'culminada' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCloseDialogOpen(true)}
                                className="text-xs font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                            >
                                <CheckCircle2 className="size-3.5 mr-1.5" />
                                Cerrar Obra & Liberar Insumos
                            </Button>
                        )}
                    </div>
                </div>

                {project.status === 'paralizada' && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                        <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="flex-1">
                            <p className="font-bold">Obra Actualmente en Estado Paralizada</p>
                            <p className="text-[11px] opacity-90 mt-0.5">
                                Motivo: {project.pause_reason || 'Paralización operativa preventiva registrada en el sistema.'}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleResumeExecution}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 shrink-0"
                        >
                            <Play className="size-3 mr-1" />
                            Reanudar Ahora
                        </Button>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border/70 shadow-xs">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/60 text-foreground">
                                {project.code}
                            </Badge>
                            {getStatusBadge(project.status)}
                            {project.client_name && (
                                <Badge variant="secondary" className="text-xs font-medium flex items-center gap-1">
                                    <Briefcase className="size-3 text-amber-500" />
                                    {project.client_name}
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                            {project.name}
                        </h1>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 text-amber-500" />
                            <span>{project.location}</span>
                            <span>•</span>
                            <span>Inicio: {project.start_date || 'No definida'}</span>
                            <span>•</span>
                            <span>Entrega estimada: {project.estimated_end_date || 'No definida'}</span>
                        </div>
                    </div>

                    {/* Ficha Resumen del Residente */}
                    <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/50 shrink-0">
                        <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <HardHat className="size-5" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                Ingeniero Residente
                            </div>
                            <div className="text-xs font-bold text-foreground">
                                {project.resident_engineer?.name || 'Sin asignar'}
                            </div>
                            {project.resident_engineer?.phone && (
                                <a
                                    href={`https://wa.me/${project.resident_engineer.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(project.resident_engineer.name)},%20te%20contacto%20sobre%20la%20obra%20${encodeURIComponent(project.name)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                                >
                                    <MessageSquare className="size-3" />
                                    {project.resident_engineer.phone}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cinta de Métricas Financieras y Avance */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="pb-1 pt-3.5 px-4 space-y-0">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Contrato ({currency})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5">
                        <div className="text-xl font-black text-foreground">
                            {formatMoney(financialSummary.budget_contract_usd, { showCode: false })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Monto total presupuestado</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="pb-1 pt-3.5 px-4 space-y-0">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Cómputo Insumos ({currencySymbol})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5">
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                            {formatMoney(financialSummary.total_materials_budget_usd, { showCode: false })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{financialSummary.materials_count} partidas Maprex</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="pb-1 pt-3.5 px-4 space-y-0">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Despachado a Obra
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5">
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatMoney(financialSummary.total_dispatched_usd, { showCode: false })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Recibido en sitio de obra</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="pb-1 pt-3.5 px-4 space-y-0">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Saldo Insumos ({currencySymbol})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5">
                        <div className="text-xl font-black text-foreground">
                            {formatMoney(financialSummary.remaining_material_budget_usd, { showCode: false })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Por despachar a obra</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card col-span-2 sm:col-span-1">
                    <CardHeader className="pb-1 pt-3.5 px-4 space-y-0">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Avance Físico (%)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3.5">
                        <div className="text-xl font-black text-foreground">
                            {Number(project.progress_percentage || 0).toFixed(1)}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                                className="bg-amber-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, Number(project.progress_percentage || 0)))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pestañas de Navegación del Proyecto */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'materials'
                            ? 'bg-amber-500 text-zinc-950 shadow-xs'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                >
                    <Layers className="size-4" />
                    Cómputos Métricos & Presupuesto (Maprex)
                    <Badge variant="outline" className={`ml-1 text-[10px] px-1.5 py-0 border-current font-mono`}>
                        {project.project_materials.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('phases')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'phases'
                            ? 'bg-amber-500 text-zinc-950 shadow-xs'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                >
                    <CalendarClock className="size-4" />
                    Cronograma de Fases (MS Project)
                    <Badge variant="outline" className={`ml-1 text-[10px] px-1.5 py-0 border-current font-mono`}>
                        {project.phases.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview'
                            ? 'bg-amber-500 text-zinc-950 shadow-xs'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                >
                    <FileText className="size-4" />
                    Memoria & Cierre de Obra
                </button>
            </div>

            {/* CONTENIDO PESTAÑA 1: CÓMPUTOS MAPREX */}
            {activeTab === 'materials' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60">
                        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={materialSearch}
                                    onChange={(e) => setMaterialSearch(e.target.value)}
                                    placeholder="Filtrar por código, material o fase..."
                                    className="pl-9 bg-background h-9 text-xs"
                                />
                            </div>
                            <CurrencyToggle size="sm" />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsImportDialogOpen(true)}
                                className="text-xs font-bold h-9 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                                <FileSpreadsheet className="size-3.5 mr-1.5" />
                                Importar Maprex (Excel/CSV)
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportMaterialsToCsv}
                                className="text-xs font-semibold h-9"
                            >
                                <Download className="size-3.5 mr-1.5" />
                                Exportar Excel/CSV
                            </Button>
                            <Button
                                onClick={openAddMaterialDialog}
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold h-9 text-xs"
                            >
                                <Plus className="size-3.5 mr-1.5" />
                                Asignar Insumo al Presupuesto
                            </Button>
                        </div>
                    </div>

                    {/* Tabla de Partidas con Efecto Skeleton MUI */}
                    {isLoading ? (
                        <TableSkeleton columns={9} rows={materialsPagination.perPage} />
                    ) : (
                        <Card className="border border-border/70 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold w-[120px]">Cód. Maprex</TableHead>
                                            <TableHead className="text-xs font-bold">Insumo / Descripción</TableHead>
                                            <TableHead className="text-xs font-bold">Fase Asociada</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Cant. Presupuestada</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Despachado a Obra</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Estado Despacho</TableHead>
                                            <TableHead className="text-xs font-bold text-right">P.U. ({currencySymbol})</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Total Presup. ({currencySymbol})</TableHead>
                                            <TableHead className="text-xs font-bold text-right w-[80px]">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materialsPagination.isChangingPage ? (
                                            <TableBodySkeleton columns={9} rows={materialsPagination.perPage} />
                                        ) : materialsPagination.totalItems === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No hay materiales presupuestados que coincidan con la búsqueda.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            materialsPagination.paginatedItems.map((pm) => {
                                                const est = Number(pm.estimated_quantity || 0);
                                                const disp = Number(pm.dispatched_quantity || 0);
                                                const percent = est > 0 ? (disp / est) * 100 : 0;
                                                const unit = pm.material?.unit?.symbol || 'und';

                                                return (
                                                    <TableRow key={pm.id} className="hover:bg-muted/30">
                                                        <TableCell className="font-mono text-xs font-bold text-foreground">
                                                            {pm.material?.code || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-bold text-foreground text-xs">
                                                                {pm.material?.name}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {pm.material?.category?.name || 'General'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium text-foreground">
                                                            {pm.phase?.name ? (
                                                                <Badge variant="outline" className="text-[10px] bg-muted/40">
                                                                    {pm.phase.name}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-[11px]">General Obra</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-right font-bold text-foreground">
                                                            {est.toLocaleString('en-US')} {unit}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-right">
                                                            <span className="font-extrabold text-foreground">
                                                                {disp.toLocaleString('en-US')} {unit}
                                                            </span>
                                                            <div className="w-20 ml-auto bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${disp >= est ? 'bg-emerald-500' : 'bg-amber-500'
                                                                        }`}
                                                                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {disp >= est && est > 0 ? (
                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                                    Completado ({percent.toFixed(0)}%)
                                                                </Badge>
                                                            ) : disp > 0 ? (
                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                                                    Parcial ({percent.toFixed(0)}%)
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                                                    Sin Despachos
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-right font-medium text-foreground">
                                                            {formatMoney(pm.unit_price_usd, { showCode: false })}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-right font-black text-foreground">
                                                            {formatMoney(pm.total_price_usd, { showCode: false })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveMaterial(pm.id, pm.material?.name)}
                                                                className="size-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                                title="Eliminar partida"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="p-4 border-t border-border/60">
                                <DataTablePagination
                                    currentPage={materialsPagination.currentPage}
                                    totalPages={materialsPagination.totalPages}
                                    totalItems={materialsPagination.totalItems}
                                    fromIndex={materialsPagination.fromIndex}
                                    toIndex={materialsPagination.toIndex}
                                    perPage={materialsPagination.perPage}
                                    onPageChange={materialsPagination.goToPage}
                                    onPerPageChange={materialsPagination.setPerPage}
                                    itemLabel="partidas Maprex"
                                />
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* CONTENIDO PESTAÑA 2: CRONOGRAMA DE FASES (MS PROJECT REPLACEMENT) */}
            {activeTab === 'phases' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">
                                Desglose de Fases y Cronograma de Trabajo
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Planifica hitos y vincula insumos para disparar alertas preventivas de despacho a obra.
                            </p>
                        </div>
                        <Button
                            onClick={openAddPhaseDialog}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold h-9 text-xs shrink-0"
                        >
                            <Plus className="size-3.5 mr-1.5" />
                            Nueva Fase de Obra
                        </Button>
                    </div>

                    {/* Banner de todas las fases concluidas */}
                    {project.phases.length > 0 && project.phases.every(p => p.status === 'completada' || Number(p.progress_percentage) >= 100) && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-5" />
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">
                                        ¡Todas las fases del cronograma han culminado al 100%!
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Se completó la ejecución física. Procede a la Valuación y Finiquito conforme al procedimiento BANPE-DFO-04-a.
                                    </p>
                                </div>
                            </div>
                            <Link href="/valuations">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0">
                                    Proceder a Valuaciones de Cierre
                                    <ArrowRight className="size-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>
                    )}

                    <div className="space-y-3">
                        {project.phases.length === 0 ? (
                            <Card className="py-8 text-center border-dashed">
                                <CardContent className="space-y-2">
                                    <CalendarClock className="size-8 mx-auto text-muted-foreground" />
                                    <div className="text-sm font-bold text-foreground">
                                        No se han registrado fases de cronograma
                                    </div>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Divide la obra en fases constructivas (ej: Movimiento de Tierra, Estructura, Acabados) para un mejor control del avance físico.
                                    </p>
                                    <Button onClick={openAddPhaseDialog} size="sm" className="bg-amber-500 text-zinc-950 font-bold mt-2">
                                        <Plus className="size-3.5 mr-1.5" />
                                        Crear Primera Fase
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            project.phases.map((phase, idx) => {
                                const progress = Number(phase.progress_percentage || 0);
                                const phaseMaterials = project.project_materials.filter((pm) => pm.project_phase_id === phase.id);

                                return (
                                    <Card
                                        key={phase.id}
                                        className="border border-border/70 hover:border-amber-500/40 transition-colors shadow-xs bg-card"
                                    >
                                        <CardContent className="p-4 sm:p-5">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/20">
                                                            {idx + 1}
                                                        </span>
                                                        <h4 className="text-base font-black text-foreground">
                                                            {phase.name}
                                                        </h4>
                                                        {getPhaseStatusBadge(phase.status)}
                                                    </div>

                                                    {phase.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {phase.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Calendar className="size-3 text-zinc-400" />
                                                            {phase.start_date || 'Sin inicio'} al {phase.end_date || 'Sin fin'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Layers className="size-3 text-amber-500" />
                                                            {phaseMaterials.length} partidas presupuestadas
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Avance de Fase y Acciones */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                                                    <div className="w-full sm:w-40 space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-semibold text-muted-foreground">Avance:</span>
                                                            <span className="font-extrabold text-foreground">{progress.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-2 rounded-full ${progress >= 100 ? 'bg-blue-500' : 'bg-amber-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {phase.status !== 'completada' && progress < 100 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleQuickCompletePhase(phase.id)}
                                                                className="h-8 px-2.5 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                                                title="Marcar esta fase como culminada al 100%"
                                                            >
                                                                <CheckCircle2 className="size-3.5 mr-1" />
                                                                Culminar (100%)
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditPhaseDialog(phase)}
                                                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Edit2 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeletePhase(phase.id, phase.name)}
                                                            className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* CONTENIDO PESTAÑA 3: FICHA TÉCNICA & ACTA DE CIERRE */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Tarjeta de Especificaciones Técnicas */}
                    <Card className="border border-border/70 shadow-xs bg-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                                <FileText className="size-4 text-amber-500" />
                                Ficha Técnica de la Obra
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <span className="font-bold text-muted-foreground uppercase text-[10px]">
                                    Memoria Descriptiva & Alcance
                                </span>
                                <p className="text-foreground leading-relaxed">
                                    {project.description || 'Sin memoria descriptiva registrada para esta obra.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                                <div>
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Gerente de Proyecto</span>
                                    <div className="font-bold text-foreground text-xs">{project.manager?.name || 'No asignado'}</div>
                                    <div className="text-[11px] text-muted-foreground">{project.manager?.email}</div>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Ingeniero Residente</span>
                                    <div className="font-bold text-foreground text-xs">{project.resident_engineer?.name || 'No asignado'}</div>
                                    <div className="text-[11px] text-muted-foreground">{project.resident_engineer?.phone || 'Sin teléfono'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                                <div>
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Fecha Culminación Real</span>
                                    <div className="font-bold text-foreground text-xs">
                                        {project.actual_end_date ? project.actual_end_date : 'En ejecución activa'}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Partidas Maprex Activas</span>
                                    <div className="font-bold text-foreground text-xs">
                                        {project.project_materials.length} partidas asignadas
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta de Cierre de Obra y Devolución de Insumos */}
                    <Card className="border border-border/70 shadow-xs bg-card flex flex-col justify-between">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                                <Boxes className="size-4 text-emerald-500" />
                                Cierre de Obra y Liberación de Sobrantes
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Regla de negocio BANPE: Los materiales asignados a esta obra en almacén principal que no fueron despachados o consumidos se devuelven automáticamente al inventario central (Stock Libre).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-muted-foreground">Total Insumos Contratados:</span>
                                    <span className="font-bold text-foreground">{formatMoney(financialSummary.total_materials_budget_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-muted-foreground">Inversión Despachada:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(financialSummary.total_dispatched_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40">
                                    <span className="font-bold text-foreground">Remanente no despachado:</span>
                                    <span className="font-black text-amber-500">{formatMoney(financialSummary.remaining_material_budget_usd)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 pb-4">
                            {project.status === 'culminada' ? (
                                <div className="w-full text-center p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
                                    Esta obra ya fue culminada formalmente el {project.actual_end_date || 'recientemente'}.
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setIsCloseDialogOpen(true)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                >
                                    <CheckCircle2 className="size-4 mr-1.5" />
                                    Generar Acta de Cierre & Liberar Sobrantes
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* MODAL: ASIGNAR INSUMO AL PRESUPUESTO MAPREX */}
            <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Layers className="size-5 text-amber-500" />
                            {editingProjectMaterial ? 'Modificar Partida de Material' : 'Asignar Insumo al Presupuesto de Obra'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecciona el material del catálogo maestro, define la fase constructiva y la cantidad estimada.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleMaterialSubmit} className="space-y-4 pt-2">
                        {/* Selector de Material del Catálogo */}
                        {!editingProjectMaterial && (
                            <div className="space-y-1.5">
                                <Label htmlFor="material_id" className="text-xs font-semibold">
                                    Insumo del Catálogo Maestro (Maprex) *
                                </Label>
                                <SearchableMaterialSelect
                                    materials={availableMaterials}
                                    value={materialForm.data.material_id}
                                    onChange={handleMaterialChange}
                                    placeholder="Buscar insumo por código o nombre..."
                                    required
                                />
                                <InputError message={materialForm.errors.material_id} />
                            </div>
                        )}

                        {/* Fase de Obra Vinculada */}
                        <div className="space-y-1.5">
                            <Label htmlFor="project_phase_id" className="text-xs font-semibold">
                                Fase Constructiva Vinculada (Opcional)
                            </Label>
                            <select
                                id="project_phase_id"
                                value={materialForm.data.project_phase_id}
                                onChange={(e) => materialForm.setData('project_phase_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Sin fase asignada (Partida General)</option>
                                {project.phases.map((ph) => (
                                    <option key={ph.id} value={ph.id}>
                                        {ph.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={materialForm.errors.project_phase_id} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Cantidad Estimada con Unidad de Medida Constructiva */}
                            {(() => {
                                const selMat = availableMaterials.find((m) => String(m.id) === materialForm.data.material_id);
                                const unitInfo = getMaterialUnitInfo(selMat?.unit, selMat?.name);
                                return (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="estimated_quantity" className="text-xs font-semibold flex items-center justify-between">
                                            <span className="truncate" title={unitInfo.fieldLabel}>
                                                {selMat ? `Cantidad (${unitInfo.shortSymbol}) *` : 'Cantidad Cómputo *'}
                                            </span>
                                            {selMat && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {unitInfo.helpText}
                                                </span>
                                            )}
                                        </Label>
                                        <div className="relative flex items-center">
                                            <Input
                                                id="estimated_quantity"
                                                type="text"
                                                inputMode={unitInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                value={materialForm.data.estimated_quantity}
                                                onChange={(e) => materialForm.setData('estimated_quantity', sanitizeQuantity(e.target.value, unitInfo.isIntegerOnly))}
                                                onKeyDown={(e) => handleQuantityKeyDown(e, unitInfo.isIntegerOnly)}
                                                className="pr-16 font-semibold"
                                                placeholder={unitInfo.placeholder}
                                                required
                                            />
                                            <span className="absolute right-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none tracking-wider" title={unitInfo.humanName}>
                                                {unitInfo.shortSymbol}
                                            </span>
                                        </div>
                                        <InputError message={materialForm.errors.estimated_quantity} />
                                    </div>
                                );
                            })()}

                            {/* P.U. Estimado en USD */}
                            <div className="space-y-1.5">
                                <Label htmlFor="unit_price_usd" className="text-xs font-semibold">
                                    P.U. Estimado ($ USD) *
                                </Label>
                                <Input
                                    id="unit_price_usd"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={materialForm.data.unit_price_usd}
                                    onChange={(e) => materialForm.setData('unit_price_usd', e.target.value)}
                                    required
                                />
                                <InputError message={materialForm.errors.unit_price_usd} />
                            </div>
                        </div>

                        {/* Total estimado calculado */}
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex justify-between items-center text-xs">
                            <span className="font-semibold text-muted-foreground">Total Partida Calculado:</span>
                            <span className="font-black text-foreground">
                                {formatMoney(
                                    Number(materialForm.data.estimated_quantity || 0) *
                                    Number(materialForm.data.unit_price_usd || 0)
                                )}
                            </span>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMaterialDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={materialForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {materialForm.processing && <Spinner className="mr-2" />}
                                Guardar Partida
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: NUEVA / EDITAR FASE DE CRONOGRAMA */}
            <Dialog open={isPhaseDialogOpen} onOpenChange={setIsPhaseDialogOpen}>
                <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <CalendarClock className="size-5 text-amber-500" />
                            {editingPhase ? 'Editar Fase de Obra' : 'Nueva Fase en Cronograma'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define el nombre del hito, fechas de ejecución y porcentaje de avance físico.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePhaseSubmit} className="space-y-3.5 pt-2">
                        {/* Nombre de la Fase */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phase_name" className="text-xs font-semibold">
                                Nombre de la Fase Constructiva *
                            </Label>
                            <Input
                                id="phase_name"
                                value={phaseForm.data.name}
                                onChange={(e) => phaseForm.setData('name', e.target.value)}
                                placeholder="Ej: Fase 3: Cerramiento y Mampostería"
                                required
                            />
                            <InputError message={phaseForm.errors.name} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Fecha Inicio */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phase_start_date" className="text-xs font-semibold">
                                    Fecha Inicio
                                </Label>
                                <Input
                                    id="phase_start_date"
                                    type="date"
                                    value={phaseForm.data.start_date}
                                    onChange={(e) => phaseForm.setData('start_date', e.target.value)}
                                />
                                <InputError message={phaseForm.errors.start_date} />
                            </div>

                            {/* Fecha Fin */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phase_end_date" className="text-xs font-semibold">
                                    Fecha Fin Estimada
                                </Label>
                                <Input
                                    id="phase_end_date"
                                    type="date"
                                    value={phaseForm.data.end_date}
                                    onChange={(e) => phaseForm.setData('end_date', e.target.value)}
                                />
                                <InputError message={phaseForm.errors.end_date} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Estado de la Fase */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phase_status" className="text-xs font-semibold">
                                    Estado de la Fase *
                                </Label>
                                <select
                                    id="phase_status"
                                    value={phaseForm.data.status}
                                    onChange={(e) => phaseForm.setData('status', e.target.value as ProjectPhase['status'])}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en_progreso">En Progreso</option>
                                    <option value="completada">Completada</option>
                                    <option value="retrasada">Retrasada</option>
                                </select>
                                <InputError message={phaseForm.errors.status} />
                            </div>

                            {/* Avance % */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phase_progress" className="text-xs font-semibold">
                                    Avance de Fase (%) *
                                </Label>
                                <Input
                                    id="phase_progress"
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={phaseForm.data.progress_percentage}
                                    onChange={(e) => phaseForm.setData('progress_percentage', e.target.value)}
                                    required
                                />
                                <InputError message={phaseForm.errors.progress_percentage} />
                            </div>
                        </div>

                        {/* Descripción / Tareas */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phase_description" className="text-xs font-semibold">
                                Tareas / Especificaciones
                            </Label>
                            <textarea
                                id="phase_description"
                                rows={2}
                                value={phaseForm.data.description}
                                onChange={(e) => phaseForm.setData('description', e.target.value)}
                                placeholder="Actividades a realizar en esta fase..."
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                            <InputError message={phaseForm.errors.description} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPhaseDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={phaseForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {phaseForm.processing && <Spinner className="mr-2" />}
                                {editingPhase ? 'Guardar Cambios' : 'Crear Fase'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: CONFIRMACIÓN DE CIERRE DE OBRA */}
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-rose-600 dark:text-rose-400">
                            <AlertCircle className="size-5" />
                            ¿Confirmar Cierre Formal de la Obra?
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Esta acción finalizará la obra <strong>{project.name}</strong> y ejecutará los siguientes procesos automáticos:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            El estado cambiará a "Culminada" con avance 100%.
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            Todas las fases pendientes se marcarán como completadas.
                        </div>
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            Todos los materiales en almacén asignados a esta obra quedarán liberados para Stock Libre.
                        </div>
                    </div>

                    <form onSubmit={handleCloseProjectSubmit}>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCloseDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={closeForm.processing}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                            >
                                {closeForm.processing && <Spinner className="mr-2" />}
                                Sí, Cerrar Obra
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: EDITAR OBRA COMPLETA */}
            <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
                <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Building2 className="size-5 text-amber-500" />
                            Editar Ficha de la Obra
                        </DialogTitle>
                        <DialogDescription>
                            Modifica parámetros del contrato, cronograma o reasigna el personal técnico.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditProjectSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_code" className="text-xs font-semibold">Código Obra *</Label>
                                <Input
                                    id="edit_code"
                                    value={editProjectForm.data.code}
                                    onChange={(e) => editProjectForm.setData('code', e.target.value.toUpperCase())}
                                    required
                                />
                                <InputError message={editProjectForm.errors.code} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_status" className="text-xs font-semibold">Estado Operativo *</Label>
                                <select
                                    id="edit_status"
                                    value={editProjectForm.data.status}
                                    onChange={(e) => editProjectForm.setData('status', e.target.value as Project['status'])}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="licitacion">En Licitación</option>
                                    <option value="en_ejecucion">En Ejecución Activa</option>
                                    <option value="paralizada">Paralizada</option>
                                    <option value="culminada">Culminada</option>
                                </select>
                                <InputError message={editProjectForm.errors.status} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_name" className="text-xs font-semibold">Nombre de la Obra *</Label>
                            <Input
                                id="edit_name"
                                value={editProjectForm.data.name}
                                onChange={(e) => editProjectForm.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={editProjectForm.errors.name} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_client_name" className="text-xs font-semibold">Cliente</Label>
                                <Input
                                    id="edit_client_name"
                                    value={editProjectForm.data.client_name}
                                    onChange={(e) => editProjectForm.setData('client_name', e.target.value)}
                                />
                                <InputError message={editProjectForm.errors.client_name} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_location" className="text-xs font-semibold">Ubicación *</Label>
                                <Input
                                    id="edit_location"
                                    value={editProjectForm.data.location}
                                    onChange={(e) => editProjectForm.setData('location', e.target.value)}
                                    required
                                />
                                <InputError message={editProjectForm.errors.location} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_resident" className="text-xs font-semibold">Ingeniero Residente</Label>
                                <select
                                    id="edit_resident"
                                    value={editProjectForm.data.resident_engineer_id}
                                    onChange={(e) => editProjectForm.setData('resident_engineer_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Seleccionar Ingeniero Residente...</option>
                                    {availableResidents.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role?.name || u.email})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={editProjectForm.errors.resident_engineer_id} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_manager" className="text-xs font-semibold">Gerente Responsable</Label>
                                <select
                                    id="edit_manager"
                                    value={editProjectForm.data.manager_id}
                                    onChange={(e) => editProjectForm.setData('manager_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Seleccionar Gerente...</option>
                                    {availableManagers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role?.name || u.email})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={editProjectForm.errors.manager_id} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_budget" className="text-xs font-semibold">Monto Contrato ($) *</Label>
                                <Input
                                    id="edit_budget"
                                    type="number"
                                    step="0.01"
                                    value={editProjectForm.data.budget_usd}
                                    onChange={(e) => editProjectForm.setData('budget_usd', e.target.value)}
                                    required
                                />
                                <InputError message={editProjectForm.errors.budget_usd} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_start_date" className="text-xs font-semibold">Fecha Inicio</Label>
                                <Input
                                    id="edit_start_date"
                                    type="date"
                                    value={editProjectForm.data.start_date}
                                    onChange={(e) => editProjectForm.setData('start_date', e.target.value)}
                                />
                                <InputError message={editProjectForm.errors.start_date} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_end_date" className="text-xs font-semibold">Fecha Culminación</Label>
                                <Input
                                    id="edit_end_date"
                                    type="date"
                                    value={editProjectForm.data.estimated_end_date}
                                    onChange={(e) => editProjectForm.setData('estimated_end_date', e.target.value)}
                                />
                                <InputError message={editProjectForm.errors.estimated_end_date} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_progress" className="text-xs font-semibold">
                                Avance Físico Global de la Obra (%)
                            </Label>
                            <Input
                                id="edit_progress"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={editProjectForm.data.progress_percentage}
                                onChange={(e) => editProjectForm.setData('progress_percentage', e.target.value)}
                            />
                            <InputError message={editProjectForm.errors.progress_percentage} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit_description" className="text-xs font-semibold">Descripción</Label>
                            <textarea
                                id="edit_description"
                                rows={3}
                                value={editProjectForm.data.description}
                                onChange={(e) => editProjectForm.setData('description', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                            <InputError message={editProjectForm.errors.description} />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditProjectDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={editProjectForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {editProjectForm.processing && <Spinner className="mr-2" />}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: IMPORTAR CÓMPUTOS MAPREX */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <FileSpreadsheet className="size-5 text-amber-500" />
                            Importar Cómputos Métricos desde Maprex
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Carga el archivo exportado de Maprex en formato Excel (.xls / .xml) o CSV delimitado por comas.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Caja de ayuda con descarga directa de plantilla oficial */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-start gap-2 text-xs font-semibold text-foreground">
                            <FileSpreadsheet className="size-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>¿No tienes un archivo exportado de Maprex a mano? Descarga la plantilla oficial con partidas reales de ingeniería civil venezolana:</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <a
                                href="/templates/maprex-example?format=csv"
                                download="Presupuesto_Maprex_Ejemplo_BANPE.csv"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs shadow-xs transition-colors"
                            >
                                <Download className="size-3 text-amber-500" />
                                Descargar Plantilla (.CSV)
                            </a>
                            <a
                                href="/templates/maprex-example?format=xls"
                                download="Presupuesto_Maprex_Ejemplo_BANPE.xls"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs shadow-xs transition-colors"
                            >
                                <Download className="size-3 text-emerald-500" />
                                Descargar Plantilla (.XLS Excel)
                            </a>
                        </div>
                    </div>

                    <form onSubmit={handleImportSubmit} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="maprex_file" className="text-xs font-semibold">
                                Seleccionar Archivo Maprex (.csv, .xls, .xml, .txt) *
                            </Label>
                            <Input
                                id="maprex_file"
                                type="file"
                                accept=".csv,.txt,.xls,.xml,.xlsx"
                                onChange={(e) => importForm.setData('file', e.target.files?.[0] || null)}
                                className="text-xs"
                                required
                            />
                            <InputError message={importForm.errors.file} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="import_phase" className="text-xs font-semibold">
                                Fase por Defecto (si el archivo no tiene columna de Fase)
                            </Label>
                            <select
                                id="import_phase"
                                value={importForm.data.default_phase_id}
                                onChange={(e) => importForm.setData('default_phase_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Detectar fases automáticamente por columna</option>
                                {project.phases.map((ph) => (
                                    <option key={ph.id} value={ph.id}>
                                        {ph.name}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center border ${importForm.data.currency === 'USD'
                                            ? 'bg-amber-500 text-zinc-950 border-amber-600 shadow-xs'
                                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                        }`}
                                >
                                    $ Dólares (USD)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => importForm.setData('currency', 'VES')}
                                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all text-center border ${importForm.data.currency === 'VES'
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
                                        <Label htmlFor="exchange_rate_show" className="text-xs font-semibold text-muted-foreground shrink-0">
                                            Tasa de Cambio BCV / Referencial (Bs./$):
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="exchange_rate_show"
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
                                Procesar e Importar Cómputos
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Paralizar Obra */}
            <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <PauseCircle className="size-5" />
                            Paralizar Ejecución de Obra
                        </DialogTitle>
                        <DialogDescription>
                            Registra el motivo o justificación técnica por la cual se suspenden las actividades en la obra <span className="font-semibold text-foreground">{project.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePauseSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="pause_reason" className="text-xs font-semibold">Motivo de la Paralización *</Label>
                            <textarea
                                id="pause_reason"
                                rows={3}
                                value={pauseForm.data.pause_reason}
                                onChange={(e) => pauseForm.setData('pause_reason', e.target.value)}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Ej: Suspensión por condiciones climáticas adversas / Espera de dictamen o fondos del cliente..."
                                required
                            />
                            <InputError message={pauseForm.errors.pause_reason} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPauseDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={pauseForm.processing}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            >
                                {pauseForm.processing && <Spinner className="mr-2" />}
                                Confirmar Paralización
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

ProjectShow.layout = {
    breadcrumbs: [
        { title: 'Panel de Control', href: '/dashboard' },
        { title: 'Obras & Proyectos', href: '/projects' },
    ],
};

