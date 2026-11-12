<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Project;
use App\Models\Material;
use App\Models\Warehouse;
use App\Models\WarehouseInventory;
use App\Models\MaterialRequest;
use App\Models\Dispatch;
use App\Models\Supplier;
use App\Models\PurchaseRequest;
use App\Models\SupplierQuotation;
use App\Models\PurchaseOrder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BanpeIsoWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $resident;
    protected User $warehouseUser;
    protected User $procurementUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

        $adminRole = Role::where('slug', 'admin')->first();
        $residentRole = Role::where('slug', 'ingeniero_residente')->first();
        $warehouseRole = Role::where('slug', 'almacen')->first();
        $comprasRole = Role::where('slug', 'compras')->first();

        $this->admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin BANPE',
            'email' => 'admin@banpe.test',
        ]);

        $this->resident = User::factory()->create([
            'role_id' => $residentRole->id,
            'name' => 'Ing. Residente',
            'email' => 'residente@banpe.test',
        ]);

        $this->warehouseUser = User::factory()->create([
            'role_id' => $warehouseRole->id,
            'name' => 'Jefe Almacén',
            'email' => 'almacen@banpe.test',
        ]);

        $this->procurementUser = User::factory()->create([
            'role_id' => $comprasRole->id,
            'name' => 'Coord. Procura',
            'email' => 'compras@banpe.test',
        ]);
    }

    public function test_projects_crud_and_iso_standards()
    {
        $this->actingAs($this->admin);

        // 1. Projects list
        $response = $this->get('/projects');
        $response->assertOk();

        // 2. Create project (BANPE-MP-04 O)
        $project = Project::create([
            'code' => 'OBR-2026-TEST',
            'name' => 'Construcción Centro Médico Test',
            'client' => 'Ministerio de Obras Públicas',
            'location' => 'Valencia, Carabobo',
            'status' => 'en_ejecucion',
            'resident_id' => $this->resident->id,
            'contract_amount' => 150000.00,
            'start_date' => now()->toDateString(),
        ]);

        // 3. Project detail view
        $response = $this->get("/projects/{$project->id}");
        $response->assertOk();
    }

    public function test_warehouse_and_multi_site_inventory()
    {
        $this->actingAs($this->warehouseUser);

        // 1. Warehouse central & sub-almacén (BANPE-MP-12)
        $warehouse = Warehouse::create([
            'code' => 'ALM-CENTRAL-TEST',
            'name' => 'Almacén Central Valencia',
            'type' => 'central',
            'location' => 'Zona Industrial Valencia',
            'is_active' => true,
        ]);

        $material = Material::create([
            'code' => 'CEM-001',
            'name' => 'Cemento Portland Gris Tipo I',
            'category' => 'Cementos',
            'unit' => 'saco 42.5kg',
            'current_price_usd' => 8.50,
            'is_active' => true,
        ]);

        // 2. Add Stock Libre
        $inventory = WarehouseInventory::create([
            'warehouse_id' => $warehouse->id,
            'material_id' => $material->id,
            'project_id' => null,
            'quantity' => 500,
            'min_stock' => 50,
            'location_rack' => 'Rack A-12',
        ]);

        $this->assertEquals(500, $inventory->quantity);

        // 3. Warehouse view
        $response = $this->get('/warehouse');
        $response->assertOk();
    }

    public function test_procurement_three_quotes_iso_matrix()
    {
        $this->actingAs($this->procurementUser);

        // 1. Certified Suppliers (BANPE-FO-05-0005)
        $sup1 = Supplier::create([
            'rif' => 'J-12345678-1',
            'business_name' => 'Sidetur Carabobo C.A.',
            'contact_person' => 'Carlos Silva',
            'phone' => '+584141234567',
            'email' => 'ventas@sidetur.test',
            'is_active' => true,
        ]);

        $sup2 = Supplier::create([
            'rif' => 'J-12345678-2',
            'business_name' => 'Hierros Occidente S.A.',
            'contact_person' => 'Pedro Pérez',
            'phone' => '+584141234568',
            'email' => 'ventas@hierros.test',
            'is_active' => true,
        ]);

        $sup3 = Supplier::create([
            'rif' => 'J-12345678-3',
            'business_name' => 'Distribuidora Global C.A.',
            'contact_person' => 'María López',
            'phone' => '+584141234569',
            'email' => 'contacto@global.test',
            'is_active' => true,
        ]);

        $this->assertEquals(3, Supplier::count());

        // 2. Purchases view (BANPE-MP-05 / BANPE-DF-05-a)
        $response = $this->get('/purchases');
        $response->assertOk();
    }

    public function test_dispatches_workflow_iso_compliance()
    {
        $this->actingAs($this->warehouseUser);

        $response = $this->get('/dispatches');
        $response->assertOk();
    }

    public function test_requisitions_workflow()
    {
        $this->actingAs($this->resident);

        $response = $this->get('/requisitions');
        $response->assertOk();
    }

    public function test_admin_catalogs_and_users()
    {
        $this->actingAs($this->admin);

        $response = $this->get('/admin/materials');
        $response->assertOk();

        $response = $this->get('/admin/users');
        $response->assertOk();
    }
}
