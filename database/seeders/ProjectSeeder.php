<?php

namespace Database\Seeders;

use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\ProjectPhase;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $resident = User::where('email', 'residente@banpe.com.ve')->first()
            ?? User::first();
        $manager = User::where('email', 'gerente@banpe.com.ve')->first()
            ?? User::first();

        // 1. Obra 1: Residencias Los Samanes II
        $project1 = Project::updateOrCreate(
            ['code' => 'OBR-2026-001'],
            [
                'name' => 'Residencias Los Samanes II',
                'client_name' => 'Inversiones Los Samanes C.A.',
                'location' => 'Caracas, Municipio Baruta, Miranda',
                'resident_engineer_id' => $resident?->id,
                'manager_id' => $manager?->id,
                'start_date' => '2026-01-15',
                'estimated_end_date' => '2026-10-30',
                'budget_usd' => 125000.00,
                'progress_percentage' => 38.50,
                'status' => 'en_ejecucion',
                'description' => 'Construcción de torre residencial de 8 niveles, incluye sótanos de estacionamiento, área social y tanques de agua subterráneos.',
            ]
        );

        $fase1_p1 = ProjectPhase::updateOrCreate(
            ['project_id' => $project1->id, 'name' => 'Fase 1: Movimiento de Tierra y Fundaciones'],
            [
                'start_date' => '2026-01-15',
                'end_date' => '2026-03-10',
                'status' => 'completada',
                'progress_percentage' => 100.00,
                'description' => 'Excavación, replanteo, vaciado de zapatas y losa de fundación.',
            ]
        );

        $fase2_p1 = ProjectPhase::updateOrCreate(
            ['project_id' => $project1->id, 'name' => 'Fase 2: Estructura y Losa Nivel 1 al 4'],
            [
                'start_date' => '2026-03-11',
                'end_date' => '2026-06-30',
                'status' => 'en_progreso',
                'progress_percentage' => 45.00,
                'description' => 'Encofrado de columnas perimetrales, colocación de vigas de carga y vaciado de losas nervadas.',
            ]
        );

        $fase3_p1 = ProjectPhase::updateOrCreate(
            ['project_id' => $project1->id, 'name' => 'Fase 3: Cerramiento y Mampostería'],
            [
                'start_date' => '2026-07-01',
                'end_date' => '2026-09-15',
                'status' => 'pendiente',
                'progress_percentage' => 0.00,
                'description' => 'Paredes perimetrales en bloque de arcilla de 15cm y frisos internos.',
            ]
        );

        // Materiales presupuestados para Obra 1
        $cemento = Material::where('code', 'CEM-001')->first();
        $arena = Material::where('code', 'AGR-001')->first();
        $piedra = Material::where('code', 'AGR-002')->first();
        $cabilla12 = Material::where('code', 'CAB-001')->first();
        $bloque15 = Material::where('code', 'BLO-001')->first();

        if ($cemento) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project1->id, 'material_id' => $cemento->id],
                [
                    'project_phase_id' => $fase2_p1->id,
                    'estimated_quantity' => 1200,
                    'dispatched_quantity' => 450,
                    'unit_price_usd' => $cemento->estimated_price_usd,
                    'total_price_usd' => 1200 * $cemento->estimated_price_usd,
                ]
            );
        }

        if ($arena) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project1->id, 'material_id' => $arena->id],
                [
                    'project_phase_id' => $fase2_p1->id,
                    'estimated_quantity' => 180,
                    'dispatched_quantity' => 70,
                    'unit_price_usd' => $arena->estimated_price_usd,
                    'total_price_usd' => 180 * $arena->estimated_price_usd,
                ]
            );
        }

        if ($piedra) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project1->id, 'material_id' => $piedra->id],
                [
                    'project_phase_id' => $fase1_p1->id,
                    'estimated_quantity' => 150,
                    'dispatched_quantity' => 150,
                    'unit_price_usd' => $piedra->estimated_price_usd,
                    'total_price_usd' => 150 * $piedra->estimated_price_usd,
                ]
            );
        }

        if ($cabilla12) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project1->id, 'material_id' => $cabilla12->id],
                [
                    'project_phase_id' => $fase2_p1->id,
                    'estimated_quantity' => 500,
                    'dispatched_quantity' => 220,
                    'unit_price_usd' => $cabilla12->estimated_price_usd,
                    'total_price_usd' => 500 * $cabilla12->estimated_price_usd,
                ]
            );
        }

        if ($bloque15) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project1->id, 'material_id' => $bloque15->id],
                [
                    'project_phase_id' => $fase3_p1->id,
                    'estimated_quantity' => 8000,
                    'dispatched_quantity' => 0,
                    'unit_price_usd' => $bloque15->estimated_price_usd,
                    'total_price_usd' => 8000 * $bloque15->estimated_price_usd,
                ]
            );
        }

        // 2. Obra 2: Galpón Industrial Tinaquillo
        $project2 = Project::updateOrCreate(
            ['code' => 'OBR-2026-002'],
            [
                'name' => 'Galpón Industrial Tinaquillo',
                'client_name' => 'Agroindustrias del Centro C.A.',
                'location' => 'Zona Industrial Tinaquillo, Estado Cojedes',
                'resident_engineer_id' => $resident?->id,
                'manager_id' => $manager?->id,
                'start_date' => '2026-02-01',
                'estimated_end_date' => '2026-08-15',
                'budget_usd' => 85000.00,
                'progress_percentage' => 22.00,
                'status' => 'en_ejecucion',
                'description' => 'Montaje de estructura metálica de 1.200 m², pisos de concreto pulido de alto impacto y oficinas operativas.',
            ]
        );

        $fase1_p2 = ProjectPhase::updateOrCreate(
            ['project_id' => $project2->id, 'name' => 'Fase 1: Topografía y Pedestales'],
            [
                'start_date' => '2026-02-01',
                'end_date' => '2026-03-01',
                'status' => 'completada',
                'progress_percentage' => 100.00,
                'description' => 'Replanteo de ejes y anclaje de pernos de fundación.',
            ]
        );

        $fase2_p2 = ProjectPhase::updateOrCreate(
            ['project_id' => $project2->id, 'name' => 'Fase 2: Montaje Estructural y Techado'],
            [
                'start_date' => '2026-03-02',
                'end_date' => '2026-05-30',
                'status' => 'en_progreso',
                'progress_percentage' => 30.00,
                'description' => 'Izado de cerchas metálicas y colocación de láminas acerolit.',
            ]
        );

        if ($cemento) {
            ProjectMaterial::updateOrCreate(
                ['project_id' => $project2->id, 'material_id' => $cemento->id],
                [
                    'project_phase_id' => $fase1_p2->id,
                    'estimated_quantity' => 600,
                    'dispatched_quantity' => 200,
                    'unit_price_usd' => $cemento->estimated_price_usd,
                    'total_price_usd' => 600 * $cemento->estimated_price_usd,
                ]
            );
        }

        // 3. Obra 3: Vialidad Urbana Sector La Mora
        $project3 = Project::updateOrCreate(
            ['code' => 'OBR-2026-003'],
            [
                'name' => 'Vialidad Urbana Sector La Mora',
                'client_name' => 'Gobernación del Estado Aragua',
                'location' => 'La Victoria, Estado Aragua',
                'resident_engineer_id' => $resident?->id,
                'manager_id' => $manager?->id,
                'start_date' => '2026-04-01',
                'estimated_end_date' => '2026-07-20',
                'budget_usd' => 45000.00,
                'progress_percentage' => 0.00,
                'status' => 'licitacion',
                'description' => 'Rehabilitación de carpeta asfáltica, brocales, aceras y red de drenaje pluvial.',
            ]
        );

        ProjectPhase::updateOrCreate(
            ['project_id' => $project3->id, 'name' => 'Fase 1: Levantamiento y Cómputos Métricos'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2026-04-20',
                'status' => 'pendiente',
                'progress_percentage' => 0.00,
                'description' => 'Verificación en campo para presentación de oferta final a licitación.',
            ]
        );
    }
}

