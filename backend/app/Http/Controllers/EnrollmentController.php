<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Batch;
use App\Services\NotificationService;
use App\Services\RaportSnapshotService;
use App\Traits\EnsuresBatchCapacity;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    use EnsuresBatchCapacity;
    public function index(Request $request)
    {
        $query = Enrollment::with(['student.user', 'batch.teacher.user']);

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->whereHas('student.user', function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(email) LIKE ?', [$search]);
            })->orWhereHas('batch', function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('batch_id')) {
            $query->where('batch_id', $request->batch_id);
        }
        
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $enrollments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($enrollments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'batch_id' => 'required|exists:batches,id',
            'status' => 'required|in:active,completed,cancelled,dropped',
        ]);

        // Prevent duplicate active enrollments
        $existing = Enrollment::where('student_id', $validated['student_id'])
            ->where('batch_id', $validated['batch_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Student is already enrolled in this batch.',
                'errors' => ['student_id' => ['Student is already enrolled in this batch.']]
            ], 422);
        }

        $this->ensureBatchCanReceiveStudent((int) $validated['batch_id']);

        $enrollment = Enrollment::create($validated);
        $enrollment->load(['student.user', 'batch.teacher.user']);

        return response()->json($enrollment, 201);
    }

    public function show(Enrollment $enrollment)
    {
        $enrollment->load(['student.user', 'batch.teacher.user']);
        return response()->json($enrollment);
    }

    public function update(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'student_id' => 'sometimes|required|exists:students,id',
            'batch_id' => 'sometimes|required|exists:batches,id',
            'status' => 'sometimes|required|in:active,completed,cancelled,dropped',
        ]);

        if (isset($validated['student_id']) || isset($validated['batch_id'])) {
            $studentId = $validated['student_id'] ?? $enrollment->student_id;
            $batchId = $validated['batch_id'] ?? $enrollment->batch_id;

            $existing = Enrollment::where('student_id', $studentId)
                ->where('batch_id', $batchId)
                ->where('id', '!=', $enrollment->id)
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Student is already enrolled in this batch.',
                    'errors' => ['student_id' => ['Student is already enrolled in this batch.']]
                ], 422);
            }

            if ($batchId !== $enrollment->batch_id) {
                $this->ensureBatchCanReceiveStudent((int) $batchId);

                // ── Raport Snapshot (Batch Transfer) ──────────────────────────
                // Student is being moved to a different batch (e.g. didn't pass).
                // Snapshot their current raport before clearing grades & attendances
                // so their academic history is preserved in Riwayat Raport.
                RaportSnapshotService::snapshotEnrollment($enrollment, 'batch_transfer');
                // ──────────────────────────────────────────────────────────────

                // Clear old data after snapshot
                $enrollment->attendances()->delete();
                $enrollment->grades()->delete();
            }
        }

        // Detect batch change for notifications
        $oldBatchId = $enrollment->getOriginal('batch_id');
        $enrollment->update($validated);
        $enrollment->load(['student.user', 'batch.teacher.user']);

        // Notify if batch changed
        if (isset($validated['batch_id']) && $validated['batch_id'] != $oldBatchId) {
            $newBatchName = $enrollment->batch?->name ?? 'Batch Baru';
            $studentUser  = $enrollment->student?->user;

            if ($studentUser) {
                NotificationService::send(
                    $studentUser->id,
                    '🔄 Batch Anda Telah Diubah',
                    "Anda telah dipindahkan ke {$newBatchName}. Raport kelas sebelumnya telah disimpan di Riwayat Raport. Penilaian di batch baru dimulai dari awal. Silakan hubungi Admin jika ada pertanyaan."
                );
            }

            NotificationService::sendToAdmins(
                '🔄 Siswa Dipindah Batch',
                ($studentUser?->name ?? 'Seorang siswa') . " telah dipindahkan ke {$newBatchName}. Raport lama siswa telah diarsipkan secara otomatis."
            );
        }

        return response()->json($enrollment);
    }

    public function destroy(Enrollment $enrollment)
    {
        $enrollment->delete();
        return response()->json(['message' => 'Enrollment deleted successfully']);
    }

    /**
     * Sensei publishes/unpublishes raport for a student enrollment
     */
    public function publishRaport(Enrollment $enrollment)
    {
        $wasPublished = $enrollment->raport_published_at !== null;

        if ($wasPublished) {
            // Toggle off — unpublish
            $enrollment->update([
                'raport_published_at'  => null,
                'raport_published_by'  => null,
            ]);
            return response()->json(['message' => 'Raport berhasil dibatalkan publisnya', 'published' => false]);
        }

        // Publish
        $enrollment->update([
            'raport_published_at' => now(),
            'raport_published_by' => \Illuminate\Support\Facades\Auth::id(),
        ]);

        // Notify student
        $studentUser = $enrollment->student?->user;
        if ($studentUser) {
            NotificationService::send(
                $studentUser->id,
                '📋 Raport Tersedia',
                'Raport nilai kamu telah diterbitkan oleh Sensei. Silakan lihat di menu Akademik.'
            );
        }

        return response()->json(['message' => 'Raport berhasil diterbitkan', 'published' => true]);
    }

    /**
     * Get enrollments for the currently logged-in student (with raport publish status)
     */
    public function myEnrollments()
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $student = $user?->student;

        if (!$student) {
            return response()->json([]);
        }

        $enrollments = $student->enrollments()
            ->with(['batch.teacher.user', 'studyClasses'])
            ->get();

        return response()->json($enrollments);
    }
}
