<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Enrollment;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with(['enrollment.student.user', 'enrollment.batch', 'schedule.batch', 'schedule.studyClass.subject', 'schedule.studyClass.batch']);

        if ($request->user()?->hasRole('Siswa')) {
            $studentId = $request->user()->student?->id ?: 0;
            $query->whereHas('enrollment', fn ($q) => $q->where('student_id', $studentId));
        }

        if ($request->has('schedule_id')) {
            $query->where('schedule_id', $request->schedule_id);
        }

        if ($request->has('study_class_id')) {
            $query->whereHas('schedule', function($q) use ($request) {
                $q->where('study_class_id', $request->study_class_id);
            });
        }

        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        if ($request->has('enrollment_id')) {
            $query->where('enrollment_id', $request->enrollment_id);
        }

        if ($request->filled('student_id')) {
            $query->whereHas('enrollment', function ($q) use ($request) {
                $q->where('student_id', $request->student_id);
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 50)), 1000);
        $attendances = $query->orderBy('date', 'desc')->paginate($perPage);

        return response()->json($attendances);
    }

    public function store(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat absensi.');

        $validated = $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'schedule_id' => 'required|exists:schedules,id',
            'date' => 'required|date',
            'status' => 'required|string|in:Hadir,Sakit,Izin,Alpa',
            'notes' => 'nullable|string',
        ]);

        $attendance = Attendance::create($validated);
        $attendance->load(['enrollment.student.user', 'schedule.batch', 'schedule.studyClass.batch']);

        return response()->json($attendance, 201);
    }

    /**
     * Bulk store attendances for a schedule on a specific date.
     */
    public function bulkStore(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat absensi.');

        $validated = $request->validate([
            'schedule_id' => 'required|exists:schedules,id',
            'date' => 'required|date',
            'attendances' => 'required|array|min:1',
            'attendances.*.enrollment_id' => 'required|exists:enrollments,id',
            'attendances.*.status' => 'required|string|in:Hadir,Sakit,Izin,Alpa',
            'attendances.*.notes' => 'nullable|string',
        ]);

        $results = [];
        foreach ($validated['attendances'] as $item) {
            $results[] = Attendance::updateOrCreate(
                [
                    'enrollment_id' => $item['enrollment_id'],
                    'schedule_id' => $validated['schedule_id'],
                    'date' => $validated['date'],
                ],
                [
                    'status' => $item['status'],
                    'notes' => $item['notes'] ?? null,
                ]
            );
        }

        // --- Notifications ---
        $actor = $request->user();
        $schedule = \App\Models\Schedule::with('studyClass.batch')->find($validated['schedule_id']);
        $classLabel = $schedule?->studyClass?->name ?? $schedule?->studyClass?->batch?->name ?? 'Kelas';
        $dateLabel = $validated['date'];

        if ($actor) {
            NotificationService::send(
                $actor->id,
                '✅ Absensi Berhasil Dicatat',
                "Absensi untuk {$classLabel} pada {$dateLabel} berhasil dicatat. Total: " . count($results) . " siswa."
            );
        }

        $this->notifyAttendanceStudents($validated['attendances'], $dateLabel, $classLabel);

        return response()->json(['message' => 'Attendance saved successfully', 'count' => count($results)], 201);
    }

    /**
     * Bulk store attendances directly for a class on a specific date.
     */
    public function classBulkStore(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat absensi.');

        $validated = $request->validate([
            'study_class_id' => 'required|exists:study_classes,id',
            'date' => 'required|date',
            'attendances' => 'required|array|min:1',
            'attendances.*.enrollment_id' => 'required|exists:enrollments,id',
            'attendances.*.status' => 'required|string|in:Hadir,Sakit,Izin,Alpa',
            'attendances.*.notes' => 'nullable|string',
            'attendances.*.document_path' => 'nullable|string',
            'attendances.*.end_date' => 'nullable|date|after_or_equal:date',
        ]);

        $dayOfWeek = \Carbon\Carbon::parse($validated['date'])->locale('id')->isoFormat('dddd');

        $schedule = \App\Models\Schedule::where('study_class_id', $validated['study_class_id'])
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if (!$schedule) {
            return response()->json(['message' => "Tidak ada jadwal kelas untuk hari {$dayOfWeek}."], 422);
        }

        $allSchedules = \App\Models\Schedule::where('study_class_id', $validated['study_class_id'])->get();
        $scheduleDays = $allSchedules->pluck('id', 'day_of_week')->toArray();

        $results = [];
        foreach ($validated['attendances'] as $item) {
            if (empty($item['status'])) continue;
            
            // Create for the current date
            $results[] = Attendance::updateOrCreate(
                [
                    'enrollment_id' => $item['enrollment_id'],
                    'schedule_id' => $schedule->id,
                    'date' => $validated['date'],
                ],
                [
                    'status' => $item['status'],
                    'notes' => $item['notes'] ?? null,
                    'document_path' => $item['document_path'] ?? null,
                ]
            );

            // Create for future dates if end_date is provided
            if (!empty($item['end_date']) && $item['end_date'] > $validated['date']) {
                $startDate = \Carbon\Carbon::parse($validated['date'])->addDay();
                $endDate = \Carbon\Carbon::parse($item['end_date']);
                
                for ($d = $startDate; $d->lte($endDate); $d->addDay()) {
                    $dayName = $d->locale('id')->isoFormat('dddd');
                    if (isset($scheduleDays[$dayName])) {
                        $results[] = Attendance::updateOrCreate(
                            [
                                'enrollment_id' => $item['enrollment_id'],
                                'schedule_id' => $scheduleDays[$dayName],
                                'date' => $d->format('Y-m-d'),
                            ],
                            [
                                'status' => $item['status'],
                                'notes' => $item['notes'] ?? null,
                                'document_path' => $item['document_path'] ?? null,
                            ]
                        );
                    }
                }
            }
        }

        // --- Notifications ---
        $actor = $request->user();
        $schedule->load('studyClass.batch');
        $classLabel = $schedule->studyClass?->name ?? $schedule->studyClass?->batch?->name ?? 'Kelas';
        $dateLabel = $validated['date'];

        if ($actor) {
            NotificationService::send(
                $actor->id,
                '✅ Absensi Berhasil Dicatat',
                "Absensi untuk {$classLabel} pada {$dateLabel} berhasil dicatat. Total: " . count($results) . " siswa."
            );
        }

        $attendancesWithStatus = array_filter($validated['attendances'], fn($i) => !empty($i['status']));
        $this->notifyAttendanceStudents($attendancesWithStatus, $dateLabel, $classLabel);

        return response()->json(['message' => 'Attendance saved successfully', 'count' => count($results)], 201);
    }

    public function show(Request $request, Attendance $attendance)
    {
        $attendance->loadMissing('enrollment');
        abort_if(
            $request->user()?->hasRole('Siswa') && $attendance->enrollment?->student_id !== $request->user()->student?->id,
            403,
            'Siswa hanya dapat melihat absensi sendiri.'
        );

        $attendance->load(['enrollment.student.user', 'schedule.batch', 'schedule.studyClass']);
        return response()->json($attendance);
    }

    public function update(Request $request, Attendance $attendance)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat absensi.');

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:Hadir,Sakit,Izin,Alpa',
            'notes' => 'nullable|string',
        ]);

        $attendance->update($validated);
        $attendance->load(['enrollment.student.user', 'schedule.batch', 'schedule.studyClass.batch']);

        return response()->json($attendance);
    }

    public function destroy(Request $request, Attendance $attendance)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat absensi.');

        $attendance->delete();
        return response()->json(['message' => 'Attendance deleted']);
    }

    /**
     * Notify each student about their individual attendance status.
     * Also notifies admins if a student is marked Alpa.
     */
    private function notifyAttendanceStudents(array $attendances, string $dateLabel, string $classLabel): void
    {
        foreach ($attendances as $item) {
            $enrollment = Enrollment::with('student.user')->find($item['enrollment_id']);
            $studentUser = $enrollment?->student?->user;
            if (!$studentUser) continue;

            $status = $item['status'];
            $icon   = $status === 'Hadir' ? '✅' : ($status === 'Alpa' ? '❌' : '🟡');

            NotificationService::send(
                $studentUser->id,
                "{$icon} Absensi Anda Telah Dicatat",
                "Status kehadiran Anda pada {$dateLabel} untuk kelas {$classLabel} dicatat sebagai: {$status}."
            );

            if ($status === 'Alpa') {
                NotificationService::sendToAdmins(
                    '⚠️ Siswa Alpa',
                    "{$studentUser->name} tercatat Alpa pada {$dateLabel} di kelas {$classLabel}."
                );
            }
        }
    }

    public function uploadDocument(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa tidak dapat mengunggah dokumen dari sini.');

        $request->validate([
            'document' => 'required|file|mimes:pdf|max:5120',
        ]);

        $path = $request->file('document')->store('attendance_documents', 'public');

        return response()->json(['path' => $path], 200);
    }
}
