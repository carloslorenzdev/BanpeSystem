import { Head, router, useForm } from '@inertiajs/react';
import {
    Boxes,
    Building2,
    CheckCircle2,
    DollarSign,
    Download,
    Edit2,
    FileSpreadsheet,
    Layers,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    UploadCloud,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useConfirm } from '@/contexts/confirm-context';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { TableSkeleton, TableBodySkeleton } from '@/components/skeletons';
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

type Category = {
    id: number;
    name: string;
    slug: string;
    description?: string;
};

type Unit = {
    id: number;
    name: string;
    symbol: string;
};

type Material = {
    id: number;
    code: string;
    name: string;
    category_id: number;
    unit_id: number;
    minimum_stock: number | string;
    estimated_price_usd: number | string;
    description?: string;
    is_active: boolean;
    category?: Category;
    unit?: Unit;
};

type Props = {
    materials: Material[];
    categories: Category[];
    units: Unit[];
    filters: {
        search: string;
        category: string;
    };
};

export default function MaterialsIndex({
    materials,
    categories,
    units,
    filters,
}: Props) {
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal } = useConfirm();
    const pagination = useTablePagination({
        items: materials,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || '');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    const importForm = useForm<{
        file: File | null;
        update_existing: boolean;
    }>({
        file: null,
        update_existing: true,
    });

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!importForm.data.file) return;

        importForm.post('/admin/materials/import-maprex', {
            forceFormData: true,
            onSuccess: () => {
                setIsImportDialogOpen(false);
                importForm.reset();
            },
        });
    };

    const form = useForm({
        code: '',
        name: '',
        category_id: categories[0]?.id || '',
        unit_id: units[0]?.id || '',
        minimum_stock: 0,
        estimated_price_usd: 0,
        description: '',
        is_active: true,
    });

    // Abrir modal de creación
    const openCreateDialog = () => {
        setEditingMaterial(null);
        form.setData({
            code: '',
            name: '',
            category_id: categories[0]?.id || '',
            unit_id: units[0]?.id || '',
            minimum_stock: 10,
            estimated_price_usd: 0,
            description: '',
            is_active: true,
        });
        form.clearErrors();
        setIsDialogOpen(true);
    };

    // Abrir modal de edición
    const openEditDialog = (mat: Material) => {
        setEditingMaterial(mat);
        form.setData({
            code: mat.code,
            name: mat.name,
            category_id: mat.category_id,
            unit_id: mat.unit_id,
            minimum_stock: Number(mat.minimum_stock),
            estimated_price_usd: Number(mat.estimated_price_usd),
            description: mat.description || '',
            is_active: mat.is_active,
        });
        form.clearErrors();
        setIsDialogOpen(true);
    };

    // Enviar formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMaterial) {
            form.put(`/admin/materials/${editingMaterial.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            form.post('/admin/materials', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    // Eliminar material
    const handleDelete = async (id: number, name: string) => {
        const ok = await confirmModal({
            title: `¿Retirar "${name}" del catálogo?`,
            description: `¿Estás seguro de que deseas retirar este insumo del catálogo general de materiales?`,
            confirmText: 'Sí, retirar insumo',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/admin/materials/${id}`, { preserveScroll: true });
        }
    };

    // Filtrar búsqueda
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/materials',
            { search, category: selectedCategory },
            { preserveState: true, replace: true }
        );
    };

    const activeCount = materials.filter((m) => m.is_active).length;
    const avgPrice =
        materials.length > 0
            ? (
                materials.reduce(
                    (acc, m) => acc + Number(m.estimated_price_usd || 0),
                    0
                ) / materials.length
            ).toFixed(2)
            : '0.00';

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Catálogo de Insumos y Materiales" />

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Catálogo Maestro de Insumos y Materiales
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Base centralizada compatible con Maprex para requisiciones en obra, compras y control de almacén.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        className="font-medium text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => setIsImportDialogOpen(true)}
                    >
                        <FileSpreadsheet className="size-4 mr-1.5" />
                        Importar Maprex (Excel)
                    </Button>
                    <Button
                        onClick={openCreateDialog}
                        className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shadow-xs"
                    >
                        <Plus className="size-4 mr-1.5" />
                        Nuevo Insumo
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Insumos Registrados
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                            <Layers className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{materials.length} Ítems</div>
                        <p className="text-xs text-muted-foreground mt-1">{activeCount} habilitados para obra</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Categorías
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                            <Boxes className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {categories.length} Familias
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Estructuradas por rubro</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Precio Ref. Promedio
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <DollarSign className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            ${avgPrice} USD
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Costo unitario referencial</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Unidades de Medida
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                            <Building2 className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {units.length} Unidades
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Sacos, m³, barras, kg, etc.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtro y Búsqueda */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código (ej: CEM-001) o nombre del material..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10"
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                router.get(
                                    '/admin/materials',
                                    { search, category: e.target.value },
                                    { preserveState: true, replace: true }
                                );
                            }}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        <Button type="submit" variant="secondary" className="h-10 shrink-0 w-full sm:w-auto">
                            Filtrar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Tabla de Materiales */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base font-bold">Insumos en Catálogo</CardTitle>
                        <CardDescription>Parámetros de compra, stock mínimo y costo estimado</CardDescription>
                    </div>
                    <Badge variant="outline">{materials.length} Materiales</Badge>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <TableSkeleton columns={8} rows={pagination.perPage} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[110px]">Cód. Maprex</TableHead>
                                        <TableHead>Descripción del Material</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Stock Mínimo</TableHead>
                                        <TableHead>Precio Ref. ($)</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagination.isChangingPage ? (
                                        <TableBodySkeleton columns={8} rows={pagination.perPage} />
                                    ) : pagination.totalItems === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No se encontraron insumos con los filtros seleccionados.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pagination.paginatedItems.map((m) => (
                                            <TableRow key={m.id} className="hover:bg-muted/50">
                                                <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                                    {m.code}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="font-bold text-foreground">{m.name}</div>
                                                    {m.description && (
                                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                                            {m.description}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
                                                        {m.category?.name || 'General'}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-xs font-semibold">
                                                    {m.unit?.name} ({m.unit?.symbol})
                                                </TableCell>

                                                <TableCell className="text-xs font-mono font-medium">
                                                    {Number(m.minimum_stock).toLocaleString()} {m.unit?.symbol}
                                                </TableCell>

                                                <TableCell className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    ${Number(m.estimated_price_usd).toFixed(2)} USD
                                                </TableCell>

                                                <TableCell>
                                                    {m.is_active ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                            <CheckCircle2 className="size-3 mr-1" />
                                                            Activo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            <XCircle className="size-3 mr-1" />
                                                            Pausado
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditDialog(m)}
                                                            className="h-8 w-8 p-0"
                                                            title="Editar insumo"
                                                        >
                                                            <Edit2 className="size-4" />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(m.id, m.name)}
                                                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                            title="Eliminar insumo"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            <DataTablePagination
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                fromIndex={pagination.fromIndex}
                                toIndex={pagination.toIndex}
                                perPage={pagination.perPage}
                                onPageChange={pagination.goToPage}
                                onPerPageChange={pagination.setPerPage}
                                itemLabel="insumos"
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Crear / Editar Material */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {editingMaterial ? 'Editar Insumo del Catálogo' : 'Registrar Nuevo Insumo'}
                        </DialogTitle>
                        <DialogDescription>
                            Configura el código Maprex, unidad y precio estimado de compra en USD.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Código y Nombre */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5 sm:col-span-1">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    Código Maprex *
                                </Label>
                                <Input
                                    id="code"
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                                    placeholder="CEM-001"
                                    className="font-mono uppercase"
                                    required
                                />
                                <InputError message={form.errors.code} />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="name" className="text-xs font-semibold">
                                    Nombre del Insumo / Material *
                                </Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Ej: Cemento Gris Portland Tipo I"
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>
                        </div>

                        {/* Categoría y Unidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="category_id" className="text-xs font-semibold">
                                    Categoría de Obra *
                                </Label>
                                <select
                                    id="category_id"
                                    value={form.data.category_id}
                                    onChange={(e) => form.setData('category_id', Number(e.target.value))}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.category_id} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="unit_id" className="text-xs font-semibold">
                                    Unidad de Medida *
                                </Label>
                                <select
                                    id="unit_id"
                                    value={form.data.unit_id}
                                    onChange={(e) => form.setData('unit_id', Number(e.target.value))}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                >
                                    {units.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.symbol})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.unit_id} />
                            </div>
                        </div>

                        {/* Stock Mínimo y Precio USD */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="minimum_stock" className="text-xs font-semibold">
                                    Stock Mínimo de Seguridad *
                                </Label>
                                <Input
                                    id="minimum_stock"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.data.minimum_stock}
                                    onChange={(e) => form.setData('minimum_stock', Number(e.target.value))}
                                    required
                                />
                                <InputError message={form.errors.minimum_stock} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="estimated_price_usd" className="text-xs font-semibold">
                                    Precio Ref. de Compra ($ USD) *
                                </Label>
                                <Input
                                    id="estimated_price_usd"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.data.estimated_price_usd}
                                    onChange={(e) => form.setData('estimated_price_usd', Number(e.target.value))}
                                    required
                                />
                                <InputError message={form.errors.estimated_price_usd} />
                            </div>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs font-semibold">
                                Especificación Técnica / Observaciones
                            </Label>
                            <Input
                                id="description"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                placeholder="Especificaciones de resistencia, dimensiones o normas aplicables..."
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        {/* Estado Activo */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                                id="mat_is_active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => form.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="mat_is_active" className="text-xs font-medium cursor-pointer">
                                Insumo activo y disponible para requisiciones en obra
                            </Label>
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
                                {editingMaterial ? 'Guardar Cambios' : 'Registrar Insumo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL: IMPORTAR INSUMOS MAPREX */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <FileSpreadsheet className="size-5 text-amber-500" />
                            Importar Insumos y Materiales desde Maprex
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Carga tu catálogo maestro de insumos exportado desde Maprex en formato Excel (.xls / .xml) o archivo delimitado por comas (.csv).
                        </DialogDescription>
                    </DialogHeader>

                    {/* Banner de descarga de plantillas oficiales */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                        <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                            <FileSpreadsheet className="size-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>
                                ¿Necesitas la estructura estándar para cargar o actualizar tus insumos? Descarga la plantilla oficial con ejemplos de partidas y rubros de BANPE C.A.:
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <a
                                href="/admin/materials/template-maprex?format=csv"
                                download="Catalogo_Maprex_Ejemplo_BANPE.csv"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs shadow-xs transition-colors"
                            >
                                <Download className="size-3 text-amber-500" />
                                Descargar Plantilla (.CSV)
                            </a>
                            <a
                                href="/admin/materials/template-maprex?format=xls"
                                download="Catalogo_Maprex_Ejemplo_BANPE.xls"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs shadow-xs transition-colors"
                            >
                                <Download className="size-3 text-emerald-500" />
                                Descargar Plantilla (.XLS Excel)
                            </a>
                        </div>
                    </div>

                    <form onSubmit={handleImportSubmit} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="maprex_catalog_file" className="text-xs font-semibold">
                                Seleccionar Archivo Maprex (.csv, .xls, .xml, .txt) *
                            </Label>
                            <Input
                                id="maprex_catalog_file"
                                type="file"
                                accept=".csv,.txt,.xls,.xml"
                                onChange={(e) => importForm.setData('file', e.target.files?.[0] || null)}
                                className="text-xs cursor-pointer"
                                required
                            />
                            <InputError message={importForm.errors.file} />
                        </div>

                        <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                            <Checkbox
                                id="update_existing_checkbox"
                                checked={importForm.data.update_existing}
                                onCheckedChange={(checked) => importForm.setData('update_existing', checked === true)}
                            />
                            <Label htmlFor="update_existing_checkbox" className="text-xs text-foreground cursor-pointer font-medium">
                                Actualizar precio referencial y unidad si el código de material ya existe en el catálogo
                            </Label>
                        </div>

                        <DialogFooter className="pt-3">
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
                                Procesar e Importar al Catálogo
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

MaterialsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel de Control', href: '/dashboard' },
        { title: 'Catálogo de Insumos', href: '/admin/materials' },
    ],
};

