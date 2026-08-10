<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Subject;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(Request $request)
    {
        $query = Grade::with(['enrollment.student.user', 'enrollment.batch', 'subject', 'studyClass']);

        if ($request->user()?->hasRole('Siswa')) {
            $studentId = $request->user()->student?->id ?: 0;
            $query->whereHas('enrollment', fn ($q) => $q->where('student_id', $studentId));
        }

        if ($request->filled('enrollment_id')) {
            $query->where('enrollment_id', $request->enrollment_id);
        }

        if ($request->filled('study_class_id')) {
            $query->where('study_class_id', $request->study_class_id);
        }

        if ($request->filled('student_id')) {
            $query->whereHas('enrollment', function ($q) use ($request) {
                $q->where('student_id', $request->student_id);
            });
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('date')) {
            $query->where('date', $request->date);
        }

        if ($request->filled('chapter')) {
            $query->where('chapter', $request->chapter);
        }

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->search) . '%';
            $query->whereHas('enrollment.student.user', function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search]);
            });
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 50)), 1000);
        $grades = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($grades);
    }

    public function store(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat nilai.');

        $validated = $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'score' => 'required|numeric|min:0|max:100',
            'type' => 'required|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $validated['subject_id'] = $validated['subject_id'] ?? Subject::getDefaultId();

        $grade = Grade::create($validated);
        $grade->load(['enrollment.student.user', 'enrollment.batch', 'subject']);

        return response()->json($grade, 201);
    }

    public function show(Request $request, Grade $grade)
    {
        $grade->loadMissing('enrollment');
        abort_if(
            $request->user()?->hasRole('Siswa') && $grade->enrollment?->student_id !== $request->user()->student?->id,
            403,
            'Siswa hanya dapat melihat nilai sendiri.'
        );

        $grade->load(['enrollment.student.user', 'subject']);
        return response()->json($grade);
    }

    public function update(Request $request, Grade $grade)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat nilai.');

        $validated = $request->validate([
            'enrollment_id' => 'sometimes|required|exists:enrollments,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'score' => 'sometimes|required|numeric|min:0|max:100',
            'type' => 'sometimes|required|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        if (array_key_exists('subject_id', $validated) && !$validated['subject_id']) {
            $validated['subject_id'] = Subject::getDefaultId();
        }

        $grade->update($validated);
        $grade->load(['enrollment.student.user', 'enrollment.batch', 'subject']);

        return response()->json($grade);
    }

    public function destroy(Request $request, Grade $grade)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat nilai.');

        $grade->delete();
        return response()->json(['message' => 'Grade deleted']);
    }

    public function batchStore(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat nilai.');

        $validated = $request->validate([
            'study_class_id' => 'required|exists:study_classes,id',
            'type' => 'required|string|in:daily,weekly,level_exam',
            'date' => 'nullable|date',
            'chapter' => 'nullable|string|max:10',
            'remarks' => 'nullable|string',
            'grades' => 'required|array',
            'grades.*.enrollment_id' => 'required|exists:enrollments,id',
            'grades.*.components' => 'nullable|array',
            'grades.*.is_passed' => 'nullable|boolean',
            'grades.*.score' => 'nullable|numeric|min:0|max:100',
        ]);

        $studyClass = \App\Models\StudyClass::findOrFail($validated['study_class_id']);
        $classType = $studyClass->class_type; // shou, chuu, kou, jft, kaiwa

        // Validate type against class_type
        if ($classType === 'jft' && in_array($validated['type'], ['weekly', 'level_exam'])) {
            return response()->json(['message' => "Tipe penilaian {$validated['type']} tidak berlaku untuk kelas {$classType}."], 422);
        }
        if ($classType === 'kaiwa' && $validated['type'] === 'level_exam') {
            return response()->json(['message' => "Tipe penilaian level_exam tidak berlaku untuk kelas kaiwa."], 422);
        }

        $subjectId = Subject::getDefaultId();
        $isShoChuKou = in_array($classType, ['shou', 'chuu', 'kou']);

        // Fetch attendances for 'daily' grades to automate 'kehadiran' component
        $attendances = collect();
        if ($validated['type'] === 'daily' && !empty($validated['date'])) {
            $scheduleIds = \App\Models\Schedule::where('study_class_id', $studyClass->id)->pluck('id');
            $attendances = \App\Models\Attendance::whereIn('schedule_id', $scheduleIds)
                ->where('date', $validated['date'])
                ->get()
                ->keyBy('enrollment_id');
        }

        $savedGrades = [];
        foreach ($validated['grades'] as $gradeData) {
            $score = $gradeData['score'] ?? null;
            $components = $gradeData['components'] ?? null;
            
            // Calculate components score for all daily grades
            if ($validated['type'] === 'daily') {
                // Ensure components is array
                if (!is_array($components)) {
                    $components = [];
                }
                
                // Automate kehadiran based on attendance
                if (isset($validated['date'])) {
                    $att = $attendances->get($gradeData['enrollment_id']);
                    $components['kehadiran'] = ($att && $att->status === 'Hadir') ? 100 : 0;
                }

                // If no other components provided, and not just trying to save only kehadiran
                if (count($components) <= 1 && !isset($components['kotoba']) && !isset($components['sakubun'])) {
                    continue; 
                }

                $score = $this->calculateScore($classType, $validated['type'], $components);
            } else {
                // Skip weekly/level_exam entries without a score
                if ($score === null || $score === '') continue;
            }

            $uniqueAttributes = [
                'enrollment_id' => $gradeData['enrollment_id'],
                'study_class_id' => $studyClass->id,
                'type' => $validated['type'],
            ];

            // For shou, chuu, kou, kaiwa, daily and weekly grades can be multiple, identified by date
            if (in_array($classType, ['shou', 'chuu', 'kou', 'jft', 'kaiwa']) && in_array($validated['type'], ['daily', 'weekly'])) {
                $uniqueAttributes['date'] = $validated['date'] ?? null;
            }

            $grade = Grade::updateOrCreate(
                $uniqueAttributes,
                [
                    'subject_id' => $subjectId,
                    'score' => $score,
                    'components' => $components,
                    'is_passed' => $gradeData['is_passed'] ?? null,
                    'date' => $validated['date'] ?? null,
                    'chapter' => $validated['chapter'] ?? null,
                    'remarks' => $validated['remarks'] ?? null,
                ]
            );
            $savedGrades[] = $grade;
        }

        // --- Notifications ---
        $actor = $request->user();
        $gradeTypeLabel = ['daily' => 'Harian', 'weekly' => 'Mingguan', 'level_exam' => 'Kenaikan Kelas'][$validated['type']] ?? $validated['type'];
        $dateLabel = isset($validated['date']) ? " tanggal {$validated['date']}" : '';
        $classLabel = $studyClass->name ?? "Kelas #{$studyClass->id}";

        // Notify Sensei (actor) — confirmation
        if ($actor) {
            NotificationService::send(
                $actor->id,
                '✅ Nilai Berhasil Diinput',
                "Anda telah berhasil menginput nilai {$gradeTypeLabel} untuk {$classLabel}{$dateLabel}. Total: " . count($savedGrades) . " siswa."
            );
        }

        // Notify each student whose grade was saved
        foreach ($savedGrades as $grade) {
            $grade->load('enrollment.student.user');
            $studentUser = $grade->enrollment?->student?->user;
            if ($studentUser) {
                NotificationService::send(
                    $studentUser->id,
                    '📊 Nilai Baru Tersedia',
                    "Nilai {$gradeTypeLabel} Anda untuk kelas {$classLabel}{$dateLabel} telah diinput oleh Sensei. Segera cek pada halaman Raport!"
                );
            }
        }

        return response()->json(['message' => 'Grades saved successfully', 'grades' => $savedGrades], 200);
    }

    private function calculateScore(string $classType, string $gradeType, ?array $components): float
    {
        if (!$components) return 0;
        
        $score = 0;
        if ($gradeType === 'daily') {
            if (in_array($classType, ['shou', 'chuu', 'kou'])) {
                // Kehadiran 5, Kotoba 20, Kanji 20, Bunpou 15, Choukai 15, Kaiwa 15, Sikap 10
                $score += ($components['kehadiran'] ?? 0) * 0.05;
                $score += ($components['kotoba'] ?? 0) * 0.20;
                $score += ($components['kanji'] ?? 0) * 0.20;
                $score += ($components['bunpou'] ?? 0) * 0.15;
                $score += ($components['choukai'] ?? 0) * 0.15;
                $score += ($components['kaiwa'] ?? 0) * 0.15;
                $score += ($components['sikap'] ?? 0) * 0.10;
            } elseif ($classType === 'jft') {
                // Kehadiran 5, Kotoba 15, Kanji 20, Bunpou 20, Choukai 15, Kaiwa 15, Sikap 10
                $score += ($components['kehadiran'] ?? 0) * 0.05;
                $score += ($components['kotoba'] ?? 0) * 0.15;
                $score += ($components['kanji'] ?? 0) * 0.20;
                $score += ($components['bunpou'] ?? 0) * 0.20;
                $score += ($components['choukai'] ?? 0) * 0.15;
                $score += ($components['kaiwa'] ?? 0) * 0.15;
                $score += ($components['sikap'] ?? 0) * 0.10;
            } elseif ($classType === 'kaiwa') {
                // Kehadiran 10, Jikoshoukai 10, Sakubun 30, Kaiwa 40, Sikap 10
                $score += ($components['kehadiran'] ?? 0) * 0.10;
                $score += ($components['jikoshoukai'] ?? 0) * 0.10;
                $score += ($components['sakubun'] ?? 0) * 0.30;
                $score += ($components['kaiwa'] ?? 0) * 0.40;
                $score += ($components['sikap'] ?? 0) * 0.10;
            }
        }
        return round($score, 2);
    }

    public function batchDestroy(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat nilai.');

        $validated = $request->validate([
            'study_class_id' => 'required|exists:study_classes,id',
            'type' => 'required|string|in:daily,weekly,level_exam',
            'date' => 'nullable|date',
        ]);

        $query = \App\Models\Grade::where('study_class_id', $validated['study_class_id'])
            ->where('type', $validated['type']);

        if (!empty($validated['date'])) {
            $query->where('date', $validated['date']);
        }

        $deleted = $query->delete();

        return response()->json(['message' => 'Grades deleted successfully', 'deleted_count' => $deleted], 200);
    }
}
