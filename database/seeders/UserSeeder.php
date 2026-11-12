<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password'); // Contraseña para pruebas: password

        $users = [
            [
                'role_slug' => RoleEnum::ADMIN->value,
                'name' => 'Carlos Administrador',
                'email' => 'admin@banpe.com.ve',
                'phone' => '+584120000001',
                'position' => 'Administrador de Sistemas',
            ],
            [
                'role_slug' => RoleEnum::GERENTE_PROYECTO->value,
                'name' => 'Ing. Roberto Mendoza (Gerente Proyecto)',
                'email' => 'gerente@banpe.com.ve',
                'phone' => '+584120000002',
                'position' => 'Gerente General de Proyectos',
            ],
            [
                'role_slug' => RoleEnum::COORDINADOR_PROYECTO->value,
                'name' => 'Arq. Elena Salazar (Coordinadora)',
                'email' => 'coordinador@banpe.com.ve',
                'phone' => '+584120000003',
                'position' => 'Coordinadora de Operaciones y Fases',
            ],
            [
                'role_slug' => RoleEnum::ALMACEN->value,
                'name' => 'Marcos Peña (Jefe Almacén)',
                'email' => 'almacen@banpe.com.ve',
                'phone' => '+584120000004',
                'position' => 'Supervisor de Almacén Central',
            ],
            [
                'role_slug' => RoleEnum::COMPRAS->value,
                'name' => 'Valeria Gómez (Procura/Compras)',
                'email' => 'compras@banpe.com.ve',
                'phone' => '+584120000005',
                'position' => 'Analista de Procura y Presupuestos',
            ],
            [
                'role_slug' => RoleEnum::GERENTE_COMPRAS->value,
                'name' => 'Lic. David Rivas (Gerente Compras)',
                'email' => 'gerentecompras@banpe.com.ve',
                'phone' => '+584120000006',
                'position' => 'Gerente de Procura y Finanzas',
            ],
            [
                'role_slug' => RoleEnum::INGENIERO_RESIDENTE->value,
                'name' => 'Ing. Andrés Castillo (Residente Obra)',
                'email' => 'residente@banpe.com.ve',
                'phone' => '+584120000007',
                'position' => 'Ingeniero Residente de Obra',
            ],
        ];

        foreach ($users as $userData) {
            $role = Role::where('slug', $userData['role_slug'])->first();

            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'role_id' => $role?->id,
                    'name' => $userData['name'],
                    'password' => $defaultPassword,
                    'phone' => $userData['phone'],
                    'position' => $userData['position'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}

