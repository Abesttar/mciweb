<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Roles
        $roles = ['Super Admin', 'Admin', 'Sachou', 'Staff Akademik', 'Sensei', 'Siswa'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        // Permissions
        $permissions = [
            'view dashboard',
            'manage users',
            'manage roles',
            'manage batches',
            'manage students',
            'manage documents',
            'manage classes',
            'manage roadmaps',
            'manage schedules',
            'manage matching',
            'manage departures',
            'manage announcements',
            'view classes',
            'input attendance',
            'input grades',
            'input assignments',
            'send messages',
            'view own dashboard',
            'view own schedules',
            'view own grades',
            'view own attendance',
            'view own documents',
            'edit own profile',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Assign all permissions to Super Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        $superAdmin->syncPermissions(Permission::all());

        // Dashboard viewers
        $admin = Role::where('name', 'Admin')->first();
        $admin->syncPermissions(['view dashboard']);

        $sachou = Role::where('name', 'Sachou')->first();
        $sachou->syncPermissions(['view dashboard']);

        $staffAkademik = Role::where('name', 'Staff Akademik')->first();
        $staffAkademik->syncPermissions([
            'view dashboard',
            'manage batches',
            'manage students',
            'manage documents',
            'manage classes',
            'manage roadmaps',
            'manage schedules',
            'manage matching',
            'manage departures',
            'manage announcements',
            'send messages',
        ]);

        $sensei = Role::where('name', 'Sensei')->first();
        $sensei->syncPermissions([
            'view classes',
            'manage classes',
            'manage schedules',
            'manage announcements',
            'input attendance',
            'input grades',
            'input assignments',
            'send messages',
        ]);

        $siswa = Role::where('name', 'Siswa')->first();
        $siswa->syncPermissions([
            'view own dashboard',
            'view own schedules',
            'view own grades',
            'view own attendance',
            'view own documents',
            'edit own profile',
            'send messages',
        ]);
    }
}
