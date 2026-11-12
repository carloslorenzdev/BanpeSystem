import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Edit2,
    MessageSquare,
    Phone,
    Plus,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
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
import type { Role, User } from '@/types/auth';

type Props = {
    users: (User & { role: Role | null })[];
    roles: Role[];
    filters: {
        search: string;
        role: string;
    };
};

export default function UsersIndex({ users, roles, filters }: Props) {
    const { isLoading } = usePageLoading();
    const { confirm: confirmModal } = useConfirm();
    const pagination = useTablePagination({
        items: users,
        initialPerPage: 10,
    });
    const [search, setSearch] = useState(filters.search || '');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState(filters.role || '');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const form = useForm({
        name: '',
        email: '',
        phone: '',
        position: '',
        role_id: roles[0]?.id || '',
        password: '',
        is_active: true,
    });

    // Abrir modal para crear
    const openCreateDialog = () => {
        setEditingUser(null);
        form.setData({
            name: '',
            email: '',
            phone: '+58',
            position: '',
            role_id: roles[0]?.id || '',
            password: '',
            is_active: true,
        });
        form.clearErrors();
        setIsDialogOpen(true);
    };

    // Abrir modal para editar
    const openEditDialog = (user: User) => {
        setEditingUser(user);
        form.setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            position: user.position || '',
            role_id: user.role_id || (user.role?.id as number) || roles[0]?.id,
            password: '',
            is_active: user.is_active !== false,
        });
        form.clearErrors();
        setIsDialogOpen(true);
    };

    // Enviar formulario (Crear o Editar)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            form.put(`/admin/users/${editingUser.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            form.post('/admin/users', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    };

    // Alternar estado activo/inactivo
    const toggleStatus = (userId: number) => {
        router.patch(`/admin/users/${userId}/toggle`, {}, { preserveScroll: true });
    };

    // Eliminar usuario
    const handleDelete = async (userId: number, userName: string) => {
        const ok = await confirmModal({
            title: `¿Eliminar al usuario "${userName}"?`,
            description: `¿Estás seguro de que deseas eliminar permanentemente al usuario "${userName}" del sistema BANPE?`,
            confirmText: 'Sí, eliminar usuario',
            variant: 'destructive',
        });
        if (ok) {
            router.delete(`/admin/users/${userId}`, { preserveScroll: true });
        }
    };

    // Filtrar búsqueda
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/users',
            { search, role: selectedRoleFilter },
            { preserveState: true, replace: true }
        );
    };

    // Color del badge según el rol
    const getRoleBadgeClass = (slug?: string) => {
        switch (slug) {
            case 'admin':
                return 'bg-zinc-800 text-white';
            case 'gerente_proyecto':
                return 'bg-purple-600 text-white';
            case 'coordinador_proyecto':
                return 'bg-blue-600 text-white';
            case 'almacen':
                return 'bg-amber-600 text-white';
            case 'compras':
                return 'bg-emerald-600 text-white';
            case 'gerente_compras':
                return 'bg-yellow-600 text-white';
            case 'ingeniero_residente':
                return 'bg-orange-600 text-white';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const activeCount = users.filter((u) => u.is_active !== false).length;
    const whatsappCount = users.filter((u) => Boolean(u.phone)).length;

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title="Usuarios y Roles" />

            {/* Cabecera del Módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Usuarios y Control de Acceso (RBAC)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Administra las cuentas de usuario, asignación de roles operativos y números de WhatsApp para notificaciones.
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shrink-0 shadow-xs"
                >
                    <Plus className="size-4 mr-1.5" />
                    Nuevo Usuario
                </Button>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Registrados
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                            <Users className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{users.length} Cuentas</div>
                        <p className="text-xs text-muted-foreground mt-1">En base de datos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Usuarios Activos
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <UserCheck className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {activeCount} Habilitados
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Acceso con clave</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Roles Operativos
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                            <Shield className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                            {roles.length} Niveles
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Definidos en norma ISO</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            WhatsApp Enlazado
                        </CardTitle>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <MessageSquare className="size-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {whatsappCount} Números
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Listos para recibir alertas</p>
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
                                placeholder="Buscar por nombre, correo o cargo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10"
                            />
                        </div>

                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => {
                                setSelectedRoleFilter(e.target.value);
                                router.get(
                                    '/admin/users',
                                    { search, role: e.target.value },
                                    { preserveState: true, replace: true }
                                );
                            }}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
                        >
                            <option value="">Todos los Roles</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.slug}>
                                    {r.name}
                                </option>
                            ))}
                        </select>

                        <Button type="submit" variant="secondary" className="h-10 shrink-0 w-full sm:w-auto">
                            Buscar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Tabla de Usuarios */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base font-bold">Listado Oficial de Personal</CardTitle>
                        <CardDescription>Cuentas registradas con permisos en el sistema</CardDescription>
                    </div>
                    <Badge variant="outline">{users.length} Usuarios</Badge>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <TableSkeleton columns={6} rows={pagination.perPage} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre y Correo</TableHead>
                                        <TableHead>Cargo / Posición</TableHead>
                                        <TableHead>Rol Operativo</TableHead>
                                        <TableHead>Teléfono (WhatsApp)</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagination.isChangingPage ? (
                                        <TableBodySkeleton columns={6} rows={pagination.perPage} />
                                    ) : pagination.totalItems === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No se encontraron usuarios con los criterios de búsqueda.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pagination.paginatedItems.map((u) => (
                                            <TableRow key={u.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-9 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-border">
                                                            {u.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="font-bold text-foreground truncate">{u.name}</div>
                                                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-xs font-medium text-foreground">
                                                    {u.position || 'No especificado'}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge className={`text-[11px] font-semibold ${getRoleBadgeClass(u.role?.slug)}`}>
                                                        {u.role?.name || 'Sin Rol'}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {u.phone ? (
                                                        <a
                                                            href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                                                        >
                                                            <MessageSquare className="size-3.5 text-emerald-500" />
                                                            {u.phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sin WhatsApp</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {u.is_active !== false ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                            <CheckCircle2 className="size-3 mr-1" />
                                                            Activo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            <XCircle className="size-3 mr-1" />
                                                            Inactivo
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditDialog(u)}
                                                            className="h-8 w-8 p-0"
                                                            title="Editar usuario"
                                                        >
                                                            <Edit2 className="size-4" />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => toggleStatus(u.id)}
                                                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                                            title={u.is_active !== false ? 'Desactivar cuenta' : 'Activar cuenta'}
                                                        >
                                                            {u.is_active !== false ? (
                                                                <ShieldAlert className="size-4" />
                                                            ) : (
                                                                <ShieldCheck className="size-4" />
                                                            )}
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(u.id, u.name)}
                                                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                            title="Eliminar usuario"
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
                                itemLabel="usuarios"
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Crear / Editar Usuario */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingUser
                                ? 'Actualiza los datos personales, rol y estado de este colaborador.'
                                : 'Ingresa la información requerida para habilitar el acceso a la plataforma.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Nombre */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-semibold">
                                Nombre y Apellido *
                            </Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Ej: Ing. Manuel Gómez"
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        {/* Correo */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold">
                                Correo Institucional *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="usuario@banpe.com.ve"
                                required
                            />
                            <InputError message={form.errors.email} />
                        </div>

                        {/* Teléfono WhatsApp y Cargo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1">
                                    <Phone className="size-3 text-muted-foreground" />
                                    Teléfono WhatsApp
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="+584121234567"
                                />
                                <InputError message={form.errors.phone} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="position" className="text-xs font-semibold">
                                    Cargo en Obra / Oficina
                                </Label>
                                <Input
                                    id="position"
                                    value={form.data.position}
                                    onChange={(e) => form.setData('position', e.target.value)}
                                    placeholder="Ej: Ing. Residente"
                                />
                                <InputError message={form.errors.position} />
                            </div>
                        </div>

                        {/* Rol */}
                        <div className="space-y-1.5">
                            <Label htmlFor="role_id" className="text-xs font-semibold">
                                Rol del Sistema (Permisos) *
                            </Label>
                            <select
                                id="role_id"
                                value={form.data.role_id}
                                onChange={(e) => form.setData('role_id', Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.role_id} />
                        </div>

                        {/* Contraseña */}
                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-xs font-semibold">
                                {editingUser ? 'Nueva Contraseña (dejar en blanco para conservar)' : 'Contraseña de Acceso *'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                placeholder="••••••••"
                                required={!editingUser}
                            />
                            <InputError message={form.errors.password} />
                        </div>

                        {/* Estado Activo */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                                id="is_active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => form.setData('is_active', checked === true)}
                            />
                            <Label htmlFor="is_active" className="text-xs font-medium cursor-pointer">
                                Usuario activo (permite iniciar sesión en la plataforma)
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
                                {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        { title: 'Panel de Control', href: '/dashboard' },
        { title: 'Usuarios y Roles', href: '/admin/users' },
    ],
};

