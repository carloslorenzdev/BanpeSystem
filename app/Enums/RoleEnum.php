<?php

namespace App\Enums;

enum RoleEnum: string
{
    case ADMIN = 'admin';
    case GERENTE_PROYECTO = 'gerente_proyecto';
    case COORDINADOR_PROYECTO = 'coordinador_proyecto';
    case ALMACEN = 'almacen';
    case COMPRAS = 'compras';
    case GERENTE_COMPRAS = 'gerente_compras';
    case INGENIERO_RESIDENTE = 'ingeniero_residente';

    /**
     * Nombre legible del rol para la interfaz.
     */
    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'Administrador del Sistema',
            self::GERENTE_PROYECTO => 'Gerente de Proyecto',
            self::COORDINADOR_PROYECTO => 'Coordinador de Proyectos',
            self::ALMACEN => 'Jefe / Supervisor de Almacén',
            self::COMPRAS => 'Operador de Compras / Procura',
            self::GERENTE_COMPRAS => 'Gerente de Compras',
            self::INGENIERO_RESIDENTE => 'Ingeniero Residente (En Obra)',
        };
    }
}

