<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_can_switch_role_seamlessly()
    {
        $adminRole = Role::where('slug', 'admin')->first();
        $almacenRole = Role::where('slug', 'almacen')->first();

        $admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'email' => 'admin@banpe.test',
        ]);

        $almacenUser = User::factory()->create([
            'role_id' => $almacenRole->id,
            'email' => 'almacen@banpe.test',
        ]);

        $this->actingAs($admin);

        $response = $this->post('/demo/switch-role', [
            'role' => 'almacen',
        ]);

        $response->assertRedirect();
        $this->assertEquals($almacenUser->id, auth()->id());
        $this->assertEquals('almacen', auth()->user()->role->slug);
    }
}

