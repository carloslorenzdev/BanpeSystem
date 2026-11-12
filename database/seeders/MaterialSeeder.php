<?php

namespace Database\Seeders;

use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\MeasurementUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MaterialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Agregados y Cemento' => 'Materiales base para concreto, mezclas y vaciados.',
            'Aceros y Armaduras' => 'Cabillas, mallas electrosoldadas, vigas y alambres.',
            'Bloques y Mampostería' => 'Bloques de arcilla, concreto y ladrillos para cerramientos.',
            'Tuberías y Plomería' => 'Tuberías PVC, sanitarias, de presión y conexiones.',
            'Electricidad e Iluminación' => 'Cables THHN, tubería conduit, tableros y brakers.',
            'Herramientas y Equipos Menores' => 'Palas, carretillas, palustres y discos de corte.',
        ];

        $categoryModels = [];
        foreach ($categories as $name => $desc) {
            $categoryModels[$name] = MaterialCategory::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'description' => $desc]
            );
        }

        $units = [
            ['name' => 'Saco 42.5 Kg', 'symbol' => 'saco'],
            ['name' => 'Metro Cúbico', 'symbol' => 'm³'],
            ['name' => 'Barra de 12 Metros', 'symbol' => 'barra'],
            ['name' => 'Kilogramo', 'symbol' => 'kg'],
            ['name' => 'Pieza / Unidad', 'symbol' => 'und'],
            ['name' => 'Galón', 'symbol' => 'gal'],
            ['name' => 'Rollo', 'symbol' => 'rollo'],
        ];

        $unitModels = [];
        foreach ($units as $u) {
            $unitModels[$u['symbol']] = MeasurementUnit::updateOrCreate(
                ['symbol' => $u['symbol']],
                ['name' => $u['name']]
            );
        }

        $materials = [
            [
                'code' => 'CEM-001',
                'name' => 'Cemento Gris Portland Tipo I',
                'category' => 'Agregados y Cemento',
                'unit' => 'saco',
                'minimum_stock' => 100,
                'estimated_price_usd' => 7.20,
                'description' => 'Cemento de alta resistencia para estructuras y fundaciones.',
            ],
            [
                'code' => 'CEM-002',
                'name' => 'Cemento Blanco Especial',
                'category' => 'Agregados y Cemento',
                'unit' => 'saco',
                'minimum_stock' => 20,
                'estimated_price_usd' => 12.50,
                'description' => 'Para acabados arquitectónicos y frisos blancos.',
            ],
            [
                'code' => 'AGR-001',
                'name' => 'Arena Amarilla Lavada',
                'category' => 'Agregados y Cemento',
                'unit' => 'm³',
                'minimum_stock' => 15,
                'estimated_price_usd' => 25.00,
                'description' => 'Libre de arcilla para elaboración de concreto estructural.',
            ],
            [
                'code' => 'AGR-002',
                'name' => 'Piedra Picada N° 1 (Grava)',
                'category' => 'Agregados y Cemento',
                'unit' => 'm³',
                'minimum_stock' => 15,
                'estimated_price_usd' => 28.00,
                'description' => 'Agregado grueso para losas, columnas y vigas de carga.',
            ],
            [
                'code' => 'CAB-001',
                'name' => 'Cabilla Estriada 1/2" x 12m',
                'category' => 'Aceros y Armaduras',
                'unit' => 'barra',
                'minimum_stock' => 50,
                'estimated_price_usd' => 14.20,
                'description' => 'Acero de refuerzo estándar para columnas y zapatas.',
            ],
            [
                'code' => 'CAB-002',
                'name' => 'Cabilla Estriada 3/8" x 12m',
                'category' => 'Aceros y Armaduras',
                'unit' => 'barra',
                'minimum_stock' => 80,
                'estimated_price_usd' => 11.50,
                'description' => 'Para estribos y refuerzo secundario.',
            ],
            [
                'code' => 'CAB-003',
                'name' => 'Alambre Dulce Recocido N° 18',
                'category' => 'Aceros y Armaduras',
                'unit' => 'kg',
                'minimum_stock' => 30,
                'estimated_price_usd' => 2.40,
                'description' => 'Para amarre de enfierrado en obra.',
            ],
            [
                'code' => 'BLO-001',
                'name' => 'Bloque de Arcilla 15x20x30 cm',
                'category' => 'Bloques y Mampostería',
                'unit' => 'und',
                'minimum_stock' => 500,
                'estimated_price_usd' => 0.65,
                'description' => 'Para paredes perimetrales y divisiones internas.',
            ],
            [
                'code' => 'BLO-002',
                'name' => 'Bloque de Concreto 15x20x40 cm',
                'category' => 'Bloques y Mampostería',
                'unit' => 'und',
                'minimum_stock' => 300,
                'estimated_price_usd' => 0.85,
                'description' => 'Alta resistencia para muros de contención y sótanos.',
            ],
            [
                'code' => 'TUB-001',
                'name' => 'Tubo PVC Sanitario 4" x 3m',
                'category' => 'Tuberías y Plomería',
                'unit' => 'und',
                'minimum_stock' => 25,
                'estimated_price_usd' => 9.80,
                'description' => 'Tubería de drenaje y bajantes de aguas servidas.',
            ],
            [
                'code' => 'TUB-002',
                'name' => 'Tubo Conduit Eléctrico PVC 3/4" x 3m',
                'category' => 'Electricidad e Iluminación',
                'unit' => 'und',
                'minimum_stock' => 40,
                'estimated_price_usd' => 4.20,
                'description' => 'Canalización embutida en losa y paredes.',
            ],
        ];

        foreach ($materials as $m) {
            Material::updateOrCreate(
                ['code' => $m['code']],
                [
                    'name' => $m['name'],
                    'category_id' => $categoryModels[$m['category']]->id,
                    'unit_id' => $unitModels[$m['unit']]->id,
                    'minimum_stock' => $m['minimum_stock'],
                    'estimated_price_usd' => $m['estimated_price_usd'],
                    'description' => $m['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}

