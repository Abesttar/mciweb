<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private const CREATABLE_ROLES = ['Admin', 'Sachou', 'Staff Dokumen', 'Sensei', 'Siswa'];

    public function index(Request $request)
    {
        $query = User::with('roles');
        $authUser = $request->user();

        if (!$authUser->hasRole('Super Admin') && !$authUser->can('manage users')) {
            if ($authUser->hasRole('Siswa')) {
                $student = $authUser->student;
                $teacherUserIds = $student
                    ? $student->enrollments()
                        ->with('batch.teacher')
                        ->get()
                        ->pluck('batch.teacher.user_id')
                        ->filter()
                        ->unique()
                        ->values()
                    : collect();

                $query->whereIn('id', $teacherUserIds);
            } elseif ($authUser->hasRole('Sensei')) {
                $teacherId = $authUser->teacher?->id;
                $studentUserIds = $teacherId
                    ? Student::whereHas('enrollments.batch', function ($q) use ($teacherId) {
                        $q->where('teacher_id', $teacherId);
                    })->pluck('user_id')
                    : collect();

                $query->whereIn('id', $studentUserIds);
            } else {
                $query->role(['Staff Dokumen', 'Sensei', 'Siswa']);
            }
        }

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(email) LIKE ?', [$search]);
            });
        }

        if ($request->has('role')) {
            $query->role($request->role);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Hanya Super Admin yang dapat menambahkan pengguna.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:' . implode(',', self::CREATABLE_ROLES),
        ]);

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            $user->assignRole($validated['role']);

            if ($validated['role'] === 'Siswa') {
                Student::firstOrCreate(['user_id' => $user->id]);
            }

            if ($validated['role'] === 'Sensei') {
                Teacher::firstOrCreate(['user_id' => $user->id]);
            }

            return $user;
        });

        $user->load('roles');

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load('roles');
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Hanya Super Admin yang dapat mengubah pengguna.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|required|string|in:' . implode(',', self::CREATABLE_ROLES),
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);

            if ($validated['role'] === 'Siswa') {
                Student::firstOrCreate(['user_id' => $user->id]);
            }

            if ($validated['role'] === 'Sensei') {
                Teacher::firstOrCreate(['user_id' => $user->id]);
            }
        }

        $user->load('roles');

        return response()->json($user);
    }

    public function destroy(Request $request, User $user)
    {
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Hanya Super Admin yang dapat menghapus pengguna.'], 403);
        }

        // Optional: Prevent deleting the current logged-in user or the only Super Admin
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function getRoles()
    {
        $roles = Role::whereIn('name', self::CREATABLE_ROLES)->orderBy('name')->get();
        return response()->json($roles);
    }
}
