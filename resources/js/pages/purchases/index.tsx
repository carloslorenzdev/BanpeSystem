import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Award,
    BadgeAlert,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    Edit2,
    ExternalLink,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Layers,
    MapPin,
    PackageCheck,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    ShoppingCart,
    Store,
    Trash2,
    Truck,
    Users,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useConfirm } from '@/contexts/confirm-context';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { TableSkeleton, TableBodySkeleton } from '@/components/skeletons';
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
import { Checkbox } from '@/components/ui/checkbox';
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

type Material = {
    id: number;
    code: string;
    name: string;
    estimated_price_usd: number | string;
    unit?: {
        id: number;
        symbol: string;
        name: string;
    };
};

type ProjectOption = {
    id: number;
    code: string;
    name: string;
};

type WarehouseOption = {
    id: number;
    code: string;
    name: string;
    is_central: boolean;
};

type Supplier = {
    id: number;
    rif: string;
    business_name: string;
    commercial_name?: string | null;
    contact_person?: string | null;
    phone: string;
    email?: string | null;
    address?: string | null;
    city: string;
    specialty?: string | null;
    payment_terms: string;
    bank_details?: string | null;
    is_active: boolean;
    quotations_count?: number;
    purchase_orders_count?: number;
};

type QuotationItem = {
    id: number;
    material_id: number;
    quantity: number | string;
    unit_price_usd: number | string;
    total_price_usd: number | string;
    material?: Material;
};

type SupplierQuotation = {
    id: number;
    purchase_request_id: number;
    supplier_id: number;
    quotation_number: string;
    quotation_date: string;
    validity_days: number;
    payment_condition: string;
    delivery_time: string;
    delivery_place: string;
    subtotal_usd: number | string;
    total_usd: number | string;
    is_winner: boolean;
    evaluation_comments?: string | null;
    supplier?: Supplier;
    items: QuotationItem[];
};

type PurchaseRequestItem = {
    id: number;
    purchase_request_id: number;
    material_id: number;
    quantity: number | string;
    target_price_usd?: number | string | null;
    notes?: string | null;
    material?: Material;
};

type PurchaseRequest = {
    id: number;
    code: string;
    title: string;
    project_id?: number | null;
    warehouse_id?: number | null;
    priority: 'baja' | 'normal' | 'urgente';
    status: 'en_cotizacion' | 'evaluacion_comparativa' | 'aprobada' | 'rechazada' | 'orden_generada';
    selected_quotation_id?: number | null;
    justification?: string | null;
    approval_notes?: string | null;
    created_at: string;
    project?: ProjectOption | null;
    warehouse?: WarehouseOption | null;
    requested_by?: { id: number; name: string; email: string };
    approved_by?: { id: number; name: string; email: string };
    items: PurchaseRequestItem[];
    quotations: SupplierQuotation[];
    selected_quotation?: SupplierQuotation | null;
    purchase_order?: {
        id: number;
        code: string;
        status: string;
        total_usd: number | string;
    } | null;
};

type PurchaseOrder = {
    id: number;
    code: string;
    purchase_request_id: number;
    supplier_id: number;
    issue_date: string;
    delivery_deadline?: string | null;
    total_usd: number | string;
    payment_terms: string;
    status: 'emitida' | 'en_transito' | 'recibida_total' | 'anulada';
    shipping_instructions?: string | null;
    notes?: string | null;
    supplier?: Supplier;
    project?: ProjectOption | null;
    warehouse?: WarehouseOption | null;
    quotation?: SupplierQuotation | null;
    purchase_request?: PurchaseRequest | null;
};

