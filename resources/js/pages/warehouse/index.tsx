import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRightLeft,
    Boxes,
    Building2,
    Calendar,
    CheckCircle2,
    DollarSign,
    Edit2,
    ExternalLink,
    FileSpreadsheet,
    Layers,
    MapPin,
    PackageCheck,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    TrendingDown,
    Truck,
    Users,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { SearchableMaterialSelect } from '@/components/searchable-material-select';
import { getMaterialUnitInfo, sanitizeQuantity, handleQuantityKeyDown } from '@/lib/material-units';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useConfirm } from '@/contexts/confirm-context';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { TableSkeleton, TableBodySkeleton } from '@/components/skeletons';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Warehouse = {
    id: number;
    code: string;
    name: string;
    location: string;
    is_central: boolean;
    is_active?: boolean;
    responsible_user_id?: number | null;
    project_id?: number | null;
    responsible_user?: {
        id: number;
        name: string;
        email: string;
    };
    project?: {
        id: number;
        code: string;
        name: string;
    };
};

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
};

type Material = {
    id: number;
    code: string;
    name: string;
    estimated_price_usd: number | string;
    unit?: MaterialUnit;
    category?: MaterialCategory;
};

type ProjectOption = {
    id: number;
    code: string;
    name: string;
};

type InventoryItem = {
    id: number;
    warehouse_id: number;
    material_id: number;
    project_id?: number | null;
    quantity: number | string;
    minimum_alert: number | string;
    material?: Material;
    project?: ProjectOption | null;
};

type StockTransfer = {
    id: number;
    code: string;
    quantity: number | string;
    reason?: string;
    created_at: string;
    material?: Material;
    from_project?: ProjectOption | null;
    to_project?: ProjectOption | null;
    authorized_by?: {
        id: number;
        name: string;
    };
};

type Stats = {
    total_items_count: number;
    free_stock_value_usd: number;
    assigned_stock_value_usd: number;
    total_stock_value_usd: number;
    low_stock_alerts: number;
};

