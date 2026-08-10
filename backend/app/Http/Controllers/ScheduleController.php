<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Schedule;
use App\Models\StudyClass;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::with(['batch.teacher.user', 'studyClass.subject', 'studyClass.teacher.user', 'studyClass.batch']);

        if ($request->user()?->hasRole('Siswa')) {
            $batchIds = $this->studentBatchIds($request);
            $query->where(function ($q) use ($batchIds) {
                $q->whereIn('batch_id', $batchIds)
                    ->orWhereHas('studyClass', fn ($classQuery) => $classQuery->whereIn('batch_id', $batchIds));
            });
        }

        // Sensei hanya melihat jadwal kelas yang dia ajar
        if ($request->user()?->hasRole('Sensei') && !$request->user()?->hasAnyRole(['Super Admin', 'Admin'])) {
            $teacherId = $request->user()?->teacher?->id;
            if ($teacherId) {
                $query->where(function ($q) use ($teacherId) {
                    $q->whereHas('studyClass', fn ($classQuery) => $classQuery->where('teacher_id', $teacherId))
                      ->orWhereHas('batch', fn ($batchQuery) => $batchQuery->where('teacher_id', $teacherId));
                });
            }
        }

        if ($request->has('study_class_id')) {
            $query->where('study_class_id', $request->study_class_id);
        }

        if ($request->filled('batch_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('batch_id', $request->batch_id)
                    ->orWhereHas('studyClass', fn ($classQuery) => $classQuery->where('batch_id', $request->batch_id));
            });
        }

        if ($request->filled('schedule_month')) {
            $query->where('schedule_month', $this->normalizeMonth($request->schedule_month));
        }

        if ($request->has('day_of_week')) {
            $query->where('day_of_week', $request->day_of_week);
        }
        
        if ($request->filled('room')) {
            $query->whereRaw("LOWER(COALESCE(room, '')) LIKE ?", ['%' . strtolower($request->room) . '%']);
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $schedules = $query->orderBy('schedule_month', 'desc')->orderBy('day_of_week')->orderBy('start_time')->paginate($perPage);

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat jadwal.');

        $validated = $request->validate([
            'study_class_id' => 'nullable|exists:study_classes,id',
            'batch_id' => 'required_without:study_class_id|nullable|exists:batches,id',
            'schedule_month' => 'required|string|max:10',
            'day_of_week' => 'nullable|string|max:50',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:255',
        ]);

        $validated = $this->prepareScheduleData($validated);

        $schedule = Schedule::create($validated);
        $schedule->load(['batch.teacher.user', 'studyClass.subject', 'studyClass.teacher.user', 'studyClass.batch']);

        return response()->json($schedule, 201);
    }

    public function show(Request $request, Schedule $schedule)
    {
        $this->ensureStudentCanViewSchedule($request, $schedule);

        $schedule->load(['batch.teacher.user', 'studyClass.subject', 'studyClass.teacher.user', 'studyClass.batch']);
        return response()->json($schedule);
    }

    public function update(Request $request, Schedule $schedule)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat jadwal.');

        $validated = $request->validate([
            'study_class_id' => 'nullable|exists:study_classes,id',
            'batch_id' => 'nullable|exists:batches,id',
            'schedule_month' => 'nullable|string|max:10',
            'day_of_week' => 'nullable|string|max:50',
            'start_time' => 'nullable|date_format:H:i:s,H:i',
            'end_time' => 'nullable|date_format:H:i:s,H:i|after:start_time',
            'room' => 'nullable|string|max:255',
        ]);

        $validated = $this->prepareScheduleData($validated, $schedule);

        $schedule->update($validated);
        $schedule->load(['batch.teacher.user', 'studyClass.subject', 'studyClass.teacher.user', 'studyClass.batch']);

        return response()->json($schedule);
    }

    public function destroy(Request $request, Schedule $schedule)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat jadwal.');

        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted successfully']);
    }

    private function prepareScheduleData(array $validated, ?Schedule $schedule = null): array
    {
        $validated['day_of_week'] = $validated['day_of_week'] ?? 'Bulanan';
        $validated['start_time'] = $this->normalizeTime($validated['start_time'] ?? '08:00');
        $validated['end_time'] = $this->normalizeTime($validated['end_time'] ?? '15:30');

        if (!empty($validated['schedule_month'])) {
            $validated['schedule_month'] = $this->normalizeMonth($validated['schedule_month']);
        }

        if (!empty($validated['batch_id'])) {
            $batch = Batch::with('teacher')->findOrFail($validated['batch_id']);
            $validated['class_level'] = $batch->class_level;
            $validated['study_class_id'] = $this->findOrCreateBatchClass($batch)->id;
        } elseif (!empty($validated['study_class_id'])) {
            $studyClass = StudyClass::with('batch')->findOrFail($validated['study_class_id']);
            $validated['batch_id'] = $studyClass->batch_id;
            $validated['class_level'] = $studyClass->batch?->class_level;
        } elseif ($schedule) {
            $validated['batch_id'] = $schedule->batch_id;
            $validated['class_level'] = $schedule->class_level;
            $validated['study_class_id'] = $schedule->study_class_id;
        }

        return $validated;
    }

    private function findOrCreateBatchClass(Batch $batch): StudyClass
    {
        $subject = Subject::firstOrCreate(
            ['name' => 'Tingkat Kelas'],
            ['description' => 'Data internal untuk jadwal dan nilai berbasis tingkat kelas.']
        );
        $teacherId = $batch->teacher_id ?? Teacher::query()->value('id');

        abort_if(!$teacherId, 422, 'Atur sensei terlebih dahulu sebelum membuat jadwal batch.');

        return StudyClass::firstOrCreate(
            [
                'batch_id' => $batch->id,
                'name' => $this->formatClassLevel($batch->class_level),
            ],
            [
                'subject_id' => $subject->id,
                'teacher_id' => $teacherId,
            ]
        );
    }

    private function normalizeMonth(string $month): string
    {
        return strlen($month) === 7 ? $month.'-01' : $month;
    }

    private function normalizeTime(string $time): string
    {
        return strlen($time) === 5 ? $time : substr($time, 0, 5);
    }

    private function formatClassLevel(?string $level): string
    {
        return match ($level) {
            'shou' => 'Shou',
            'chuu' => 'Chuu',
            'kou' => 'Kou',
            'kelas_kaiwa' => 'Kelas Kaiwa',
            default => 'Shou',
        };
    }

    private function studentBatchIds(Request $request): array
    {
        $student = $request->user()?->student;

        if (!$student) {
            return [];
        }

        return $student->enrollments()->pluck('batch_id')->all();
    }

    private function ensureStudentCanViewSchedule(Request $request, Schedule $schedule): void
    {
        if (!$request->user()?->hasRole('Siswa')) {
            return;
        }

        $schedule->loadMissing('studyClass');
        $batchId = $schedule->batch_id ?: $schedule->studyClass?->batch_id;

        abort_if(!in_array($batchId, $this->studentBatchIds($request), true), 403, 'Siswa hanya dapat melihat jadwal sendiri.');
    }
}
