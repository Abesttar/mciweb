<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Services\RaportSnapshotService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function index(Request $request)
    {
        $query = Batch::with('teacher.user');

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->whereRaw('LOWER(name) LIKE ?', [$search]);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $batches = $query->withCount('enrollments')->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($batches);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'in:active,completed,cancelled',
            'quota' => 'nullable|integer|min:1|max:20',
            'class_level' => 'nullable|in:shou,chuu,kou,jft,kelas_kaiwa',
            'teacher_id' => 'nullable|exists:teachers,id',
        ]);

        $validated['quota'] = $validated['quota'] ?? 20;

        $batch = Batch::create($validated);

        return response()->json($batch, 201);
    }

    public function show(Batch $batch)
    {
        $batch->loadCount('enrollments');
        $batch->load(['teacher.user', 'enrollments.student.user', 'enrollments.student.roadmaps.roadmapStage']);
        return response()->json($batch);
    }

    public function update(Request $request, Batch $batch)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'status'      => 'in:active,completed,cancelled',
            'quota'       => 'nullable|integer|min:1|max:20',
            'class_level' => 'nullable|in:shou,chuu,kou,jft,kelas_kaiwa',
            'teacher_id'  => 'nullable|exists:teachers,id',
        ]);

        $oldClassLevel = $batch->class_level;
        $newClassLevel = $validated['class_level'] ?? $oldClassLevel;
        $classLevelChanged = isset($validated['class_level']) && $validated['class_level'] !== $oldClassLevel;

        // ── Raport Snapshot ──────────────────────────────────────────────────
        // When class_level changes, snapshot every enrolled student's current
        // raport (grades + attendance summary) before wiping grades.
        if ($classLevelChanged) {
            $snapshotCount = RaportSnapshotService::snapshotBatch($batch->id, 'class_level_change');

            // Notify all enrolled students that their class was upgraded and raport was archived
            $classLevelLabels = [
                'shou'        => 'Shou (初級)',
                'chuu'        => 'Chuu (中級)',
                'kou'         => 'Kou (高級)',
                'jft'         => 'JFT',
                'kelas_kaiwa' => 'Kelas Kaiwa',
            ];
            $oldLabel = $classLevelLabels[$oldClassLevel] ?? $oldClassLevel;
            $newLabel = $classLevelLabels[$newClassLevel] ?? $newClassLevel;

            $enrollments = \App\Models\Enrollment::where('batch_id', $batch->id)
                ->whereIn('status', ['active', 'completed'])
                ->with('student.user')
                ->get();

            foreach ($enrollments as $enrollment) {
                $studentUser = $enrollment->student?->user;
                if ($studentUser) {
                    NotificationService::send(
                        $studentUser->id,
                        '📚 Kelas Dinaikkan',
                        "Selamat! Kelas batch \"{$batch->name}\" telah dinaikkan dari {$oldLabel} ke {$newLabel}. Raport kelas {$oldLabel} Anda telah disimpan di Riwayat Raport. Penilaian kelas baru dimulai dari awal."
                    );
                }
            }

            // Also notify admins
            NotificationService::sendToAdmins(
                '📚 Kelas Batch Dinaikkan',
                "Kelas batch \"{$batch->name}\" diubah dari {$oldLabel} ke {$newLabel}. {$snapshotCount} raport siswa telah di-arsipkan."
            );
        }
        // ────────────────────────────────────────────────────────────────────

        $batch->update($validated);

        if ($classLevelChanged) {
            $classType = $newClassLevel;
            if ($classType === 'kelas_kaiwa') $classType = 'kaiwa';

            $batch->studyClasses()->update(['class_type' => $classType]);
        }

        return response()->json($batch);
    }

    public function destroy(Batch $batch)
    {
        $batch->delete();
        return response()->json(['message' => 'Batch deleted successfully']);
    }
}