type Props = {
    warehouses: Warehouse[];
    selectedWarehouseId: number;
    inventories: InventoryItem[];
    stats: Stats;
    projects: ProjectOption[];
    materials: Material[];
    users: UserOption[];
    recentTransfers: StockTransfer[];
    filters: {
        search: string;
        stock_type: string;
        project_id: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control', href: '/dashboard' },
    { title: 'Almacén Central & Obras', href: '/warehouse' },
];

export default function WarehouseIndex({
    warehouses,
    selectedWarehouseId,
    inventories,
    stats,
    projects,
    materials,
    users,
    recentTransfers,
    filters,
}: Props) {
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal, alert: alertModal } = useConfirm();
    const pagination = useTablePagination({
        items: inventories,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [selectedStockType, setSelectedStockType] = useState(filters.stock_type || 'todos');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'todos');

    // Modales
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

    const handleTransferDialogOpenChange = (open: boolean) => {
        setIsTransferDialogOpen(open);
        if (!open && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.has('action') || params.has('dialog') || params.has('traspaso')) {
                params.delete('action');
                params.delete('dialog');
                params.delete('traspaso');
                const newQuery = params.toString();
                const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    };

    // Deep-linking: abrir automáticamente el diálogo de traspaso si viene en la URL (?action=traspaso)
    useEffect(() => {
        const checkUrlAction = () => {
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                if (
                    params.get('action') === 'traspaso' ||
                    params.get('dialog') === 'traspaso' ||
                    params.get('traspaso') === '1'
                ) {
                    setIsTransferDialogOpen(true);
                }
            }
        };

        checkUrlAction();
        const removeNavigate = router.on('navigate', checkUrlAction);
        return () => {
            removeNavigate();
        };
    }, []);

    // Formulario de Almacén (Crear o Editar Principal / Obra)
    const warehouseForm = useForm({
        code: '',
        name: '',
        location: '',
        is_central: true,
        project_id: '',
        responsible_user_id: '',
        is_active: true,
    });

    const openCreateWarehouseDialog = () => {
        setEditingWarehouse(null);
        const count = warehouses.length + 1;
        warehouseForm.setData({
            code: `ALM-${String(count).padStart(3, '0')}`,
            name: '',
            location: '',
            is_central: true,
            project_id: '',
            responsible_user_id: '',
            is_active: true,
        });
        warehouseForm.clearErrors();
        setIsWarehouseDialogOpen(true);
    };

    const openEditWarehouseDialog = (wh: Warehouse) => {
        setEditingWarehouse(wh);
        warehouseForm.setData({
            code: wh.code,
            name: wh.name,
            location: wh.location,
            is_central: wh.is_central,
            project_id: wh.project?.id ? String(wh.project.id) : '',
            responsible_user_id: wh.responsible_user?.id ? String(wh.responsible_user.id) : (wh.responsible_user_id ? String(wh.responsible_user_id) : ''),
            is_active: wh.is_active ?? true,
        });
        warehouseForm.clearErrors();
        setIsWarehouseDialogOpen(true);
    };

    const handleWarehouseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingWarehouse) {
            warehouseForm.put(`/warehouse/warehouses/${editingWarehouse.id}`, {
                onSuccess: () => {
                    setIsWarehouseDialogOpen(false);
                },
            });
        } else {
            warehouseForm.post('/warehouse/warehouses', {
                onSuccess: () => {
                    setIsWarehouseDialogOpen(false);
                },
            });
        }
    };

    const handleDeleteWarehouse = async (wh: Warehouse) => {
        const ok = await confirmModal({
            title: `¿Eliminar almacén '${wh.name}'?`,
            description: `¿Está seguro de eliminar el almacén '${wh.name}'? Se eliminarán también sus inventarios y movimientos vinculados de forma irreversible.`,
            confirmText: 'Sí, eliminar almacén',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/warehouse/warehouses/${wh.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsWarehouseDialogOpen(false);
                },
                onError: (err: any) => {
                    alertModal({
                        title: 'No se pudo eliminar el almacén',
                        description: err?.general || 'Ocurrió un error inesperado al intentar eliminar el almacén.',
                        variant: 'destructive',
                    });
                },
            });
        }
    };

    interface TransferItem {
        material_id: string;
        quantity: string;
    }

    // Formulario de Traspaso / Reasignación (Soporta traspaso de múltiples insumos en un solo lote)
    const transferForm = useForm<{
        warehouse_id: string;
        from_project_id: string;
        to_project_id: string;
        items: TransferItem[];
        reason: string;
        general?: string;
    }>({
        warehouse_id: String(selectedWarehouseId),
        from_project_id: '',
        to_project_id: '',
        items: [
            {
                material_id: '',
                quantity: '',
            },
        ],
        reason: '',
    });

    const openTransferDialog = () => {
        transferForm.reset();
        transferForm.setData({
            warehouse_id: String(selectedWarehouseId),
            from_project_id: '',
            to_project_id: '',
            items: [
                {
                    material_id: '',
                    quantity: '',
                },
            ],
            reason: '',
        });
        transferForm.clearErrors();
        setIsTransferDialogOpen(true);
    };

    const addTransferItem = () => {
        transferForm.setData('items', [
            ...transferForm.data.items,
            {
                material_id: '',
                quantity: '',
            },
        ]);
    };

    const removeTransferItem = (index: number) => {
        if (transferForm.data.items.length <= 1) return;
        transferForm.setData(
            'items',
            transferForm.data.items.filter((_, i) => i !== index)
        );
    };

    const updateTransferItem = (index: number, field: keyof TransferItem, value: string) => {
        const updated = [...transferForm.data.items];
        if (field === 'material_id') {
            const selectedMat = materials.find((m) => String(m.id) === String(value));
            const unitInfo = getMaterialUnitInfo(selectedMat?.unit, selectedMat?.name);
            const sanitizedQty = sanitizeQuantity(updated[index].quantity, unitInfo.isIntegerOnly);
            updated[index] = { ...updated[index], material_id: value, quantity: sanitizedQty };
        } else if (field === 'quantity') {
            const selectedMat = materials.find((m) => String(m.id) === String(updated[index].material_id));
            const unitInfo = getMaterialUnitInfo(selectedMat?.unit, selectedMat?.name);
            const sanitizedVal = sanitizeQuantity(value, unitInfo.isIntegerOnly);
            updated[index] = { ...updated[index], quantity: sanitizedVal };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        transferForm.setData('items', updated);
    };

    // Consultar existencia disponible en el origen seleccionado para el insumo indicado
    const getAvailableStock = (matId: string | number, fromProjId: string): number => {
        const pId = fromProjId ? Number(fromProjId) : null;
        const match = inventories.find(
            (inv) =>
                Number(inv.warehouse_id) === Number(transferForm.data.warehouse_id || selectedWarehouseId) &&
                Number(inv.material_id) === Number(matId) &&
                (pId === null ? inv.project_id === null : Number(inv.project_id) === pId)
        );
        return match ? Number(match.quantity) : 0;
    };

    // Insumos que REALMENTE tienen stock > 0 en el origen seleccionado
    const availableMaterialsInOrigin = useMemo(() => {
        return materials.filter((m) => getAvailableStock(m.id, transferForm.data.from_project_id) > 0);
    }, [materials, inventories, transferForm.data.warehouse_id, selectedWarehouseId, transferForm.data.from_project_id]);

    const handleFromProjectChange = (newFromId: string) => {
        transferForm.setData((prev) => ({
            ...prev,
            from_project_id: newFromId,
            items: prev.items.map((it) => {
                const stock = getAvailableStock(it.material_id, newFromId);
                return stock > 0 ? it : { material_id: '', quantity: '' };
            }),
        }));
    };

    // Formulario de Ajuste / Entrada
    const stockForm = useForm({
        warehouse_id: String(selectedWarehouseId),
        material_id: '',
        project_id: '',
        quantity: '',
        minimum_alert: '',
    });

    const activeWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];

    // Filtrar usuarios específicamente por el rol requerido (Jefe / Supervisor de Almacén)
    const availableWarehouseUsers = useMemo(() => {
        const direct = (users || []).filter((u) => u.role?.slug === 'almacen');
        return direct.length > 0
            ? direct
            : (users || []).filter((u) => ['almacen', 'coordinador_proyecto', 'admin'].includes(u.role?.slug || ''));
    }, [users]);

    const applyFilters = (newStockType?: string, newProj?: string, newWhId?: number) => {
        const st = newStockType !== undefined ? newStockType : selectedStockType;
        const p = newProj !== undefined ? newProj : selectedProject;
        const wh = newWhId !== undefined ? newWhId : selectedWarehouseId;

        router.get(
            '/warehouse',
            { warehouse_id: wh, search, stock_type: st, project_id: p },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasEmptyItem = transferForm.data.items.some(
            (it) => !it.material_id || !it.quantity || parseFloat(it.quantity) <= 0
        );
        if (hasEmptyItem) {
            return;
        }
        transferForm.post('/warehouse/transfer', {
            preserveScroll: true,
            onSuccess: () => {
                handleTransferDialogOpenChange(false);
                transferForm.reset();
            },
        });
    };

    const openStockDialog = () => {
        stockForm.setData({
            warehouse_id: String(selectedWarehouseId),
            material_id: '',
            project_id: '',
            quantity: '',
            minimum_alert: '',
        });
        stockForm.clearErrors();
        setIsStockDialogOpen(true);
    };

    const handleStockSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockForm.data.material_id || !stockForm.data.quantity) return;
        stockForm.post('/warehouse/stock', {
            onSuccess: () => setIsStockDialogOpen(false),
        });
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Almacén e Inventarios - BANPE" />

            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Boxes className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Inventario Central & Sub-Almacenes
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control multi-sitio con diferenciación de <strong>Stock Libre</strong> (disponible) vs <strong>Stock Asignado</strong> (reservado para obras específicas).
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={openTransferDialog}
                        className="font-bold text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                        <ArrowRightLeft className="size-4 mr-1.5" />
                        Traspaso entre Obras
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openStockDialog}
                        className="font-bold text-xs border-border hover:bg-muted text-foreground"
                    >
                        <Plus className="size-4 mr-1.5" />
                        Ajuste de Stock
                    </Button>
                    <Button
                        onClick={openCreateWarehouseDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs text-xs"
                    >
                        <Building2 className="size-4 mr-1.5" />
                        Nuevo Almacén
                    </Button>
                </div>
            </div>

            {/* Selector de Almacén Físico */}
            <div className="flex items-center gap-2 flex-wrap">
                {warehouses.map((wh) => {
                    const isSelected = selectedWarehouseId === wh.id;
                    return (
                        <div
                            key={wh.id}
                            onClick={() => applyFilters(undefined, undefined, wh.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                                    : 'bg-card text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <Building2 className="size-4 shrink-0" />
                            <span>{wh.name}</span>
                            {wh.is_central ? (
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${isSelected ? 'border-zinc-950 text-zinc-950' : 'border-amber-500/50 text-amber-500'}`}
                                >
                                    Sede Central
                                </Badge>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${isSelected ? 'border-zinc-950 text-zinc-950' : 'border-border text-muted-foreground'}`}
                                >
                                    {wh.project?.code || 'Obra'}
                                </Badge>
                            )}

                            {/* Botones de acción del almacén */}
                            <div className="flex items-center gap-0.5 ml-1">
                                <button
                                    type="button"
                                    title="Editar datos de este almacén"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditWarehouseDialog(wh);
                                    }}
                                    className={`p-1 rounded-md transition-colors ${
                                        isSelected
                                            ? 'hover:bg-zinc-950/15 text-zinc-950'
                                            : 'hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Edit2 className="size-3" />
                                </button>

                                {warehouses.length > 1 && (
                                    <button
                                        type="button"
                                        title={`Eliminar almacén '${wh.name}'`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWarehouse(wh);
                                        }}
                                        className={`p-1 rounded-md transition-colors ${
                                            isSelected
                                                ? 'hover:bg-rose-950/20 text-rose-950'
                                                : 'hover:bg-rose-500/15 text-rose-500 hover:text-rose-600'
                                        }`}
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* KPIs Métricos TailAdmin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Valor Inventario ($)
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <DollarSign className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            ${Number(stats.total_stock_value_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.total_items_count} registros en este almacén
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Stock Libre ($)
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Boxes className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            ${Number(stats.free_stock_value_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Disponible sin asignación para cualquier obra
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Stock Asignado ($)
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Building2 className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            ${Number(stats.assigned_stock_value_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Reservado formalmente para frentes de obra
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Alertas de Reposición
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                            {stats.low_stock_alerts}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ítems por debajo del stock de seguridad
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por código de insumo o descripción..."
                        className="pl-9 bg-background h-10 w-full text-xs"
                    />
                </form>

                {/* Tipo de Stock */}
                <div className="flex items-center gap-1.5">
                    {[
                        { key: 'todos', label: 'Todo el Stock' },
                        { key: 'libre', label: 'Solo Stock Libre' },
                        { key: 'asignado', label: 'Solo Stock Asignado' },
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            type="button"
                            onClick={() => {
                                setSelectedStockType(btn.key);
                                applyFilters(btn.key, undefined);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                selectedStockType === btn.key
                                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Filtro por Obra */}
                <select
                    value={selectedProject}
                    onChange={(e) => {
                        setSelectedProject(e.target.value);
                        applyFilters(undefined, e.target.value);
                    }}
                    className="h-10 text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-medium shrink-0"
                >
                    <option value="todos">Todas las Obras Asignadas</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            [{p.code}] {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabla Principal de Existencias con Efecto Skeleton MUI */}
            {isLoading ? (
                <TableSkeleton columns={8} rows={pagination.perPage} />
            ) : (
                <Card className="border border-border/70 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-xs font-bold w-[120px]">Cód. Insumo</TableHead>
                                <TableHead className="text-xs font-bold">Descripción del Material</TableHead>
                                <TableHead className="text-xs font-bold">Condición de Stock</TableHead>
                                <TableHead className="text-xs font-bold text-right">Existencia Actual</TableHead>
                                <TableHead className="text-xs font-bold text-right">Stock Mínimo</TableHead>
                                <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                                <TableHead className="text-xs font-bold text-right">P.U. ($)</TableHead>
                                <TableHead className="text-xs font-bold text-right">Valorizado ($)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pagination.isChangingPage ? (
                                <TableBodySkeleton columns={8} rows={pagination.perPage} />
                            ) : pagination.totalItems === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                                        No hay registros de inventario en este almacén con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagination.paginatedItems.map((item) => {
                                    const qty = Number(item.quantity || 0);
                                    const minAlert = Number(item.minimum_alert || 0);
                                    const price = Number(item.material?.estimated_price_usd || 0);
                                    const total = qty * price;
                                    const unit = item.material?.unit?.symbol || 'und';
                                    const isLow = qty <= minAlert && minAlert > 0;

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-xs font-bold text-foreground">
                                                {item.material?.code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-foreground text-xs">
                                                    {item.material?.name}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {item.material?.category?.name || 'General'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.project ? (
                                                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 w-fit">
                                                        <Building2 className="size-3" />
                                                        Asignado: {item.project.code}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 w-fit">
                                                        <Boxes className="size-3" />
                                                        Stock Libre (Disponible)
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-black text-foreground">
                                                {qty.toLocaleString('en-US')} {unit}
                                            </TableCell>
                                            <TableCell className="text-xs text-right text-muted-foreground">
                                                {minAlert > 0 ? `${minAlert.toLocaleString('en-US')} ${unit}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isLow ? (
                                                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                                                        Bajo Mínimo
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                        Óptimo
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-medium text-foreground">
                                                ${price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-extrabold text-foreground">
                                                ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        fromIndex={pagination.fromIndex}
                        toIndex={pagination.toIndex}
                        perPage={pagination.perPage}
                        onPageChange={pagination.goToPage}
                        onPerPageChange={pagination.setPerPage}
                        itemLabel="insumos en almacén"
                    />
                </div>
            </Card>
            )}

            {/* Historial de Traspasos Recientes */}
            <Card className="border border-border/70 shadow-xs bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                        <ArrowRightLeft className="size-4 text-amber-500" />
                        Historial de Reasignaciones y Traspasos entre Obras
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Trazabilidad de movimientos de inventario: quién autorizó, motivo de traspaso y cantidades transferidas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                    {recentTransfers.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            Aún no se han ejecutado traspasos de insumos en este almacén.
                        </div>
                    ) : (
                        recentTransfers.map((t) => (
                            <div
                                key={t.id}
                                className="p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                            {t.code}
                                        </Badge>
                                        <span className="font-bold text-foreground">
                                            {t.quantity} {t.material?.unit?.symbol || 'und'} de {t.material?.name}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2 text-[11px] flex-wrap">
                                        <span>Origen: <strong className="text-foreground">{t.from_project?.name || 'Stock Libre'}</strong></span>
                                        <span>&rarr;</span>
                                        <span>Destino: <strong className="text-foreground">{t.to_project?.name || 'Stock Libre'}</strong></span>
                                        <span>•</span>
                                        <span>Autorizado por: {t.authorized_by?.name || 'Gerencia'}</span>
                                    </div>
                                    {t.reason && (
                                        <div className="text-[11px] text-muted-foreground italic">
                                            "{t.reason}"
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(t.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* MODAL: TRASPASO ENTRE OBRAS Y MULTI-INSUMO */}
            <Dialog open={isTransferDialogOpen} onOpenChange={handleTransferDialogOpenChange}>
                <DialogContent className="w-[96vw] max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                            <ArrowRightLeft className="size-5 text-amber-500" />
                            Traspaso & Reasignación de Insumos
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Transfiere uno o varios materiales asignados a una obra hacia otra obra o reasigna hacia Stock Libre en una sola operación.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
                        {/* 1. SELECCIÓN DE ORIGEN Y DESTINO */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-muted/40 rounded-xl border border-border">
                            {/* Origen */}
                            <div className="space-y-1.5">
                                <Label htmlFor="from_project" className="text-xs font-semibold flex items-center justify-between">
                                    <span>Origen de los Insumos *</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">¿De dónde salen?</span>
                                </Label>
                                <select
                                    id="from_project"
                                    value={transferForm.data.from_project_id}
                                    onChange={(e) => handleFromProjectChange(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Stock Libre Central (Disponible)</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            Obra: {p.code} - {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={transferForm.errors.from_project_id} />
                            </div>

                            {/* Destino */}
                            <div className="space-y-1.5">
                                <Label htmlFor="to_project" className="text-xs font-semibold flex items-center justify-between">
                                    <span>Destino de los Insumos *</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">¿A dónde van?</span>
                                </Label>
                                <select
                                    id="to_project"
                                    value={transferForm.data.to_project_id}
                                    onChange={(e) => transferForm.setData('to_project_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Devolver a Stock Libre (Central)</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            Obra: {p.code} - {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={transferForm.errors.to_project_id} />
                            </div>

                            {/* Alerta si origen y destino son idénticos */}
                            {transferForm.data.from_project_id === transferForm.data.to_project_id && (
                                <div className="sm:col-span-2 text-[11px] text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <AlertTriangle className="size-3.5 shrink-0" />
                                    <span>El destino del traspaso debe ser diferente al origen seleccionado.</span>
                                </div>
                            )}
                        </div>

                        {/* 2. LISTA DINÁMICA DE INSUMOS A TRASPASAR (MULTI-ITEM) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-bold text-foreground">
                                        Insumos a Traspasar
                                    </Label>
                                    <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                        {transferForm.data.items.length} {transferForm.data.items.length === 1 ? 'insumo' : 'insumos'}
                                    </Badge>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={availableMaterialsInOrigin.length === 0}
                                    onClick={addTransferItem}
                                    className="h-8 px-3 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-40"
                                >
                                    <Plus className="size-3.5 mr-1.5" />
                                    Agregar Insumo
                                </Button>
                            </div>

                            {/* Alerta si el origen no tiene insumos con stock */}
                            {availableMaterialsInOrigin.length === 0 && (
                                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                                    <span>
                                        El origen seleccionado (
                                        <strong>
                                            {transferForm.data.from_project_id
                                                ? projects.find((p) => String(p.id) === String(transferForm.data.from_project_id))?.name || 'Obra'
                                                : 'Stock Libre Central'}
                                        </strong>
                                        ) no posee existencias disponibles de ningún insumo en este almacén.
                                    </span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {transferForm.data.items.map((item, idx) => {
                                    const selectedMat = materials.find((m) => String(m.id) === String(item.material_id));
                                    const available = getAvailableStock(item.material_id, transferForm.data.from_project_id);
                                    const qtyNum = parseFloat(item.quantity) || 0;
                                    const exceedsStock = available > 0 && qtyNum > available;
                                    const noStock = item.material_id ? available <= 0 : false;
                                    const unitInfo = getMaterialUnitInfo(selectedMat?.unit, selectedMat?.name);

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3.5 sm:p-4 bg-card rounded-xl border border-border/80 shadow-2xs space-y-3 hover:border-amber-500/40 transition-colors w-full min-w-0"
                                        >
                                            {/* Header de la tarjeta del insumo */}
                                            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                                                        Insumo #{idx + 1}
                                                    </span>
                                                    {selectedMat && (
                                                        <span className="text-[11px] text-muted-foreground truncate">
                                                            {selectedMat.category?.name || 'General'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.material_id && selectedMat && (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[11px] font-semibold px-2 py-0.5 ${
                                                                noStock
                                                                    ? 'text-destructive bg-destructive/10 border-destructive/30'
                                                                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                                            }`}
                                                        >
                                                            {noStock
                                                                ? `Sin stock en origen (0 ${unitInfo.shortSymbol})`
                                                                : `Disponible en origen: ${available} ${unitInfo.shortSymbol}`}
                                                        </Badge>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={transferForm.data.items.length <= 1}
                                                        onClick={() => removeTransferItem(idx)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 rounded-md"
                                                        title="Eliminar este insumo de la lista"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Fila adaptada con Grid Responsivo */}
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                                {/* Selector de Material con Buscador (filtrado a insumos con stock en origen) */}
                                                <div className="md:col-span-7 space-y-1 min-w-0">
                                                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                                        <span>Insumo / Material *</span>
                                                        <span className="text-[10px] text-muted-foreground font-normal">
                                                            {availableMaterialsInOrigin.length} disponibles en origen
                                                        </span>
                                                    </Label>
                                                    <SearchableMaterialSelect
                                                        materials={availableMaterialsInOrigin}
                                                        value={item.material_id}
                                                        onChange={(newId) => updateTransferItem(idx, 'material_id', newId)}
                                                        getAvailableStock={(matId) => getAvailableStock(matId, transferForm.data.from_project_id)}
                                                        placeholder={
                                                            availableMaterialsInOrigin.length > 0
                                                                ? 'Buscar entre insumos con existencia disponible...'
                                                                : 'No hay insumos disponibles en este origen'
                                                        }
                                                        disabled={availableMaterialsInOrigin.length === 0}
                                                    />
                                                </div>

                                                {/* Cantidad Dinámica con Reglas de Unidades */}
                                                <div className="md:col-span-5 space-y-1 min-w-0">
                                                    <div className="flex items-center justify-between text-xs font-semibold">
                                                        <Label className="text-xs font-semibold text-foreground">
                                                            {selectedMat ? `Cantidad (${unitInfo.shortSymbol}) *` : 'Cantidad a traspasar *'}
                                                        </Label>
                                                        {selectedMat && (
                                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                                {unitInfo.helpText}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="relative flex items-center">
                                                        <Input
                                                            type="text"
                                                            inputMode={unitInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                            value={item.quantity}
                                                            onChange={(e) => updateTransferItem(idx, 'quantity', e.target.value)}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, unitInfo.isIntegerOnly)}
                                                            className={`h-9 text-xs font-bold pr-16 bg-background ${
                                                                exceedsStock
                                                                    ? 'border-amber-500 focus-visible:ring-amber-500 bg-amber-500/5'
                                                                    : ''
                                                            }`}
                                                            placeholder={unitInfo.placeholder}
                                                            required
                                                        />
                                                        <span
                                                            className="absolute right-2 px-1.5 py-0.5 rounded bg-muted/80 text-[10px] font-extrabold text-muted-foreground uppercase pointer-events-none select-none tracking-wider"
                                                            title={unitInfo.humanName}
                                                        >
                                                            {unitInfo.shortSymbol}
                                                        </span>
                                                    </div>

                                                    {/* Alerta de exceso de stock */}
                                                    {exceedsStock && (
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                                                            <AlertTriangle className="size-3 shrink-0" />
                                                            <span>La cantidad ({qtyNum}) supera la existencia disponible ({available}).</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Error general del array o del backend */}
                            {(transferForm.errors as any).items && (
                                <InputError message={(transferForm.errors as any).items} />
                            )}
                            {transferForm.errors.general && (
                                <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <span>{transferForm.errors.general}</span>
                                </div>
                            )}
                        </div>

                        {/* 3. JUSTIFICACIÓN O MOTIVO */}
                        <div className="space-y-1.5">
                            <Label htmlFor="transfer_reason" className="text-xs font-semibold">
                                Justificación / Motivo del Traspaso *
                            </Label>
                            <Input
                                id="transfer_reason"
                                value={transferForm.data.reason}
                                onChange={(e) => transferForm.setData('reason', e.target.value)}
                                placeholder="Ej: Material sobrante de Fase 1 reasignado a Tinaquillo según avance de obra"
                                required
                            />
                            <InputError message={transferForm.errors.reason} />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleTransferDialogOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    transferForm.processing ||
                                    availableMaterialsInOrigin.length === 0 ||
                                    transferForm.data.from_project_id === transferForm.data.to_project_id ||
                                    transferForm.data.items.length === 0 ||
                                    transferForm.data.items.some(
                                        (it) =>
                                            !it.material_id ||
                                            !it.quantity ||
                                            parseFloat(it.quantity) <= 0 ||
                                            parseFloat(it.quantity) > getAvailableStock(it.material_id, transferForm.data.from_project_id)
                                    )
                                }
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold disabled:opacity-50"
                            >
                                {transferForm.processing ? (
                                    <Spinner className="mr-2" />
                                ) : (
                                    <ArrowRightLeft className="size-4 mr-2" />
                                )}
                                Procesar Traspaso ({transferForm.data.items.length} {transferForm.data.items.length === 1 ? 'insumo' : 'insumos'})
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: AJUSTE / ENTRADA DIRECTA DE STOCK */}
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogContent className="w-[96vw] max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Boxes className="size-5 text-amber-500" />
                            Ajuste / Entrada Directa de Stock
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Carga o actualiza existencias físicas en el almacén seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleStockSubmit} className="space-y-3.5 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="stock_mat" className="text-xs font-semibold">Material / Insumo *</Label>
                            <SearchableMaterialSelect
                                materials={materials}
                                value={stockForm.data.material_id}
                                onChange={(matId) => {
                                    const selectedMat = materials.find((m) => String(m.id) === String(matId));
                                    const uInfo = getMaterialUnitInfo(selectedMat?.unit, selectedMat?.name);
                                    stockForm.setData((prev) => ({
                                        ...prev,
                                        material_id: matId,
                                        quantity: sanitizeQuantity(prev.quantity, uInfo.isIntegerOnly),
                                        minimum_alert: sanitizeQuantity(prev.minimum_alert, uInfo.isIntegerOnly),
                                    }));
                                }}
                                placeholder="Escriba para buscar por código o nombre..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="stock_proj" className="text-xs font-semibold">Condición de Asignación</Label>
                            <select
                                id="stock_proj"
                                value={stockForm.data.project_id}
                                onChange={(e) => stockForm.setData('project_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Stock Libre (Disponible para cualquier obra)</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        Reservado a Obra: {p.code} - {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(() => {
                            const selMat = materials.find((m) => String(m.id) === String(stockForm.data.material_id));
                            const uInfo = getMaterialUnitInfo(selMat?.unit, selMat?.name);
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <Label htmlFor="stock_qty">
                                                {selMat ? `Cantidad (${uInfo.shortSymbol}) *` : 'Cantidad Total *'}
                                            </Label>
                                            {selMat && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {uInfo.helpText}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative flex items-center">
                                            <Input
                                                id="stock_qty"
                                                type="text"
                                                inputMode={uInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                value={stockForm.data.quantity}
                                                onChange={(e) => {
                                                    const val = sanitizeQuantity(e.target.value, uInfo.isIntegerOnly);
                                                    stockForm.setData('quantity', val);
                                                }}
                                                onKeyDown={(e) => handleQuantityKeyDown(e, uInfo.isIntegerOnly)}
                                                className="pr-16 text-xs font-bold"
                                                placeholder={uInfo.placeholder}
                                                required
                                            />
                                            <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-extrabold text-muted-foreground uppercase pointer-events-none select-none">
                                                {uInfo.shortSymbol}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <Label htmlFor="stock_min">Alerta Mínima</Label>
                                            {selMat && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {uInfo.shortSymbol}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative flex items-center">
                                            <Input
                                                id="stock_min"
                                                type="text"
                                                inputMode={uInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                value={stockForm.data.minimum_alert}
                                                onChange={(e) => {
                                                    const val = sanitizeQuantity(e.target.value, uInfo.isIntegerOnly);
                                                    stockForm.setData('minimum_alert', val);
                                                }}
                                                onKeyDown={(e) => handleQuantityKeyDown(e, uInfo.isIntegerOnly)}
                                                className="pr-16 text-xs font-bold"
                                                placeholder={uInfo.isIntegerOnly ? 'Ej: 10' : 'Ej: 5.00'}
                                            />
                                            <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-extrabold text-muted-foreground uppercase pointer-events-none select-none">
                                                {uInfo.shortSymbol}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsStockDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={stockForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {stockForm.processing && <Spinner className="mr-2" />}
                                Guardar Existencia
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: CREAR / EDITAR ALMACÉN (CENTRAL O DE OBRA) */}
            <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
                <DialogContent className="w-[96vw] max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Building2 className="size-5 text-amber-500" />
                            {editingWarehouse ? 'Editar Parámetros de Almacén' : 'Registrar Nuevo Almacén en BANPE'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define si este almacén opera como Sede Central (gestión de stock libre) o como Sub-Almacén de Obra vinculado a un contrato.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleWarehouseSubmit} className="space-y-4 pt-1">
                        {/* Tipo de Almacén: Selector visual de 2 opciones */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Tipo y Naturaleza del Almacén *</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => warehouseForm.setData({
                                        ...warehouseForm.data,
                                        is_central: true,
                                        project_id: '',
                                    })}
                                    className={`p-3.5 rounded-xl border text-left transition-all ${
                                        warehouseForm.data.is_central
                                            ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                                            : 'border-border/70 hover:bg-muted bg-card'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                            <Building2 className="size-4 text-amber-500" />
                                            Almacén Principal / Sede Central
                                        </div>
                                        {warehouseForm.data.is_central && (
                                            <CheckCircle2 className="size-4 text-amber-500" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                                        Almacén general de BANPE (ej. Patio Central Valencia, Depósito Maracay). Maneja Stock Libre para distribución multi-obra.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => warehouseForm.setData({
                                        ...warehouseForm.data,
                                        is_central: false,
                                        project_id: projects[0]?.id ? String(projects[0].id) : '',
                                    })}
                                    className={`p-3.5 rounded-xl border text-left transition-all ${
                                        !warehouseForm.data.is_central
                                            ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                                            : 'border-border/70 hover:bg-muted bg-card'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                            <MapPin className="size-4 text-emerald-500" />
                                            Sub-Almacén de Obra
                                        </div>
                                        {!warehouseForm.data.is_central && (
                                            <CheckCircle2 className="size-4 text-amber-500" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                                        Instalación física en el frente de trabajo de un proyecto específico para recepción directa y acopio de materiales de obra.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Si es almacén de obra: Selector de Proyecto */}
                        {!warehouseForm.data.is_central && (
                            <div className="space-y-1.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Label htmlFor="wh_project" className="text-xs font-semibold text-foreground">
                                    Obra o Proyecto Vinculado *
                                </Label>
                                <select
                                    id="wh_project"
                                    value={warehouseForm.data.project_id}
                                    onChange={(e) => warehouseForm.setData('project_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required={!warehouseForm.data.is_central}
                                >
                                    <option value="">Selecciona la obra...</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.code}] {p.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={warehouseForm.errors.project_id} />
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Código del Almacén */}
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="wh_code" className="text-xs font-semibold">
                                    Código Único *
                                </Label>
                                <Input
                                    id="wh_code"
                                    value={warehouseForm.data.code}
                                    onChange={(e) => warehouseForm.setData('code', e.target.value.toUpperCase())}
                                    placeholder="ALM-CENTRAL-01"
                                    className="font-mono text-xs uppercase"
                                    required
                                />
                                <InputError message={warehouseForm.errors.code} />
                            </div>

                            {/* Nombre del Almacén */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="wh_name" className="text-xs font-semibold">
                                    Nombre del Almacén *
                                </Label>
                                <Input
                                    id="wh_name"
                                    value={warehouseForm.data.name}
                                    onChange={(e) => warehouseForm.setData('name', e.target.value)}
                                    placeholder="Ej: Almacén Central Valencia - Galpón 4"
                                    className="text-xs"
                                    required
                                />
                                <InputError message={warehouseForm.errors.name} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Ubicación Física */}
                            <div className="space-y-1.5">
                                <Label htmlFor="wh_location" className="text-xs font-semibold">
                                    Ubicación / Dirección Física *
                                </Label>
                                <Input
                                    id="wh_location"
                                    value={warehouseForm.data.location}
                                    onChange={(e) => warehouseForm.setData('location', e.target.value)}
                                    placeholder="Ej: Zona Industrial San Vicente, Maracay"
                                    className="text-xs"
                                    required
                                />
                                <InputError message={warehouseForm.errors.location} />
                            </div>

                            {/* Responsable de Almacén */}
                            <div className="space-y-1.5">
                                <Label htmlFor="wh_responsible" className="text-xs font-semibold">
                                    Encargado / Responsable de Almacén
                                </Label>
                                <select
                                    id="wh_responsible"
                                    value={warehouseForm.data.responsible_user_id}
                                    onChange={(e) => warehouseForm.setData('responsible_user_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Sin responsable directo asignado</option>
                                    {availableWarehouseUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.role?.name || u.email})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={warehouseForm.errors.responsible_user_id} />
                            </div>
                        </div>

                        {/* Estado Activo */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                                id="wh_is_active"
                                checked={warehouseForm.data.is_active}
                                onCheckedChange={(checked) => warehouseForm.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="wh_is_active" className="text-xs font-medium cursor-pointer">
                                Almacén activo y disponible para despachos, inventarios y compras
                            </Label>
                        </div>

                        <DialogFooter className="pt-3 flex items-center justify-between gap-2">
                            {editingWarehouse && warehouses.length > 1 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => handleDeleteWarehouse(editingWarehouse)}
                                    className="mr-auto text-xs font-bold"
                                >
                                    <Trash2 className="size-3.5 mr-1" />
                                    Eliminar Almacén
                                </Button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsWarehouseDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={warehouseForm.processing}
                                    className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                                >
                                    {warehouseForm.processing && <Spinner className="mr-2" />}
                                    {editingWarehouse ? 'Guardar Cambios' : 'Registrar Almacén'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

WarehouseIndex.layout = {
    breadcrumbs,
};

