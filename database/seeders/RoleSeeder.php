<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'slug' => RoleEnum::ADMIN->value,
                'name' => RoleEnum::ADMIN->label(),
                'description' => 'Acceso total a la configuración del sistema, gestión de usuarios, roles y catálogos.',
            ],
            [
                'slug' => RoleEnum::GERENTE_PROYECTO->value,
                'name' => RoleEnum::GERENTE_PROYECTO->label(),
                'description' => 'Creación y planificación de obras/proyectos, asignación de ingenieros residentes, aprobación general y cierre de obras.',
            ],
            [
                'slug' => RoleEnum::COORDINADOR_PROYECTO->value,
                'name' => RoleEnum::COORDINADOR_PROYECTO->label(),
                'description' => 'Planificación detallada de fases, solicitudes de insumos a almacén y reasignación de materiales entre obras.',
            ],
            [
                'slug' => RoleEnum::ALMACEN->value,
                'name' => RoleEnum::ALMACEN->label(),
                'description' => 'Control de inventario central y en obra, recepción de materiales, inspección técnica y despacho con asignación de chofer/camión.',
            ],
            [
                'slug' => RoleEnum::COMPRAS->value,
                'name' => RoleEnum::COMPRAS->label(),
                'description' => 'Gestión de solicitudes de compra no cubiertas por almacén, carga de cotizaciones (cuadro de 3 presupuestos) y emisión de O/C.',
            ],
            [
                'slug' => RoleEnum::GERENTE_COMPRAS->value,
                'name' => RoleEnum::GERENTE_COMPRAS->label(),
                'description' => 'Revisión y autorización del checklist semanal de compras e inversiones por obra.',
            ],
            [
                'slug' => RoleEnum::INGENIERO_RESIDENTE->value,
                'name' => RoleEnum::INGENIERO_RESIDENTE->label(),
                'description' => 'Operación directa en el sitio de la obra: recepción y cotejo de despachos físicos, reporte de faltantes y solicitud de materiales extra.',
            ],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['slug' => $roleData['slug']],
                $roleData
            );
        }
    }
}

