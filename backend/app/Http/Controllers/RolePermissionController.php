<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionController extends Controller
{
    public function index()
    {
        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions
        ]);
    }

    public function updateRolePermissions(Request $request, $id)
    {
        $request->validate([
            'permissions' => 'required|array'
        ]);

        $role = Role::findOrFail($id);
        
        // Ensure Super Admin permissions are not accidentally removed if we are modifying it,
        // though typically Super Admin should have bypass in AuthServiceProvider.
        $role->syncPermissions($request->permissions);

        return response()->json(['message' => 'Permissions updated successfully']);
    }
}
