<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $query = Teacher::with('user');

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw("LOWER(COALESCE(specialization, '')) LIKE ?", [$search])
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->whereRaw('LOWER(name) LIKE ?', [$search]);
                  });
            });
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $teachers = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($teachers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'nip' => 'nullable|string|unique:teachers,nip',
            'specialization' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            $user->assignRole('Sensei');

            $teacher = Teacher::create([
                'user_id' => $user->id,
                'nip' => $validated['nip'] ?? null,
                'specialization' => $validated['specialization'] ?? null,
            ]);

            $teacher->load('user');
            return response()->json($teacher, 201);
        });
    }

    public function show(Teacher $teacher)
    {
        $teacher->load('user');
        return response()->json($teacher);
    }

    public function update(Request $request, Teacher $teacher)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $teacher->user_id,
            'nip' => 'nullable|string|unique:teachers,nip,' . $teacher->id,
            'specialization' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($validated, $teacher) {
            if (isset($validated['name']) || isset($validated['email'])) {
                $teacher->user->update(array_filter([
                    'name' => $validated['name'] ?? null,
                    'email' => $validated['email'] ?? null,
                ]));
            }

            $teacher->update(array_filter([
                'nip' => $validated['nip'] ?? null,
                'specialization' => $validated['specialization'] ?? null,
            ], fn($v) => $v !== null));

            $teacher->load('user');
            return response()->json($teacher);
        });
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->user->delete();
        return response()->json(['message' => 'Teacher deleted successfully']);
    }
}
