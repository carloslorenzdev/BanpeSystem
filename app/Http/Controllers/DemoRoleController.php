<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DemoRoleController extends Controller
{
    /**
     * Permite alternar de rol en tiempo real durante demostraciones y pruebas del sistema BANPE.
     */
    public function switchRole(Request $request)
    {
        $validated = $request->validate([
            'role' => 'required|string',
        ]);

        $roleSlug = $validated['role'];
        $role = Role::where('slug', $roleSlug)->first();

        if (! $role) {
            return back()->with('error', 'El rol solicitado no existe en el sistema.');
        }

        // Buscar usuario asignado a este rol para asumir su identidad y permisos reales
        $targetUser = User::where('role_id', $role->id)->first();

        if ($targetUser) {
            Auth::login($targetUser);
        } else {
            // Si no hay usuario específico, asignar temporalmente el rol al usuario actual
            $currentUser = $request->user();
            $currentUser->role_id = $role->id;
            $currentUser->save();
        }

        // Registrar rol activo en la sesión de Laravel
        session(['banpe_demo_role' => $roleSlug]);

        return back()->with('success', "Has cambiado a la vista de: {$role->name}");
    }
}