type Props = {
    activeTab: 'comparativos' | 'ordenes' | 'proveedores';
    purchaseRequests: PurchaseRequest[];
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    materials: Material[];
    projects: ProjectOption[];
    warehouses: WarehouseOption[];
    stats: {
        total_purchases_usd: number;
        pending_comparatives_count: number;
        orders_in_transit_count: number;
        active_suppliers_count: number;
    };
    filters: {
        search: string;
        status: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control', href: '/dashboard' },
    { title: 'Procura & Compras', href: '/purchases' },
];

export default function PurchasesIndex({
    activeTab: initialTab,
    purchaseRequests,
    purchaseOrders,
    suppliers,
    materials,
    projects,
    warehouses,
    stats,
    filters,
}: Props) {
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal } = useConfirm();
    const requestsPagination = useTablePagination({
        items: purchaseRequests,
        initialPerPage: 10,
    });
    const ordersPagination = useTablePagination({
        items: purchaseOrders,
        initialPerPage: 10,
    });
    const suppliersPagination = useTablePagination({
        items: suppliers,
        initialPerPage: 10,
    });
    const [tab, setTab] = useState(initialTab);
    const [search, setSearch] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'todos');

    // Modales
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
    const [activeRequestForQuotation, setActiveRequestForQuotation] = useState<PurchaseRequest | null>(null);

    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [activeRequestForApproval, setActiveRequestForApproval] = useState<PurchaseRequest | null>(null);

    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
    const [activeRequestForOrder, setActiveRequestForOrder] = useState<PurchaseRequest | null>(null);

    const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // 1. Formulario de Solicitud de Compra
    const requestForm = useForm({
        title: '',
        project_id: '',
        warehouse_id: '',
        priority: 'normal',
        justification: '',
        items: [
            {
                material_id: '',
                quantity: '',
                target_price_usd: '',
                notes: '',
            },
        ],
    });

    const openRequestDialog = () => {
        requestForm.reset();
        requestForm.setData({
            title: '',
            project_id: '',
            warehouse_id: '',
            priority: 'normal',
            justification: '',
            items: [
                {
                    material_id: '',
                    quantity: '',
                    target_price_usd: '',
                    notes: '',
                },
            ],
        });
        requestForm.clearErrors();
        setIsRequestDialogOpen(true);
    };

    const addRequestItem = () => {
        requestForm.setData('items', [
            ...requestForm.data.items,
            {
                material_id: '',
                quantity: '',
                target_price_usd: '',
                notes: '',
            },
        ]);
    };

    const removeRequestItem = (index: number) => {
        if (requestForm.data.items.length <= 1) return;
        requestForm.setData(
            'items',
            requestForm.data.items.filter((_, i) => i !== index)
        );
    };

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        requestForm.post('/purchases/requests', {
            onSuccess: () => {
                setIsRequestDialogOpen(false);
                requestForm.reset();
            },
        });
    };

    // 2. Formulario de Carga de Cotización para Cuadro Comparativo
    const quotationForm = useForm({
        supplier_id: suppliers[0]?.id ? String(suppliers[0].id) : '',
        quotation_number: '',
        quotation_date: new Date().toISOString().split('T')[0],
        validity_days: 7,
        payment_condition: 'Contado Transferencia',
        delivery_time: '48 horas',
        delivery_place: 'Puesto en Obra',
        evaluation_comments: '',
        items: [] as { material_id: number; quantity: number | string; unit_price_usd: string }[],
    });

    const openAddQuotationDialog = (req: PurchaseRequest) => {
        setActiveRequestForQuotation(req);
        quotationForm.setData({
            supplier_id: suppliers[0]?.id ? String(suppliers[0].id) : '',
            quotation_number: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
            quotation_date: new Date().toISOString().split('T')[0],
            validity_days: 7,
            payment_condition: 'Contado Transferencia',
            delivery_time: '48 horas',
            delivery_place: req.project ? `Puesto en Obra: ${req.project.name}` : 'Puesto en Almacén Central',
            evaluation_comments: '',
            items: req.items.map((it) => ({
                material_id: it.material_id,
                quantity: it.quantity,
                unit_price_usd: String(it.material?.estimated_price_usd || it.target_price_usd || '10'),
            })),
        });
        quotationForm.clearErrors();
        setIsQuotationDialogOpen(true);
    };

    const handleQuotationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRequestForQuotation) return;

        quotationForm.post(`/purchases/requests/${activeRequestForQuotation.id}/quotations`, {
            onSuccess: () => {
                setIsQuotationDialogOpen(false);
            },
        });
    };

    // 3. Formulario de Aprobación de Cuadro Comparativo
    const approveForm = useForm({
        selected_quotation_id: '',
        approval_notes: 'Aprobado según cuadro comparativo por Gerencia de BANPE C.A.',
    });

    const openApproveDialog = (req: PurchaseRequest) => {
        setActiveRequestForApproval(req);
        const bestQuote = req.quotations.reduce(
            (min, q) => (Number(q.total_usd) < Number(min.total_usd) ? q : min),
            req.quotations[0]
        );
        approveForm.setData({
            selected_quotation_id: bestQuote ? String(bestQuote.id) : '',
            approval_notes: 'Aprobada mejor oferta económica y condiciones de despacho en obra.',
        });
        setIsApproveDialogOpen(true);
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRequestForApproval) return;

        approveForm.post(`/purchases/requests/${activeRequestForApproval.id}/approve`, {
            onSuccess: () => setIsApproveDialogOpen(false),
        });
    };

    // 4. Formulario de Emisión de Orden de Compra
    const orderForm = useForm({
        delivery_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        shipping_instructions: 'Entregar con guía de remisión oficial de proveedor. Descargar en sitio.',
        notes: '',
    });

    const openGenerateOrderDialog = (req: PurchaseRequest) => {
        setActiveRequestForOrder(req);
        orderForm.setData({
            delivery_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            shipping_instructions: `Puesto en: ${req.selected_quotation?.delivery_place || 'Frente de Obra'}. Horario: 8:00 AM - 4:00 PM.`,
            notes: `Orden emitida conforme al Cuadro Comparativo ${req.code}. Cotización ${req.selected_quotation?.quotation_number}.`,
        });
        setIsOrderDialogOpen(true);
    };

    const handleOrderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRequestForOrder) return;

        orderForm.post(`/purchases/requests/${activeRequestForOrder.id}/generate-order`, {
            onSuccess: () => setIsOrderDialogOpen(false),
        });
    };

    // 5. Formulario de Proveedor
    const supplierForm = useForm({
        rif: '',
        business_name: '',
        commercial_name: '',
        contact_person: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        specialty: '',
        payment_terms: '',
        bank_details: '',
        is_active: true,
    });

    const openCreateSupplierDialog = () => {
        setEditingSupplier(null);
        supplierForm.reset();
        supplierForm.setData({
            rif: 'J-',
            business_name: '',
            commercial_name: '',
            contact_person: '',
            phone: '',
            email: '',
            city: '',
            address: '',
            specialty: '',
            payment_terms: '',
            bank_details: '',
            is_active: true,
        });
        supplierForm.clearErrors();
        setIsSupplierDialogOpen(true);
    };

    const openEditSupplierDialog = (sup: Supplier) => {
        setEditingSupplier(sup);
        supplierForm.setData({
            rif: sup.rif,
            business_name: sup.business_name,
            commercial_name: sup.commercial_name || '',
            contact_person: sup.contact_person || '',
            phone: sup.phone,
            email: sup.email || '',
            city: sup.city,
            address: sup.address || '',
            specialty: sup.specialty || '',
            payment_terms: sup.payment_terms,
            bank_details: sup.bank_details || '',
            is_active: sup.is_active,
        });
        supplierForm.clearErrors();
        setIsSupplierDialogOpen(true);
    };

    const handleSupplierSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            supplierForm.put(`/purchases/suppliers/${editingSupplier.id}`, {
                onSuccess: () => setIsSupplierDialogOpen(false),
            });
        } else {
            supplierForm.post('/purchases/suppliers', {
                onSuccess: () => setIsSupplierDialogOpen(false),
            });
        }
    };

    // Manejar filtros
    const applyFilters = (newStatus?: string) => {
        const s = newStatus !== undefined ? newStatus : selectedStatus;
        router.get(
            '/purchases',
            { tab, search, status: s },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Procura & Cuadro de 3 Presupuestos - BANPE" />

            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <ShoppingCart className="size-5" />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Procura & Cuadro de 3 Presupuestos
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Matriz comparativa de 3 cotizaciones por partida para aprobación gerencial y emisión oficial de Órdenes de Compra (O/C).
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={openCreateSupplierDialog}
                        className="font-bold text-xs border-border hover:bg-muted text-foreground"
                    >
                        <Store className="size-4 mr-1.5 text-amber-500" />
                        Nuevo Proveedor
                    </Button>
                    <Button
                        onClick={openRequestDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs text-xs"
                    >
                        <Plus className="size-4 mr-1.5" />
                        Nueva Solicitud de Compra
                    </Button>
                </div>
            </div>

            {/* Stepper Normativo ISO 9001 BANPE-MP-05 / BANPE-DF-05-a */}
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-amber-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Flujo Oficial de Compras & Procura (Norma ISO 9001:2015 BANPE-MP-05)
                        </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        BANPE-FO-05-0002
                    </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[11px]">1</span>
                        <div>
                            <p className="font-bold text-foreground">Requisición / Solicitud</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Ingresada desde Obra (cuando no hay stock en almacén) o Procura.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-[11px]">2</span>
                        <div>
                            <p className="font-bold text-foreground">3 Cotizaciones</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Mínimo 3 presupuestos de proveedores homologados (RNC/RIF).</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold text-[11px]">3</span>
                        <div>
                            <p className="font-bold text-foreground">Cuadro Comparativo</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Matriz lado a lado: precios unitarios, flete, tiempos de entrega.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">4</span>
                        <div>
                            <p className="font-bold text-foreground">Aprobación Gerencial</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Gerencia General y Compras seleccionan la mejor opción económica.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">5</span>
                        <div>
                            <p className="font-bold text-foreground">Orden de Compra (O/C)</p>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Emisión oficial al proveedor y seguimiento de entrega en almacén/obra.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs Métricos TailAdmin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Compras Aprobadas ($)
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            ${Number(stats.total_purchases_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Comprometidas en órdenes emitidas
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Cuadros en Evaluación
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <FileSpreadsheet className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {stats.pending_comparatives_count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pendientes por decisión de Gerencia
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Órdenes en Tránsito
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Truck className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {stats.orders_in_transit_count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Despachos de proveedores en camino
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-xs bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Proveedores Homologados
                        </CardTitle>
                        <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Store className="size-4" />
                        </span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {stats.active_suppliers_count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Directorio activo para cotizaciones
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Pestañas de Navegación del Módulo */}
            <div className="flex items-center gap-2 border-b border-border/70 pb-3 flex-wrap">
                <button
                    type="button"
                    onClick={() => {
                        setTab('comparativos');
                        router.get('/purchases', { tab: 'comparativos' }, { preserveState: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'comparativos'
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-card text-muted-foreground border border-border/70 hover:text-foreground'
                        }`}
                >
                    <FileSpreadsheet className="size-4" />
                    <span>Cuadros Comparativos (3 Presupuestos)</span>
                    <Badge variant="outline" className={`text-[10px] ${tab === 'comparativos' ? 'border-zinc-950 text-zinc-950' : 'border-border'}`}>
                        {purchaseRequests.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setTab('ordenes');
                        router.get('/purchases', { tab: 'ordenes' }, { preserveState: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'ordenes'
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-card text-muted-foreground border border-border/70 hover:text-foreground'
                        }`}
                >
                    <FileCheck className="size-4" />
                    <span>Órdenes de Compra (O/C)</span>
                    <Badge variant="outline" className={`text-[10px] ${tab === 'ordenes' ? 'border-zinc-950 text-zinc-950' : 'border-border'}`}>
                        {purchaseOrders.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setTab('proveedores');
                        router.get('/purchases', { tab: 'proveedores' }, { preserveState: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'proveedores'
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-card text-muted-foreground border border-border/70 hover:text-foreground'
                        }`}
                >
                    <Store className="size-4" />
                    <span>Directorio de Proveedores</span>
                    <Badge variant="outline" className={`text-[10px] ${tab === 'proveedores' ? 'border-zinc-950 text-zinc-950' : 'border-border'}`}>
                        {suppliers.length}
                    </Badge>
                </button>
            </div>

            {/* TAB 1: CUADROS COMPARATIVOS DE 3 PRESUPUESTOS */}
            {tab === 'comparativos' && (
                <div className="space-y-6">
                    {/* Barra de Filtros */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-xs">
                        <form onSubmit={handleSearchSubmit} className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por código (CMP-...), requerimiento u obra..."
                                className="pl-9 bg-background h-10 w-full text-xs"
                            />
                        </form>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { key: 'todos', label: 'Todos' },
                                { key: 'evaluacion_comparativa', label: 'En Evaluación' },
                                { key: 'aprobada', label: 'Aprobadas' },
                                { key: 'orden_generada', label: 'Con Orden (O/C)' },
                            ].map((btn) => (
                                <button
                                    key={btn.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatus(btn.key);
                                        applyFilters(btn.key);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedStatus === btn.key
                                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lista de Solicitudes y Matrices Comparativas con Efecto Skeleton MUI */}
                    {isLoading ? (
                        <TableSkeleton columns={7} rows={requestsPagination.perPage} />
                    ) : (
                        <div className="space-y-6">
                            <div className="min-h-[400px]">
                                {requestsPagination.isChangingPage ? (
                                    <TableSkeleton columns={7} rows={requestsPagination.perPage} />
                                ) : requestsPagination.totalItems === 0 ? (
                                    <Card className="text-center py-12 border-dashed border-border/80">
                                        <CardContent className="space-y-3">
                                            <FileSpreadsheet className="size-12 mx-auto text-muted-foreground/50" />
                                            <h3 className="text-lg font-bold">No hay solicitudes de compra registradas</h3>
                                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                Crea tu primer requerimiento para anexar las 3 cotizaciones de proveedores y someter el cuadro a evaluación gerencial.
                                            </p>
                                            <Button
                                                onClick={openRequestDialog}
                                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs"
                                            >
                                                <Plus className="size-4 mr-1.5" />
                                                Crear Solicitud de Compra
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-6">
                                        {requestsPagination.paginatedItems.map((req) => {
                                            const quotesCount = req.quotations.length;
                                            const hasMinQuotes = quotesCount >= 3;

                                            return (
                                                <Card key={req.id} className="border border-border/70 shadow-sm overflow-hidden bg-card">
                                                    {/* Cabecera del Cuadro Comparativo */}
                                                    <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-sm font-extrabold text-foreground px-2 py-0.5 rounded bg-background border border-border">
                                                                    {req.code}
                                                                </span>
                                                                {req.project ? (
                                                                    <Badge variant="outline" className="text-xs font-semibold bg-background">
                                                                        <Building2 className="size-3 mr-1 text-amber-500" />
                                                                        [{req.project.code}] {req.project.name}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-xs font-semibold bg-background">
                                                                        <Store className="size-3 mr-1 text-blue-500" />
                                                                        Almacén Central (Stock Libre)
                                                                    </Badge>
                                                                )}
                                                                {req.justification?.toLowerCase().includes('requisición') && (
                                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold gap-1">
                                                                        <Layers className="size-3" />
                                                                        Canalizado de Requisición de Obra
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    className={`text-[10px] font-bold uppercase ${req.priority === 'urgente'
                                                                        ? 'bg-rose-500 text-white'
                                                                        : 'bg-muted text-muted-foreground'
                                                                        }`}
                                                                >
                                                                    Prioridad {req.priority}
                                                                </Badge>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs font-bold ${req.status === 'orden_generada'
                                                                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                                                        : req.status === 'aprobada'
                                                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                                                                            : 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                                                        }`}
                                                                >
                                                                    {req.status === 'orden_generada' && 'Orden Emitida (O/C)'}
                                                                    {req.status === 'aprobada' && 'Aprobada por Gerencia'}
                                                                    {req.status === 'evaluacion_comparativa' && 'Cuadro en Evaluación'}
                                                                </Badge>
                                                            </div>
                                                            <h2 className="text-base sm:text-lg font-bold text-foreground">
                                                                {req.title}
                                                            </h2>
                                                            {req.justification && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    <strong>Destino / Justificación:</strong> {req.justification}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Botones de acción según el estado */}
                                                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                            {req.status === 'evaluacion_comparativa' && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => openAddQuotationDialog(req)}
                                                                        className="text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                                                    >
                                                                        <Plus className="size-3.5 mr-1" />
                                                                        Anexar Cotización ({quotesCount}/3)
                                                                    </Button>

                                                                    {quotesCount >= 2 && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => openApproveDialog(req)}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                                                        >
                                                                            <Award className="size-3.5 mr-1" />
                                                                            Evaluar y Aprobar
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {req.status === 'aprobada' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openGenerateOrderDialog(req)}
                                                                    className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs"
                                                                >
                                                                    <FileCheck className="size-3.5 mr-1" />
                                                                    Emitir Orden de Compra (O/C)
                                                                </Button>
                                                            )}

                                                            {req.status === 'orden_generada' && req.purchase_order && (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className="bg-emerald-600 text-white text-xs font-mono font-bold px-3 py-1">
                                                                        <FileCheck className="size-3 mr-1" />
                                                                        {req.purchase_order.code}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* CUADRO COMPARATIVO DE 3 PRESUPUESTOS (MATRIZ VISUAL) */}
                                                    <div className="p-4 sm:p-5 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <FileSpreadsheet className="size-4 text-amber-500" />
                                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                                    Matriz Comparativa de Ofertas ({quotesCount} Presupuestos Anexados)
                                                                </span>
                                                            </div>
                                                            {!hasMinQuotes && req.status === 'evaluacion_comparativa' && (
                                                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                                    <AlertCircle className="size-3" />
                                                                    BANPE exige mínimo 3 cotizaciones para validar compras mayores
                                                                </span>
                                                            )}
                                                        </div>

                                                        {quotesCount === 0 ? (
                                                            <div className="p-6 rounded-xl border border-dashed border-border/80 text-center bg-muted/10 space-y-2">
                                                                <p className="text-xs text-muted-foreground">
                                                                    Aún no has registrado presupuestos de proveedores para esta solicitud.
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => openAddQuotationDialog(req)}
                                                                    className="text-xs font-bold"
                                                                >
                                                                    <Plus className="size-3.5 mr-1 text-amber-500" />
                                                                    Cargar 1ra Cotización
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {req.quotations.map((quot, qIdx) => {
                                                                    const isSelectedWinner = quot.is_winner || req.selected_quotation_id === quot.id;

                                                                    return (
                                                                        <div
                                                                            key={quot.id}
                                                                            className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative ${isSelectedWinner
                                                                                ? 'border-emerald-500 bg-emerald-500/5 shadow-md ring-1 ring-emerald-500/30'
                                                                                : 'border-border/70 bg-card hover:border-border'
                                                                                }`}
                                                                        >
                                                                            {isSelectedWinner && (
                                                                                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1">
                                                                                    <Award className="size-3" />
                                                                                    Oferta Ganadora Aprobada
                                                                                </div>
                                                                            )}

                                                                            <div className="space-y-3">
                                                                                {/* Cabecera del Proveedor */}
                                                                                <div>
                                                                                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                                                                                        <span>OPCIÓN #{qIdx + 1}</span>
                                                                                        <span>{quot.quotation_number}</span>
                                                                                    </div>
                                                                                    <h3 className="font-extrabold text-sm text-foreground mt-0.5 leading-snug">
                                                                                        {quot.supplier?.business_name}
                                                                                    </h3>
                                                                                    <p className="text-[11px] text-muted-foreground">
                                                                                        RIF: {quot.supplier?.rif} • {quot.supplier?.city}
                                                                                    </p>
                                                                                </div>

                                                                                {/* Parámetros Comerciales Claves */}
                                                                                <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Forma de Pago:</span>
                                                                                        <span className="font-bold text-foreground text-right">{quot.payment_condition}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Tiempo de Entrega:</span>
                                                                                        <span className="font-bold text-foreground text-right">{quot.delivery_time}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-muted-foreground">Lugar de Despacho:</span>
                                                                                        <span className="font-semibold text-foreground text-right truncate max-w-[140px]" title={quot.delivery_place}>
                                                                                            {quot.delivery_place}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Desglose de Insumos Cotizados */}
                                                                                <div className="space-y-1.5">
                                                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                                        Precios Unitarios Ofertados
                                                                                    </div>
                                                                                    <div className="space-y-1 text-xs">
                                                                                        {quot.items.map((it) => (
                                                                                            <div key={it.id} className="flex justify-between items-center py-1 border-b border-border/40 last:border-none">
                                                                                                <span className="text-muted-foreground truncate max-w-[180px]">
                                                                                                    {it.material?.name || 'Insumo'} ({it.quantity} {it.material?.unit?.symbol})
                                                                                                </span>
                                                                                                <span className="font-mono font-bold text-foreground">
                                                                                                    ${Number(it.unit_price_usd).toFixed(2)}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Total de la Cotización */}
                                                                            <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                                                                                <div>
                                                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                                                        Monto Total Ofertado
                                                                                    </div>
                                                                                    <div className="text-xl font-black font-mono text-foreground">
                                                                                        ${Number(quot.total_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </div>
                                                                                </div>

                                                                                {req.status === 'evaluacion_comparativa' && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant={isSelectedWinner ? 'default' : 'outline'}
                                                                                        onClick={() => {
                                                                                            setActiveRequestForApproval(req);
                                                                                            approveForm.setData({
                                                                                                selected_quotation_id: String(quot.id),
                                                                                                approval_notes: `Seleccionada oferta de ${quot.supplier?.business_name} por monto de $${quot.total_usd} USD.`,
                                                                                            });
                                                                                            setIsApproveDialogOpen(true);
                                                                                        }}
                                                                                        className={`text-xs font-bold ${isSelectedWinner
                                                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                                            : 'border-border hover:bg-muted text-foreground'
                                                                                            }`}
                                                                                    >
                                                                                        <Check className="size-3.5 mr-1" />
                                                                                        Seleccionar Esta
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <DataTablePagination
                                currentPage={requestsPagination.currentPage}
                                totalPages={requestsPagination.totalPages}
                                totalItems={requestsPagination.totalItems}
                                fromIndex={requestsPagination.fromIndex}
                                toIndex={requestsPagination.toIndex}
                                perPage={requestsPagination.perPage}
                                onPageChange={requestsPagination.goToPage}
                                onPerPageChange={requestsPagination.setPerPage}
                                itemLabel="solicitudes de compra"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ÓRDENES DE COMPRA (O/C OFICIALES) */}
            {tab === 'ordenes' && (
                <div className="space-y-4">
                    <Card className="border border-border/60 shadow-xs overflow-hidden">
                        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <FileCheck className="size-5 text-amber-500" />
                                Registro Oficial de Órdenes de Compra (O/C)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Documentos mercantiles contractuales emitidos a proveedores con base en los presupuestos comparativos aprobados.
                            </CardDescription>
                        </CardHeader>

                        {isLoading ? (
                            <div className="p-4">
                                <TableSkeleton columns={8} rows={ordersPagination.perPage} />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold uppercase">Código O/C</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Proveedor Homologado</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Destino (Obra / Almacén)</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Fecha Emisión</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Plazo de Entrega</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Monto Total ($)</TableHead>
                                            <TableHead className="text-xs font-bold uppercase">Estado Logístico</TableHead>
                                            <TableHead className="text-xs font-bold uppercase text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ordersPagination.isChangingPage ? (
                                            <TableBodySkeleton columns={8} rows={ordersPagination.perPage} />
                                        ) : ordersPagination.totalItems === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                                                    No se han generado órdenes de compra oficiales aún.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ordersPagination.paginatedItems.map((po) => (
                                                <TableRow key={po.id} className="text-xs hover:bg-muted/30">
                                                    <TableCell className="font-mono font-bold text-foreground">
                                                        {po.code}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-foreground">{po.supplier?.business_name}</div>
                                                        <div className="text-[11px] text-muted-foreground">RIF: {po.supplier?.rif} • Tel: {po.supplier?.phone}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {po.project ? (
                                                            <Badge variant="outline" className="font-semibold">
                                                                [{po.project.code}] {po.project.name}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="font-semibold text-blue-500 border-blue-500/40">
                                                                {po.warehouse?.name || 'Almacén Central'}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground font-mono">
                                                        {po.issue_date}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground font-mono">
                                                        {po.delivery_deadline || 'Inmediato'}
                                                    </TableCell>
                                                    <TableCell className="font-mono font-black text-sm text-foreground">
                                                        ${Number(po.total_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={`text-[10px] font-bold uppercase ${po.status === 'recibida_total'
                                                                ? 'bg-emerald-600 text-white'
                                                                : po.status === 'en_transito'
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-amber-500 text-zinc-950'
                                                                }`}
                                                        >
                                                            {po.status === 'recibida_total' && 'Recibida en Sitio'}
                                                            {po.status === 'en_transito' && 'En Tránsito'}
                                                            {po.status === 'emitida' && 'Emitida a Proveedor'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {po.status !== 'recibida_total' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    const ok = await confirmModal({
                                                                        title: `Recepcionar Orden ${po.code}`,
                                                                        description: `¿Marcar la orden ${po.code} como recibida en almacén? El inventario se cargará automáticamente en el almacén de destino.`,
                                                                        confirmText: 'Sí, recepcionar stock',
                                                                        variant: 'default',
                                                                    });
                                                                    if (ok) {
                                                                        router.patch(`/purchases/orders/${po.id}/status`, {
                                                                            status: 'recibida_total',
                                                                            notes: 'Mercancía descargada y verificada contra guía del proveedor.',
                                                                        });
                                                                    }
                                                                }}
                                                                className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                                                            >
                                                                <PackageCheck className="size-3.5 mr-1" />
                                                                Recepcionar Stock
                                                            </Button>
                                                        )}
                                                        {po.status === 'recibida_total' && (
                                                            <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                                                                <CheckCircle2 className="size-3.5" /> Ingresada
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                <div className="p-4 border-t border-border/60">
                                    <DataTablePagination
                                        currentPage={ordersPagination.currentPage}
                                        totalPages={ordersPagination.totalPages}
                                        totalItems={ordersPagination.totalItems}
                                        fromIndex={ordersPagination.fromIndex}
                                        toIndex={ordersPagination.toIndex}
                                        perPage={ordersPagination.perPage}
                                        onPageChange={ordersPagination.goToPage}
                                        onPerPageChange={ordersPagination.setPerPage}
                                        itemLabel="órdenes de compra"
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* TAB 3: DIRECTORIO DE PROVEEDORES */}
            {tab === 'proveedores' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                            Base de proveedores certificados para cotización de insumos, cabillas, agregados, cemento y tuberías.
                        </p>
                        <Button
                            size="sm"
                            onClick={openCreateSupplierDialog}
                            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs"
                        >
                            <Plus className="size-3.5 mr-1" />
                            Nuevo Proveedor
                        </Button>
                    </div>

                    {isLoading ? (
                        <TableSkeleton columns={6} rows={suppliersPagination.perPage} />
                    ) : (
                        <div className="space-y-4">
                            <div className="min-h-[350px]">
                                {suppliersPagination.isChangingPage ? (
                                    <TableSkeleton columns={6} rows={suppliersPagination.perPage} />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {suppliersPagination.paginatedItems.map((sup) => (
                                            <Card key={sup.id} className="border border-border/70 shadow-xs hover:border-border transition-all bg-card">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                                                {sup.rif}
                                                            </span>
                                                            <CardTitle className="text-sm font-extrabold text-foreground mt-0.5">
                                                                {sup.business_name}
                                                            </CardTitle>
                                                            {sup.commercial_name && (
                                                                <CardDescription className="text-xs">
                                                                    {sup.commercial_name}
                                                                </CardDescription>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditSupplierDialog(sup)}
                                                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                                            title="Editar datos del proveedor"
                                                        >
                                                            <Edit2 className="size-3.5 text-amber-500" />
                                                        </button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-2.5 text-xs">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="size-3.5 shrink-0 text-amber-500" />
                                                        <span>{sup.city} {sup.address ? `• ${sup.address}` : ''}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Phone className="size-3.5 shrink-0 text-emerald-500" />
                                                        <span>{sup.phone}</span>
                                                    </div>
                                                    {sup.contact_person && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Users className="size-3.5 shrink-0 text-blue-500" />
                                                            <span>{sup.contact_person}</span>
                                                        </div>
                                                    )}

                                                    <div className="pt-2 border-t border-border/40 space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Especialidad:</span>
                                                            <span className="font-bold text-foreground">{sup.specialty || 'General'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Condición Pago:</span>
                                                            <span className="font-semibold text-foreground">{sup.payment_terms}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between">
                                                    <span>{sup.quotations_count || 0} Cotizaciones</span>
                                                    <span>{sup.purchase_orders_count || 0} Órdenes O/C</span>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <DataTablePagination
                                currentPage={suppliersPagination.currentPage}
                                totalPages={suppliersPagination.totalPages}
                                totalItems={suppliersPagination.totalItems}
                                fromIndex={suppliersPagination.fromIndex}
                                toIndex={suppliersPagination.toIndex}
                                perPage={suppliersPagination.perPage}
                                onPageChange={suppliersPagination.goToPage}
                                onPerPageChange={suppliersPagination.setPerPage}
                                itemLabel="proveedores"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 1: NUEVA SOLICITUD DE COMPRA */}
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogContent className="w-[96vw] max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <ShoppingCart className="size-5 text-amber-500" />
                            Nueva Solicitud de Compra (Requerimiento de Procura)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Inicia un proceso de compra para abrir el Cuadro Comparativo de 3 Presupuestos de proveedores.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRequestSubmit} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="req_title" className="text-xs font-semibold">
                                Título del Requerimiento de Compra *
                            </Label>
                            <Input
                                id="req_title"
                                value={requestForm.data.title}
                                onChange={(e) => requestForm.setData('title', e.target.value)}
                                placeholder="Ej: Adquisición de Cabillas y Mallas para Losa de Fundaciones"
                                className="text-xs"
                                required
                            />
                            <InputError message={requestForm.errors.title} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="req_dest_proj" className="text-xs font-semibold">Obra de Destino</Label>
                                <select
                                    id="req_dest_proj"
                                    value={requestForm.data.project_id}
                                    onChange={(e) => requestForm.setData('project_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Compra para Stock General (Almacén)</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.code}] {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="req_dest_wh" className="text-xs font-semibold">Almacén de Recepción *</Label>
                                <select
                                    id="req_dest_wh"
                                    value={requestForm.data.warehouse_id}
                                    onChange={(e) => requestForm.setData('warehouse_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} {w.is_central ? '(Sede Central)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="req_prio" className="text-xs font-semibold">Prioridad Operativa *</Label>
                                <select
                                    id="req_prio"
                                    value={requestForm.data.priority}
                                    onChange={(e) => requestForm.setData('priority', e.target.value as 'baja' | 'normal' | 'urgente')}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    <option value="normal">Normal (según cronograma)</option>
                                    <option value="urgente">Urgente (detiene frente de obra)</option>
                                    <option value="baja">Baja (acopio anticipado)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="req_just" className="text-xs font-semibold">Justificación / Frente de Trabajo</Label>
                            <textarea
                                id="req_just"
                                rows={2}
                                value={requestForm.data.justification}
                                onChange={(e) => requestForm.setData('justification', e.target.value)}
                                placeholder="Indica el capítulo constructivo o justificación técnica de la compra..."
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {/* Lista de Ítems a Comprar */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Insumos a Cotizar con Proveedores
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addRequestItem}
                                    className="text-xs h-7"
                                >
                                    <Plus className="size-3 mr-1" />
                                    Agregar Insumo
                                </Button>
                            </div>

                            {requestForm.data.items.map((it, idx) => {
                                const mat = materials.find((m) => String(m.id) === it.material_id);
                                const unitInfo = getMaterialUnitInfo(mat?.unit, mat?.name);
                                return (
                                    <div key={idx} className="flex items-center gap-2 min-w-0 w-full">
                                        <SearchableMaterialSelect
                                            materials={materials}
                                            value={it.material_id}
                                            onChange={(newId) => {
                                                const next = [...requestForm.data.items];
                                                next[idx].material_id = newId;
                                                const found = materials.find((m) => String(m.id) === newId);
                                                if (found) next[idx].target_price_usd = String(found.estimated_price_usd || '');
                                                const uInfo = getMaterialUnitInfo(found?.unit, found?.name);
                                                next[idx].quantity = sanitizeQuantity(String(next[idx].quantity || ''), uInfo.isIntegerOnly);
                                                requestForm.setData('items', next);
                                            }}
                                            placeholder="Buscar insumo por código o nombre..."
                                            className="flex-1 min-w-0"
                                        />

                                        <div className="relative flex items-center shrink-0 w-32 sm:w-36">
                                            <Input
                                                type="text"
                                                inputMode={unitInfo.isIntegerOnly ? 'numeric' : 'decimal'}
                                                value={it.quantity}
                                                onChange={(e) => {
                                                    const next = [...requestForm.data.items];
                                                    next[idx].quantity = sanitizeQuantity(e.target.value, unitInfo.isIntegerOnly);
                                                    requestForm.setData('items', next);
                                                }}
                                                onKeyDown={(e) => handleQuantityKeyDown(e, unitInfo.isIntegerOnly)}
                                                placeholder={unitInfo.placeholder}
                                                className="w-full text-xs h-9 pr-14 font-semibold"
                                                required
                                            />
                                            <span className="absolute right-2 px-1 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none truncate max-w-[48px]" title={unitInfo.humanName}>
                                                {unitInfo.shortSymbol}
                                            </span>
                                        </div>

                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={it.target_price_usd}
                                            onChange={(e) => {
                                                const next = [...requestForm.data.items];
                                                next[idx].target_price_usd = e.target.value;
                                                requestForm.setData('items', next);
                                            }}
                                            placeholder="P.U. Meta ($)"
                                            className="w-24 sm:w-28 text-xs h-9 shrink-0"
                                        />

                                        {requestForm.data.items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRequestItem(idx)}
                                                className="size-8 p-0 text-rose-500 hover:text-rose-600 shrink-0"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRequestDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={requestForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {requestForm.processing && <Spinner className="mr-2" />}
                                Crear Solicitud y Abrir Cuadro
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: ANEXAR COTIZACIÓN A CUADRO COMPARATIVO */}
            <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
                <DialogContent className="w-[96vw] max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <FileSpreadsheet className="size-5 text-amber-500" />
                            Anexar Cotización de Proveedor (Cuadro Comparativo {activeRequestForQuotation?.code})
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Registra el presupuesto formal enviado por el proveedor con sus condiciones de despacho y precios unitarios.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuotationSubmit} className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="cot_sup" className="text-xs font-semibold">Proveedor Ofertante *</Label>
                                <select
                                    id="cot_sup"
                                    value={quotationForm.data.supplier_id}
                                    onChange={(e) => quotationForm.setData('supplier_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                                    required
                                >
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.business_name} ({s.rif})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="cot_num" className="text-xs font-semibold">No. de Cotización / Factura Proforma *</Label>
                                <Input
                                    id="cot_num"
                                    value={quotationForm.data.quotation_number}
                                    onChange={(e) => quotationForm.setData('quotation_number', e.target.value)}
                                    placeholder="COT-2026-9481"
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="cot_validity" className="text-xs font-semibold">Días de Validez de Oferta *</Label>
                                <Input
                                    id="cot_validity"
                                    type="number"
                                    min="1"
                                    value={quotationForm.data.validity_days}
                                    onChange={(e) => quotationForm.setData('validity_days', Number(e.target.value))}
                                    className="text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cot_pay" className="text-xs font-semibold">Condición de Pago *</Label>
                                <Input
                                    id="cot_pay"
                                    value={quotationForm.data.payment_condition}
                                    onChange={(e) => quotationForm.setData('payment_condition', e.target.value)}
                                    placeholder="Ej: Contado, Crédito 15 días, 50% anticipo"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="cot_time" className="text-xs font-semibold">Tiempo de Entrega *</Label>
                                <Input
                                    id="cot_time"
                                    value={quotationForm.data.delivery_time}
                                    onChange={(e) => quotationForm.setData('delivery_time', e.target.value)}
                                    placeholder="Ej: 24 horas, 3 días hábiles"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="cot_place" className="text-xs font-semibold">Lugar de Entrega *</Label>
                                <Input
                                    id="cot_place"
                                    value={quotationForm.data.delivery_place}
                                    onChange={(e) => quotationForm.setData('delivery_place', e.target.value)}
                                    placeholder="Ej: Puesto en Obra, Retiro en Proveedor"
                                    className="text-xs"
                                    required
                                />
                            </div>
                        </div>

                        {/* Precios Unitarios para los Ítems Requeridos */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Precios Unitarios Cotizados por Ítem ($ USD)
                            </Label>

                            <div className="space-y-2">
                                {activeRequestForQuotation?.items.map((item, idx) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="flex-1">
                                            <div className="font-bold text-foreground">
                                                [{item.material?.code}] {item.material?.name}
                                            </div>
                                            <div className="text-muted-foreground text-[11px]">
                                                Cantidad solicitada: <strong>{item.quantity} {item.material?.unit?.symbol}</strong>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Precio Unitario ($):</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={quotationForm.data.items[idx]?.unit_price_usd || ''}
                                                onChange={(e) => {
                                                    const next = [...quotationForm.data.items];
                                                    next[idx].unit_price_usd = e.target.value;
                                                    quotationForm.setData('items', next);
                                                }}
                                                className="w-28 text-xs font-mono font-bold"
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsQuotationDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={quotationForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {quotationForm.processing && <Spinner className="mr-2" />}
                                Guardar Cotización en el Cuadro
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: EVALUACIÓN Y APROBACIÓN GERENCIAL */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            <Award className="size-5" />
                            Aprobación Gerencial del Cuadro Comparativo
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecciona la oferta ganadora con base en precio, tiempo de entrega y condiciones de pago para autorizar la emisión de la Orden de Compra.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApproveSubmit} className="space-y-4 pt-1">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Seleccionar Proveedor / Cotización Ganadora *</Label>
                            <div className="space-y-2">
                                {activeRequestForApproval?.quotations.map((q) => (
                                    <label
                                        key={q.id}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${approveForm.data.selected_quotation_id === String(q.id)
                                            ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                            : 'border-border/70 hover:bg-muted bg-card'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="selected_quote"
                                                value={q.id}
                                                checked={approveForm.data.selected_quotation_id === String(q.id)}
                                                onChange={(e) => approveForm.setData('selected_quotation_id', e.target.value)}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <div className="font-bold text-xs text-foreground">
                                                    {q.supplier?.business_name} ({q.quotation_number})
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Pago: {q.payment_condition} • Entrega: {q.delivery_time} • {q.delivery_place}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-mono font-black text-foreground">
                                                ${Number(q.total_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase">Monto Total</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="appr_notes" className="text-xs font-semibold">
                                Observaciones / Visto Bueno de Gerencia
                            </Label>
                            <textarea
                                id="appr_notes"
                                rows={2}
                                value={approveForm.data.approval_notes}
                                onChange={(e) => approveForm.setData('approval_notes', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsApproveDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={approveForm.processing || !approveForm.data.selected_quotation_id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {approveForm.processing && <Spinner className="mr-2" />}
                                Aprobar Cuadro Comparativo
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: EMISIÓN DE ORDEN DE COMPRA OFICIAL (O/C) */}
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <FileCheck className="size-5 text-amber-500" />
                            Emitir Orden de Compra Oficial (BANPE O/C)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Genera la orden de compra numerada para remitir formalmente al proveedor adjudicado.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleOrderSubmit} className="space-y-4 pt-1">
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                            <div className="font-bold text-foreground">
                                Proveedor Adjudicado: {activeRequestForOrder?.selected_quotation?.supplier?.business_name}
                            </div>
                            <div className="text-muted-foreground flex justify-between">
                                <span>Cotización No: {activeRequestForOrder?.selected_quotation?.quotation_number}</span>
                                <span className="font-mono font-bold text-foreground">
                                    Total: ${Number(activeRequestForOrder?.selected_quotation?.total_usd).toFixed(2)} USD
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="po_deadline" className="text-xs font-semibold">Fecha Límite de Entrega *</Label>
                                <Input
                                    id="po_deadline"
                                    type="date"
                                    value={orderForm.data.delivery_deadline}
                                    onChange={(e) => orderForm.setData('delivery_deadline', e.target.value)}
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="po_ship" className="text-xs font-semibold">Instrucciones de Despacho y Flete</Label>
                                <Input
                                    id="po_ship"
                                    value={orderForm.data.shipping_instructions}
                                    onChange={(e) => orderForm.setData('shipping_instructions', e.target.value)}
                                    placeholder="Ej: Entregar a pie de obra en horario matutino..."
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="po_notes" className="text-xs font-semibold">Condiciones Especiales / Cláusulas</Label>
                            <textarea
                                id="po_notes"
                                rows={2}
                                value={orderForm.data.notes}
                                onChange={(e) => orderForm.setData('notes', e.target.value)}
                                placeholder="Condiciones de recepción, rechazo por inconformidad, etc..."
                                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOrderDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={orderForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {orderForm.processing && <Spinner className="mr-2" />}
                                Emitir Orden de Compra
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 5: REGISTRAR / EDITAR PROVEEDOR */}
            <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Store className="size-5 text-amber-500" />
                            {editingSupplier ? 'Editar Ficha del Proveedor' : 'Registrar Nuevo Proveedor en BANPE'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Homologa un nuevo contratista o distribuidor comercial para el envío de solicitudes y órdenes de compra.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSupplierSubmit} className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_rif" className="text-xs font-semibold">RIF Oficial *</Label>
                                <Input
                                    id="sup_rif"
                                    value={supplierForm.data.rif}
                                    onChange={(e) => supplierForm.setData('rif', e.target.value.toUpperCase())}
                                    placeholder="J-30987456-1"
                                    className="font-mono text-xs uppercase"
                                    required
                                />
                                <InputError message={supplierForm.errors.rif} />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="sup_name" className="text-xs font-semibold">Razón Social *</Label>
                                <Input
                                    id="sup_name"
                                    value={supplierForm.data.business_name}
                                    onChange={(e) => supplierForm.setData('business_name', e.target.value)}
                                    placeholder="Ej: Distribuidora de Aceros del Centro C.A."
                                    className="text-xs"
                                    required
                                />
                                <InputError message={supplierForm.errors.business_name} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_contact" className="text-xs font-semibold">Contacto de Ventas</Label>
                                <Input
                                    id="sup_contact"
                                    value={supplierForm.data.contact_person}
                                    onChange={(e) => supplierForm.setData('contact_person', e.target.value)}
                                    placeholder="Ej: Lic. Carlos Silva"
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_phone" className="text-xs font-semibold">Teléfono Directo *</Label>
                                <Input
                                    id="sup_phone"
                                    value={supplierForm.data.phone}
                                    onChange={(e) => supplierForm.setData('phone', e.target.value)}
                                    placeholder="+58 241-8714022"
                                    className="text-xs"
                                    required
                                />
                                <InputError message={supplierForm.errors.phone} />
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_email" className="text-xs font-semibold">Correo Electrónico</Label>
                                <Input
                                    id="sup_email"
                                    type="email"
                                    value={supplierForm.data.email}
                                    onChange={(e) => supplierForm.setData('email', e.target.value)}
                                    placeholder="ventas@proveedor.com"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_city" className="text-xs font-semibold">Ciudad Sede *</Label>
                                <Input
                                    id="sup_city"
                                    value={supplierForm.data.city}
                                    onChange={(e) => supplierForm.setData('city', e.target.value)}
                                    placeholder="Valencia"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_spec" className="text-xs font-semibold">Rubro / Especialidad</Label>
                                <Input
                                    id="sup_spec"
                                    value={supplierForm.data.specialty}
                                    onChange={(e) => supplierForm.setData('specialty', e.target.value)}
                                    placeholder="Ej: Aceros, Concreto, PVC"
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="sup_terms" className="text-xs font-semibold">Términos de Pago *</Label>
                                <Input
                                    id="sup_terms"
                                    value={supplierForm.data.payment_terms}
                                    onChange={(e) => supplierForm.setData('payment_terms', e.target.value)}
                                    placeholder="Contado / Crédito 15 días"
                                    className="text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="sup_bank" className="text-xs font-semibold">Datos Bancarios / Modalidad de Pago</Label>
                            <Input
                                id="sup_bank"
                                value={supplierForm.data.bank_details}
                                onChange={(e) => supplierForm.setData('bank_details', e.target.value)}
                                placeholder="Banesco Cta Cte, Pago Móvil, Zelle o Transferencia Nacional..."
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                                id="sup_active"
                                checked={supplierForm.data.is_active}
                                onCheckedChange={(checked) => supplierForm.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="sup_active" className="text-xs font-medium cursor-pointer">
                                Proveedor homologado activo para cotizaciones
                            </Label>
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSupplierDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={supplierForm.processing}
                                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                            >
                                {supplierForm.processing && <Spinner className="mr-2" />}
                                {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

PurchasesIndex.layout = {
    breadcrumbs,
};

