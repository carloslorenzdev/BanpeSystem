<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\MeasurementUnit;
use App\Services\MaprexParserService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MaterialController extends Controller
{
    /**
     * Catálogo maestro de insumos y materiales.
     */
    public function index(Request $request): Response
    {
        $materials = Material::with(['category', 'unit'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($request->category, function ($query, $category) {
                $query->where('category_id', $category);
            })
            ->latest()
            ->get();

        $categories = MaterialCategory::orderBy('name')->get();
        $units = MeasurementUnit::orderBy('name')->get();

        return Inertia::render('admin/materials/index', [
            'materials' => $materials,
            'categories' => $categories,
            'units' => $units,
            'filters' => [
                'search' => $request->search ?? '',
                'category' => $request->category ?? '',
            ],
        ]);
    }

    /**
     * Crea un nuevo insumo en el catálogo.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:materials,code'],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:material_categories,id'],
            'unit_id' => ['required', 'exists:measurement_units,id'],
            'minimum_stock' => ['required', 'numeric', 'min:0'],
            'estimated_price_usd' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        Material::create($validated);

        return redirect()->back()->with('success', 'Insumo registrado en el catálogo exitosamente.');
    }

    /**
     * Actualiza un insumo en el catálogo.
     */
    public function update(Request $request, Material $material): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('materials')->ignore($material->id)],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:material_categories,id'],
            'unit_id' => ['required', 'exists:measurement_units,id'],
            'minimum_stock' => ['required', 'numeric', 'min:0'],
            'estimated_price_usd' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $material->update($validated);

        return redirect()->back()->with('success', 'Insumo actualizado con éxito.');
    }

    /**
     * Elimina un insumo del catálogo.
     */
    public function destroy(Material $material): RedirectResponse
    {
        $material->delete();

        return redirect()->back()->with('success', 'Insumo eliminado del catálogo.');
    }

    /**
     * Importación masiva de insumos y materiales desde Maprex (Excel / CSV / TXT).
     */
    public function importMaprex(Request $request, MaprexParserService $parser): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
            'update_existing' => ['nullable', 'boolean'],
        ]);

        $parsedRows = $parser->parse($request->file('file'));

        if (empty($parsedRows)) {
            return redirect()->back()->withErrors(['file' => 'No se encontraron insumos válidos en el archivo Maprex cargado. Asegúrate de exportar la Explosión/Listado de Insumos o Presupuesto en Excel (.xls/.xlsx) o CSV.']);
        }

        $createdCount = 0;
        $updatedCount = 0;
        $updateExisting = $request->boolean('update_existing', true);

        DB::transaction(function () use ($parsedRows, $updateExisting, &$createdCount, &$updatedCount) {
            $defaultUnit = MeasurementUnit::firstOrCreate(['symbol' => 'und'], ['name' => 'Unidad']);
            $defaultCategory = MaterialCategory::firstOrCreate(['slug' => 'general'], ['name' => 'General']);

            foreach ($parsedRows as $row) {
                $code = strtoupper(trim($row['code'] ?? ''));
                $name = trim($row['name'] ?? '');
                $categoryName = trim($row['category'] ?? '');
                $unitSymbol = strtolower(trim($row['unit'] ?? 'und'));
                $priceUsd = (float) ($row['unit_price'] ?? 0);
                $minStock = (float) ($row['min_stock'] ?? 10);

                if (empty($name)) continue;
                if (empty($code)) {
                    $code = 'MAP-' . strtoupper(Str::random(6));
                }

                // Resolver Categoría
                $category = $defaultCategory;
                if (!empty($categoryName) && strtolower($categoryName) !== 'general') {
                    $category = MaterialCategory::firstOrCreate(
                        ['slug' => Str::slug($categoryName)],
                        ['name' => $categoryName]
                    );
                }

                // Resolver Unidad de Medida
                $unit = $defaultUnit;
                if (!empty($unitSymbol)) {
                    $unit = MeasurementUnit::firstOrCreate(
                        ['symbol' => $unitSymbol],
                        ['name' => strtoupper($unitSymbol)]
                    );
                }

                $existingMaterial = Material::where('code', $code)->first();
                if (!$existingMaterial) {
                    $existingMaterial = Material::where('name', $name)->first();
                }

                if ($existingMaterial) {
                    if ($updateExisting) {
                        $existingMaterial->update([
                            'name' => $name,
                            'category_id' => $category->id,
                            'unit_id' => $unit->id,
                            'estimated_price_usd' => $priceUsd > 0 ? $priceUsd : $existingMaterial->estimated_price_usd,
                            'minimum_stock' => $minStock >= 0 ? $minStock : $existingMaterial->minimum_stock,
                            'is_active' => true,
                        ]);
                        $updatedCount++;
                    }
                } else {
                    Material::create([
                        'code' => $code,
                        'name' => $name,
                        'category_id' => $category->id,
                        'unit_id' => $unit->id,
                        'estimated_price_usd' => $priceUsd,
                        'minimum_stock' => $minStock,
                        'is_active' => true,
                    ]);
                    $createdCount++;
                }
            }
        });

        return redirect()->back()->with('success', "Importación de Maprex exitosa: {$createdCount} insumos nuevos creados y {$updatedCount} actualizados en el Catálogo Maestro.");
    }

    /**
     * Descarga de plantilla de ejemplo oficial para Catálogo Maprex.
     */
    public function downloadTemplate(Request $request): BinaryFileResponse
    {
        $format = $request->query('format', 'csv');

        if ($format === 'xls') {
            $path = public_path('templates/Catalogo_Maprex_Ejemplo_BANPE.xls');
            return response()->download($path, 'Catalogo_Maprex_Ejemplo_BANPE.xls', [
                'Content-Type' => 'application/vnd.ms-excel',
            ]);
        }

        $path = public_path('templates/Catalogo_Maprex_Ejemplo_BANPE.csv');
        return response()->download($path, 'Catalogo_Maprex_Ejemplo_BANPE.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}

