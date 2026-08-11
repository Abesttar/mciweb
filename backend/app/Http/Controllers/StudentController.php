<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use App\Models\Batch;
use App\Models\Enrollment;
use App\Models\Notification;
use App\Mail\UserInvitationMail;
use App\Services\NotificationService;
use App\Traits\EnsuresBatchCapacity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class StudentController extends Controller
{
    use EnsuresBatchCapacity;

    /** Semua field dokumen siswa yang bisa di-upload. */
    private const DOCUMENT_FIELDS = [
        'ijazah', 'ktp', 'akte_kelahiran', 'kk',
        'jft_jlpt', 'ssw', 'cv', 'visa_document', 'coe', 'work_contract',
    ];
    public function index(Request $request)
    {
        $query = Student::with(['user', 'enrollments.batch.teacher.user', 'roadmaps.roadmapStage'])->withSum('payments', 'amount');

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw("LOWER(COALESCE(nis, '')) LIKE ?", [$search])
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->whereRaw('LOWER(name) LIKE ?', [$search])
                         ->orWhereRaw('LOWER(email) LIKE ?', [$search]);
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('batch_id')) {
            $query->whereHas('enrollments', function ($q) use ($request) {
                $q->where('batch_id', $request->batch_id);
            });
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $students = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($students);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email:rfc,dns|max:255|unique:users',
            'password' => 'required|string|min:8',
            'nis' => 'nullable|string|max:50|unique:students',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive,graduated',
            'work_placement' => 'nullable|string|max:255',
            'job_type' => 'nullable|string|max:255',
            'visa_type' => 'nullable|string|max:100',
            'batch_id' => 'nullable|exists:batches,id',
            'require_documents' => 'nullable|boolean',
            'ijazah' => 'required_if:require_documents,1|nullable|file|max:512000',
            'ktp' => 'required_if:require_documents,1|nullable|file|max:512000',
            'akte_kelahiran' => 'required_if:require_documents,1|nullable|file|max:512000',
            'kk' => 'required_if:require_documents,1|nullable|file|max:512000',
            'jft_jlpt' => 'nullable|file|max:512000',
            'ssw' => 'nullable|file|max:512000',
            'cv' => 'nullable|file|max:512000',
        ]);

        $documentPaths = [];
        $docFields = array_intersect(self::DOCUMENT_FIELDS, ['ijazah', 'ktp', 'akte_kelahiran', 'kk', 'jft_jlpt', 'ssw', 'cv']);
        foreach ($docFields as $field) {
            if ($request->hasFile($field)) {
                $documentPaths[$field] = $request->file($field)->store('student_documents', 'public');
            }
        }

        return DB::transaction(function () use ($validated, $documentPaths) {
            if (!empty($validated['batch_id'])) {
                $this->ensureBatchCanReceiveStudent((int) $validated['batch_id']);
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            $user->assignRole('Siswa');

            $studentData = [
                'user_id' => $user->id,
                'nis' => $validated['nis'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'emergency_contact' => $validated['emergency_contact'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'work_placement' => $validated['work_placement'] ?? null,
                'job_type' => $validated['job_type'] ?? null,
                'visa_type' => $validated['visa_type'] ?? null,
            ];

            $student = Student::create(array_merge($studentData, $documentPaths));

            if (!empty($validated['batch_id'])) {
                Enrollment::create([
                    'student_id' => $student->id,
                    'batch_id' => $validated['batch_id'],
                    'status' => 'active',
                ]);
            }

            // Notify Admin & Sachou
            NotificationService::sendToAdmins(
                '👤 Siswa Baru Didaftarkan',
                "Siswa baru atas nama {$user->name} telah berhasil didaftarkan" . (!empty($validated['batch_id']) ? " ke batch #{$validated['batch_id']}." : ' (belum ditempatkan di batch).')
            );

            // Welcome notification for the new student
            NotificationService::send(
                $user->id,
                '🎉 Selamat Bergabung!',
                "Akun Anda di LPK Mirai Crown Indonesia telah berhasil dibuat. Selamat datang, {$user->name}! Mulai lengkapi profil Anda."
            );

            $student->load(['user', 'enrollments.batch.teacher.user']);
            return response()->json($student, 201);
        });

        // Send invitation email AFTER transaction commits
        try {
            $studentUser = \App\Models\User::where('email', $validated['email'])->first();
            if ($studentUser) {
                Mail::to($studentUser->email)->send(new UserInvitationMail($studentUser->name, $studentUser->email, $validated['password'], 'Siswa (Kenshusei)'));
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send student invitation email: ' . $e->getMessage());
        }
    }

    public function show(Student $student)
    {
        $student->load([
            'user', 
            'enrollments.batch.teacher.user',
            'enrollments.studyClass.subject',
            'enrollments.studyClasses.subject',
            'enrollments.attendances',
            'enrollments.grades.subject',
            'roadmaps.stage',
            'roadmaps.roadmapStage',
            'documents.documentType',
            'matchings.company',
            'departures.company'
        ]);
        return response()->json($student);
    }

    public function me(Request $request)
    {
        $student = $request->user()->student;

        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        return $this->show($student);
    }

    public function update(Request $request, Student $student)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $student->user_id,
            'nis' => 'nullable|string|unique:students,nis,' . $student->id,
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:255',
            'status' => 'in:active,inactive,graduated',
            'work_placement' => 'nullable|string|max:255',
            'job_type' => 'nullable|string|max:255',
            'visa_type' => 'nullable|string|max:100',
            'ijazah' => 'nullable|file|max:512000',
            'ktp' => 'nullable|file|max:512000',
            'akte_kelahiran' => 'nullable|file|max:512000',
            'kk' => 'nullable|file|max:512000',
            'jft_jlpt' => 'nullable|file|max:512000',
            'ssw' => 'nullable|file|max:512000',
            'cv' => 'nullable|file|max:512000',
            'visa_document' => 'nullable|file|max:512000',
            'coe' => 'nullable|file|max:512000',
            'work_contract' => 'nullable|file|max:512000',
        ]);

        $documentPaths = [];
        foreach (self::DOCUMENT_FIELDS as $field) {
            if ($request->hasFile($field)) {
                $documentPaths[$field] = $request->file($field)->store('student_documents', 'public');
            }
        }

        return DB::transaction(function () use ($validated, $documentPaths, $student) {
            if (isset($validated['name']) || isset($validated['email'])) {
                $student->user->update(array_filter([
                    'name' => $validated['name'] ?? null,
                    'email' => $validated['email'] ?? null,
                ]));
            }

            $updateData = array_filter([
                'nis' => $validated['nis'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'emergency_contact' => $validated['emergency_contact'] ?? null,
                'status' => $validated['status'] ?? null,
                'work_placement' => $validated['work_placement'] ?? null,
                'job_type' => $validated['job_type'] ?? null,
                'visa_type' => $validated['visa_type'] ?? null,
            ], fn($v) => $v !== null);

            $student->update(array_merge($updateData, $documentPaths));

            $student->load('user');
            return response()->json($student);
        });
    }

    public function destroy(Student $student)
    {
        $student->user->delete(); // cascades to student
        return response()->json(['message' => 'Student deleted successfully']);
    }

    public function downloadDocument(Student $student, string $field)
    {
        $allowedFields = ['ijazah', 'ktp', 'akte_kelahiran', 'kk', 'jft_jlpt', 'ssw', 'cv'];
        if (!in_array($field, $allowedFields)) {
            return response()->json(['message' => 'Invalid document field'], 400);
        }

        $filePath = $student->$field;
        if (!$filePath || !\Illuminate\Support\Facades\Storage::disk('public')->exists($filePath)) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $student->load('user');
        $studentName = $student->user->name ?? 'Siswa';
        $label = strtoupper(str_replace('_', ' ', $field));
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $fileName = "{$label} {$studentName}.{$extension}";

        return \Illuminate\Support\Facades\Storage::disk('public')->download($filePath, $fileName);
    }
}
