import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    BadgeDollarSign,
    Boxes,
    Briefcase,
    Building2,
    CalendarClock,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Clock,
    DollarSign,
    FileSpreadsheet,
    HardHat,
    Layers,
    MessageSquare,
    PackageCheck,
    Plus,
    RefreshCw,
    Send,
    Shield,
    ShoppingCart,
    Truck,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { usePageLoading } from '@/hooks/use-page-loading';
import { DashboardSkeleton } from '@/components/skeletons';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useActiveRole } from '@/hooks/use-active-role';
import { dashboard } from '@/routes';

export default function Dashboard() {
    const { auth } = usePage().props;
    const user = auth.user;
    const { isLoading } = usePageLoading();

    // Estado reactivo sincronizado con el Sidebar en vivo durante demostraciones
    const { role: activeRole, changeRole: setActiveRole } = useActiveRole();

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Head title={`Panel de Control - ${user?.role?.name || 'BANPE'}`} />

            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* BARRA SUPERIOR: Saludo, Rol y Selector Rápido para Demostraciones */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-card via-card to-amber-500/5 p-6 shadow-xs">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Bienvenido, {user?.name.split(' ')[0]}
                        </h1>
                        <Badge
                            className={`px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 ${
                                activeRole === 'admin'
                                    ? 'bg-zinc-800 text-white'
                                    : activeRole === 'gerente_proyecto'
                                      ? 'bg-purple-600 text-white'
                                      : activeRole === 'coordinador_proyecto'
                                        ? 'bg-blue-600 text-white'
                                        : activeRole === 'almacen'
                                          ? 'bg-amber-600 text-white'
                                          : activeRole === 'compras'
                                            ? 'bg-emerald-600 text-white'
                                            : activeRole === 'gerente_compras'
                                              ? 'bg-yellow-600 text-white'
                                              : 'bg-orange-600 text-white'
                            }`}
                        >
                            {activeRole === 'admin' && (
                                <>
                                    <Shield className="size-3.5" />
                                    Administrador General
                                </>
                            )}
                            {activeRole === 'gerente_proyecto' && (
                                <>
                                    <Building2 className="size-3.5" />
                                    Gerente de Proyectos
                                </>
                            )}
                            {activeRole === 'coordinador_proyecto' && (
                                <>
                                    <ClipboardList className="size-3.5" />
                                    Coordinador de Operaciones
                                </>
                            )}
                            {activeRole === 'almacen' && (
                                <>
                                    <Boxes className="size-3.5" />
                                    Jefe de Almacén
                                </>
                            )}
                            {activeRole === 'compras' && (
                                <>
                                    <Briefcase className="size-3.5" />
                                    Analista de Procura
                                </>
                            )}
                            {activeRole === 'gerente_compras' && (
                                <>
                                    <BadgeDollarSign className="size-3.5" />
                                    Gerente de Compras
                                </>
                            )}
                            {activeRole === 'ingeniero_residente' && (
                                <>
                                    <HardHat className="size-3.5" />
                                    Ingeniero Residente (En Obra)
                                </>
                            )}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {user?.position || 'Operaciones BANPE C.A.'} • Estado del Sistema: <span className="font-semibold text-emerald-600 dark:text-emerald-400">En Línea</span>
                    </p>
                </div>

                {/* Simulador de roles en vivo (Excelente para que Carlos y su jefe demuestren cada perfil en la reunión) */}
                <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="size-3 text-amber-500" />
                        Vista de Rol (Para Presentación / Demo):
                    </span>
                    <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
                        {[
                            { slug: 'gerente_proyecto', label: 'Gerente' },
                            { slug: 'coordinador_proyecto', label: 'Coordinador' },
                            { slug: 'almacen', label: 'Almacén' },
                            { slug: 'compras', label: 'Compras' },
                            { slug: 'gerente_compras', label: 'Gte. Compras' },
                            { slug: 'ingeniero_residente', label: 'Residente' },
                            { slug: 'admin', label: 'Administración' },
                        ].map((r) => (
                            <button
                                key={r.slug}
                                type="button"
                                onClick={() => setActiveRole(r.slug)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                    activeRole === r.slug
                                        ? 'bg-background text-foreground shadow-xs font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 1: METRICAS Y KPIS SEGÚN EL ROL */}
            {activeRole === 'gerente_proyecto' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Obras Activas" value="4" description="3 en cronograma, 1 con retraso" icon={Building2} trend="+1 este mes" />
                    <KpiCard title="Inversión en Insumos" value="$184,500 USD" description="Presupuestado vs. Real gastado" icon={DollarSign} trend="91% del total APU" />
                    <KpiCard title="Avance Físico Promedio" value="68.4%" description="Cumplimiento global de fases" icon={CalendarClock} trend="+4.5% esta semana" />
                    <KpiCard title="Despachos en Camino" value="3 Camiones" description="En tránsito hacia frentes de obra" icon={Truck} trend="2 entregas hoy" />
                </div>
            )}

            {activeRole === 'coordinador_proyecto' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Fases Próximas a Vencer" value="2 Fases" description="Vencen en menos de 5 días" icon={CalendarClock} alert />
                    <KpiCard title="Solicitudes a Almacén" value="5 Pendientes" description="Esperando preparación de carga" icon={Boxes} />
                    <KpiCard title="Reasignación entre Obras" value="2 Aprobadas" description="Traspaso de cemento y cabilla" icon={RefreshCw} />
                    <KpiCard title="Alertas WhatsApp Obra" value="14 Enviadas" description="Notificaciones a ingenieros" icon={MessageSquare} />
                </div>
            )}

            {activeRole === 'almacen' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Por Despachar" value="6 Requisiciones" description="Asignadas a camión hoy" icon={Truck} alert />
                    <KpiCard title="Stock Libre (Disponible)" value="320 Sacos" description="Cemento listo para asignar" icon={Boxes} />
                    <KpiCard title="Stock Reservado en Obras" value="850 Sacos" description="Asignados a proyectos activos" icon={Building2} />
                    <KpiCard title="Recepciones de Compras" value="2 Proveedores" description="Por recibir e inspeccionar hoy" icon={PackageCheck} />
                </div>
            )}

            {activeRole === 'compras' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Requerimientos sin Stock" value="5 Solicitudes" description="Derivadas de almacén para cotizar" icon={ShoppingCart} alert />
                    <KpiCard title="Cuadros Comparativos" value="3 En Proceso" description="Carga de 3 cotizaciones" icon={FileSpreadsheet} />
                    <KpiCard title="Órdenes de Compra (O/C)" value="18 Emitidas" description="Mes en curso" icon={CheckCircle2} />
                    <KpiCard title="Directorio Proveedores" value="42 Activos" description="Ferreterías e industriales" icon={Users} />
                </div>
            )}

            {activeRole === 'gerente_compras' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Por Autorizar (Semanal)" value="3 Cuadros" description="Esperando tu visto bueno" icon={CheckSquare} alert />
                    <KpiCard title="Monto Total a Aprobar" value="$4,850 USD" description="Inversión semanal solicitada" icon={DollarSign} />
                    <KpiCard title="Ahorro por Comparativa" value="14.8%" description="Diferencia vs proveedor más caro" icon={ArrowUpRight} />
                    <KpiCard title="Facturas para Pago" value="7 Verificadas" description="Pase listo a administración" icon={PackageCheck} />
                </div>
            )}

            {activeRole === 'ingeniero_residente' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Tu Obra Activa" value="Los Samanes II" description="Fase: Paredes y Friso" icon={HardHat} />
                    <KpiCard title="Camión en Camino" value="1 en Ruta" description="Chofer: José Moreno (Mack)" icon={Truck} alert />
                    <KpiCard title="Materiales Recibidos" value="96.2%" description="Cotejados sin faltantes" icon={CheckCircle2} />
                    <KpiCard title="Requerimientos Extra" value="2 Solicitados" description="Esperando visto bueno" icon={Boxes} />
                </div>
            )}

            {activeRole === 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Usuarios y Roles" value="7 Usuarios" description="Todos los perfiles activos" icon={UserCheck} />
                    <KpiCard title="Proyectos Totales" value="8 Obras" description="Histórico y en ejecución" icon={Building2} />
                    <KpiCard title="Bot WhatsApp Cloud" value="Activo (Meta)" description="1,000 mensajes gratis/mes" icon={MessageSquare} />
                    <KpiCard title="Catálogo de Materiales" value="145 Insumos" description="Sincronizados con Maprex" icon={Layers} />
                </div>
            )}

            {/* SECCIÓN 2: ACCIONES RÁPIDAS Y CONTENIDO PRINCIPAL POR ROL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda y Central: Módulos de Operación */}
                <div className="lg:col-span-2 space-y-6">
                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Plus className="size-4 text-amber-500" />
                                Acciones Rápidas del Puesto
                            </CardTitle>
                            <CardDescription>Operaciones frecuentes para agilizar el flujo de trabajo</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {activeRole === 'gerente_proyecto' && (
                                    <>
                                        <ActionButton icon={Building2} title="Nueva Obra / Proyecto" subtitle="Registrar y asignar residente" />
                                        <ActionButton icon={Layers} title="Importar Maprex" subtitle="Cargar Excel de insumos" />
                                        <ActionButton icon={CalendarClock} title="Cronograma de Fases" subtitle="Definir fechas límites" />
                                    </>
                                )}

                                {activeRole === 'coordinador_proyecto' && (
                                    <>
                                        <ActionButton icon={Boxes} title="Pedir a Almacén" subtitle="Requisición de materiales" />
                                        <ActionButton icon={RefreshCw} title="Transferir Insumos" subtitle="De Obra A hacia Obra B" />
                                        <ActionButton icon={MessageSquare} title="Disparar Alerta WhatsApp" subtitle="Aviso a residente en obra" />
                                    </>
                                )}

                                {activeRole === 'almacen' && (
                                    <>
                                        <ActionButton icon={Truck} title="Nuevo Despacho" subtitle="Asignar chofer y camión" />
                                        <ActionButton icon={PackageCheck} title="Recepción de Compras" subtitle="Cotejar contra factura" />
                                        <ActionButton icon={Boxes} title="Ajuste de Stock Libre" subtitle="Kardex de materiales" />
                                    </>
                                )}

                                {activeRole === 'compras' && (
                                    <>
                                        <ActionButton icon={FileSpreadsheet} title="Nuevo Cuadro 3 Ofertas" subtitle="Comparar proveedores" />
                                        <ActionButton icon={CheckCircle2} title="Emitir Orden de Compra" subtitle="Generar PDF oficial" />
                                        <ActionButton icon={Users} title="Registrar Proveedor" subtitle="Agregar a directorio" />
                                    </>
                                )}

                                {activeRole === 'gerente_compras' && (
                                    <>
                                        <ActionButton icon={CheckSquare} title="Checklist Semanal" subtitle="Aprobar compras en bloque" />
                                        <ActionButton icon={DollarSign} title="Resumen Financiero" subtitle="Inversión por proyecto" />
                                        <ActionButton icon={FileSpreadsheet} title="Pase a Contabilidad" subtitle="Facturas validadas" />
                                    </>
                                )}

                                {activeRole === 'ingeniero_residente' && (
                                    <>
                                        <ActionButton icon={Truck} title="Confirmar Camión" subtitle="Validar lo que llegó a obra" highlight />
                                        <ActionButton icon={Plus} title="Solicitar Material Extra" subtitle="Urgente a coordinación" />
                                        <ActionButton icon={CalendarClock} title="Informe Semanal" subtitle="Cargar % avance de obra" />
                                    </>
                                )}

                                {activeRole === 'admin' && (
                                    <>
                                        <ActionButton icon={Users} title="Gestionar Usuarios" subtitle="Roles y permisos RBAC" />
                                        <ActionButton icon={Layers} title="Catálogo de Insumos" subtitle="Unidades y categorías" />
                                        <ActionButton icon={MessageSquare} title="Probar WhatsApp" subtitle="Enviar mensaje de prueba" />
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* VISTA DETALLADA: TABLA DE DATOS PRINCIPAL SEGÚN EL ROL */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-base font-bold">
                                    {activeRole === 'gerente_proyecto' && 'Obras en Ejecución y Consumo Financiero'}
                                    {activeRole === 'coordinador_proyecto' && 'Cronograma de Fases y Materiales Vinculados'}
                                    {activeRole === 'almacen' && 'Despachos Recientes hacia Obras (Control de Camiones)'}
                                    {activeRole === 'compras' && 'Solicitudes de Materiales y Cuadros Comparativos'}
                                    {activeRole === 'gerente_compras' && 'Checklist de Compras Pendientes de Autorización'}
                                    {activeRole === 'ingeniero_residente' && 'Envíos Programados hacia tu Frente de Obra'}
                                    {activeRole === 'admin' && 'Inventario Global: Stock Libre vs. Reservado en Obras'}
                                </CardTitle>
                                <CardDescription>
                                    Datos actualizados en tiempo real para control de operaciones
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                4 Registros
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            {/* TABLA: GERENTE DE PROYECTO */}
                            {activeRole === 'gerente_proyecto' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Obra / Proyecto</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead>Ing. Residente</TableHead>
                                            <TableHead>Gastado en $</TableHead>
                                            <TableHead>Avance</TableHead>
                                            <TableHead className="text-right">Estatus</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">Residencias Los Samanes II</TableCell>
                                            <TableCell>Caracas, El Recreo</TableCell>
                                            <TableCell>Ing. Andrés Castillo</TableCell>
                                            <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">$64,200</TableCell>
                                            <TableCell>72%</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-500 text-white">En Ejecución</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Galpón Industrial Tinaquillo</TableCell>
                                            <TableCell>Cojedes</TableCell>
                                            <TableCell>Ing. Marcos Peña</TableCell>
                                            <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">$82,000</TableCell>
                                            <TableCell>55%</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-500 text-white">En Ejecución</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Vialidad Sector La Mora</TableCell>
                                            <TableCell>Aragua</TableCell>
                                            <TableCell>Ing. Roberto Silva</TableCell>
                                            <TableCell className="font-medium text-amber-600 dark:text-amber-400">$38,300</TableCell>
                                            <TableCell>34%</TableCell>
                                            <TableCell className="text-right"><Badge variant="outline" className="text-amber-600 border-amber-500">Con Retraso</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}

                            {/* TABLA: COORDINADOR DE PROYECTO */}
                            {activeRole === 'coordinador_proyecto' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fase de Obra</TableHead>
                                            <TableHead>Proyecto</TableHead>
                                            <TableHead>Insumos Clave</TableHead>
                                            <TableHead>Fecha Límite</TableHead>
                                            <TableHead>Avance</TableHead>
                                            <TableHead className="text-right">Alerta</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">Fundaciones y Pilotes</TableCell>
                                            <TableCell>Los Samanes II</TableCell>
                                            <TableCell>Cabilla 1/2", Concreto 250</TableCell>
                                            <TableCell>15 Nov 2026</TableCell>
                                            <TableCell>95%</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-500 text-white">Al Día</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Estructura Metálica</TableCell>
                                            <TableCell>Galpón Tinaquillo</TableCell>
                                            <TableCell>Vigas IPN, Pernos A325</TableCell>
                                            <TableCell>22 Nov 2026</TableCell>
                                            <TableCell>60%</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-blue-500 text-white">En Progreso</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Paredes y Friso</TableCell>
                                            <TableCell>Vialidad La Mora</TableCell>
                                            <TableCell>Bloques 15cm, Cemento Gris</TableCell>
                                            <TableCell>12 Nov 2026</TableCell>
                                            <TableCell>40%</TableCell>
                                            <TableCell className="text-right"><Badge variant="outline" className="text-amber-600 border-amber-500">Por Vencer</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}

                            {/* TABLA: ALMACEN (Despachos y Camiones) */}
                            {activeRole === 'almacen' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>N° Guía</TableHead>
                                            <TableHead>Chofer / Transporte</TableHead>
                                            <TableHead>Obra Destino</TableHead>
                                            <TableHead>Carga Despachada</TableHead>
                                            <TableHead className="text-right">Estatus</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-semibold">DSP-2026-089</TableCell>
                                            <TableCell className="font-medium">José Moreno <span className="text-xs text-muted-foreground">(Ford 350 - A89BB)</span></TableCell>
                                            <TableCell>Los Samanes II</TableCell>
                                            <TableCell>50 Sacos Cemento, 20 Cabillas 1/2"</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-amber-500 text-white animate-pulse">En Camino</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-semibold">DSP-2026-088</TableCell>
                                            <TableCell className="font-medium">Carlos Rivas <span className="text-xs text-muted-foreground">(Chuto Mack)</span></TableCell>
                                            <TableCell>Galpón Tinaquillo</TableCell>
                                            <TableCell>12 m³ Arena Amarilla</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-600 text-white">Entregado Conforme</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-semibold">DSP-2026-087</TableCell>
                                            <TableCell className="font-medium">Miguel Ortiz <span className="text-xs text-muted-foreground">(Camión 750)</span></TableCell>
                                            <TableCell>Vialidad La Mora</TableCell>
                                            <TableCell>80 Bloques de Concreto</TableCell>
                                            <TableCell className="text-right"><Badge variant="destructive">Faltaron 4 Bloques</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}

                            {/* TABLA: COMPRAS Y GTE COMPRAS (Cuadro 3 Presupuestos) */}
                            {(activeRole === 'compras' || activeRole === 'gerente_compras') && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Requerimiento</TableHead>
                                            <TableHead>Obra</TableHead>
                                            <TableHead>Ferretería A</TableHead>
                                            <TableHead>Ferretería B</TableHead>
                                            <TableHead>Ferretería C</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">100 Sacos Cemento Gris</TableCell>
                                            <TableCell>Los Samanes</TableCell>
                                            <TableCell className="text-emerald-600 font-bold">$7.20 (Mejor)</TableCell>
                                            <TableCell>$7.60</TableCell>
                                            <TableCell>$7.95</TableCell>
                                            <TableCell className="text-right">
                                                {activeRole === 'gerente_compras' ? (
                                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                                                        Autorizar O/C
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline">Enviado a Gerente</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">40 Cabillas 3/8" (12m)</TableCell>
                                            <TableCell>Galpón Tinaquillo</TableCell>
                                            <TableCell>$14.50</TableCell>
                                            <TableCell className="text-emerald-600 font-bold">$13.80 (Mejor)</TableCell>
                                            <TableCell>$14.20</TableCell>
                                            <TableCell className="text-right">
                                                {activeRole === 'gerente_compras' ? (
                                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                                                        Autorizar O/C
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline">Enviado a Gerente</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}

                            {/* TABLA: INGENIERO RESIDENTE (En Obra) */}
                            {activeRole === 'ingeniero_residente' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                                                <Truck className="size-4" />
                                                Camión en camino con Material para tu Obra
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Chofer: <strong className="text-foreground">José Moreno</strong> • Placa: A89BB • Salió de almacén hace 45 min
                                            </p>
                                            <p className="text-xs font-medium text-foreground">
                                                Carga: 50 Sacos Cemento Portland + 20 Cabillas 1/2"
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 shrink-0">
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs">
                                                <CheckCircle2 className="size-3.5 mr-1.5" />
                                                Recibido Completo
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-xs border-amber-600 text-amber-700 hover:bg-amber-100 dark:text-amber-400">
                                                <AlertTriangle className="size-3.5 mr-1.5" />
                                                Reportar Faltante
                                            </Button>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Cant. Recibida</TableHead>
                                                <TableHead>Cotejo en Obra</TableHead>
                                                <TableHead className="text-right">Firma Digital</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="text-xs">Ayer, 3:30 PM</TableCell>
                                                <TableCell className="font-semibold">Arena Lavada</TableCell>
                                                <TableCell>8 m³</TableCell>
                                                <TableCell><Badge className="bg-emerald-600 text-white">Conforme</Badge></TableCell>
                                                <TableCell className="text-right text-xs font-mono">Ing. Andrés C.</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="text-xs">03/11/2026</TableCell>
                                                <TableCell className="font-semibold">Alambre dulce N° 18</TableCell>
                                                <TableCell>15 Kg</TableCell>
                                                <TableCell><Badge className="bg-emerald-600 text-white">Conforme</Badge></TableCell>
                                                <TableCell className="text-right text-xs font-mono">Ing. Andrés C.</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* TABLA: ADMIN (Inventario: Libre vs Asignado) */}
                            {activeRole === 'admin' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Insumo / Material</TableHead>
                                            <TableHead>Unidad</TableHead>
                                            <TableHead>Stock Libre</TableHead>
                                            <TableHead>Stock Asignado a Obras</TableHead>
                                            <TableHead>Total en Almacén</TableHead>
                                            <TableHead className="text-right">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">Cemento Gris Tipo I</TableCell>
                                            <TableCell>Saco 42.5kg</TableCell>
                                            <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">320</TableCell>
                                            <TableCell className="font-bold text-amber-600 dark:text-amber-400">850 (Los Samanes + Tinaquillo)</TableCell>
                                            <TableCell className="font-extrabold">1,170</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-500 text-white">Óptimo</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Cabilla Estriada 1/2"</TableCell>
                                            <TableCell>Barra 12m</TableCell>
                                            <TableCell className="font-bold text-red-600 dark:text-red-400">15 (Bajo)</TableCell>
                                            <TableCell className="font-bold text-amber-600 dark:text-amber-400">120 (Tinaquillo)</TableCell>
                                            <TableCell className="font-extrabold">135</TableCell>
                                            <TableCell className="text-right"><Badge variant="destructive">Stock Crítico</Badge></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-semibold">Bloque de Arcilla 15cm</TableCell>
                                            <TableCell>Unidad</TableCell>
                                            <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">1,400</TableCell>
                                            <TableCell className="font-bold text-amber-600 dark:text-amber-400">2,500 (Los Samanes)</TableCell>
                                            <TableCell className="font-extrabold">3,900</TableCell>
                                            <TableCell className="text-right"><Badge className="bg-emerald-500 text-white">Óptimo</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha: Widget de Notificaciones WhatsApp en Tiempo Real */}
                <div className="space-y-6">
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <MessageSquare className="size-4 text-emerald-500" />
                                    Alertas WhatsApp
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    Cloud API Activa
                                </Badge>
                            </div>
                            <CardDescription>
                                Mensajes automáticos enviados a obra y gerencia
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <WhatsAppMessageItem
                                sender="Bot Almacén"
                                recipient="+58 412-0000007 (Ing. Residente)"
                                time="Hace 45 min"
                                icon={Truck}
                                text="Despacho en camino para Los Samanes II. Chofer: José Moreno (Mack). 50 sacos de cemento. Confirma al llegar."
                            />

                            <WhatsAppMessageItem
                                sender="Sistema Cronograma"
                                recipient="+58 412-0000003 (Coordinación)"
                                time="Hoy, 9:15 AM"
                                icon={CalendarClock}
                                text="Alerta: La fase 'Paredes Galpón Tinaquillo' vence en 3 días. Quedan 20% de materiales por despachar."
                            />

                            <WhatsAppMessageItem
                                sender="Bot Procura"
                                recipient="+58 412-0000006 (Gte. Compras)"
                                time="Ayer, 4:20 PM"
                                icon={FileSpreadsheet}
                                text="Tienes 3 cuadros comparativos de compras listos para autorizar esta semana. Inversión: $4,850."
                            />

                            <WhatsAppMessageItem
                                sender="Ing. Residente"
                                recipient="+58 412-0000004 (Almacén Central)"
                                time="Ayer, 2:10 PM"
                                icon={AlertTriangle}
                                text="Recepción Obra La Mora: Faltaron 4 bloques en la entrega #87. Reportado en sistema."
                            />
                        </CardContent>
                    </Card>

                    {/* TARJETA ISO 9001 Y ESTADO DE CALIDAD */}
                    <Card className="border-amber-500/20 bg-amber-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <Shield className="size-4" />
                                Sistema de Gestión de la Calidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2">
                            <p>
                                Todos los movimientos de requisición, compras y despachos se registran bajo los formatos normativos:
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <Badge variant="outline" className="text-[10px]">BANPE-FO-12-0001 (Requisición)</Badge>
                                <Badge variant="outline" className="text-[10px]">BANPE-FO-12-0004 (Despacho)</Badge>
                                <Badge variant="outline" className="text-[10px]">BANPE-FO-05-0001 (Procura)</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            </>
            )}
        </div>
    );
}

// Subcomponente de Tarjeta de Métrica (KPI)
function KpiCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    alert = false,
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: string;
    alert?: boolean;
}) {
    return (
        <Card className={alert ? 'border-amber-500/40 bg-amber-500/5' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${alert ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="size-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black tracking-tight text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                    <span>{description}</span>
                    {trend && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                            {trend}
                        </span>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}

// Subcomponente de Botón de Acción Rápida
function ActionButton({
    icon: Icon,
    title,
    subtitle,
    highlight = false,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    highlight?: boolean;
}) {
    return (
        <button
            type="button"
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer ${
                highlight
                    ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 shadow-xs'
                    : 'border-border bg-card hover:bg-accent/50 hover:border-amber-500/50'
            }`}
        >
            <div className={`p-2 rounded-lg mb-2 ${highlight ? 'bg-amber-500 text-zinc-950' : 'bg-muted text-foreground'}`}>
                <Icon className="size-4" />
            </div>
            <span className="text-xs font-bold text-foreground leading-snug">{title}</span>
            <span className="text-[11px] text-muted-foreground line-clamp-1">{subtitle}</span>
        </button>
    );
}

// Subcomponente de Mensaje WhatsApp
function WhatsAppMessageItem({
    sender,
    recipient,
    time,
    text,
    icon: Icon = MessageSquare,
}: {
    sender: string;
    recipient: string;
    time: string;
    text: string;
    icon?: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    {sender}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {time}
                </span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
                {text}
            </p>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Enviado a: {recipient}
            </div>
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Panel de Control',
            href: dashboard(),
        },
    ],
};
