<?php

namespace App\Http\Controllers;

use App\Models\StudyClass;
use App\Models\Subject;
use Illuminate\Http\Request;

class StudyClassController extends Controller
{
    public function index(Request $request)
    {
        $query = StudyClass::with(['batch', 'subject', 'teacher.user']);

        $isArchived = $request->boolean('is_archived', false);
        $query->where('is_archived', $isArchived);

        if ($request->has('batch_id')) {
            $query->where('batch_id', $request->batch_id);
        }

        if ($request->filled('search')) {
            $query->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($request->search) . '%']);
        }

        // Jika user adalah Sensei (dan bukan admin), hanya tampilkan kelas yang dia ajar
        if ($request->user() && $request->user()->hasRole('Sensei') && !$request->user()->hasAnyRole(['Super Admin', 'Admin'])) {
            if ($request->user()->teacher) {
                $query->where('teacher_id', $request->user()->teacher->id);
            }
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 15)), 1000);
        $classes = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($classes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'class_type' => 'required|in:shou,chuu,kou,jft,kaiwa',
            'batch_id' => 'required_unless:class_type,kaiwa|nullable|exists:batches,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'teacher_id' => 'nullable|exists:teachers,id',
            'schedule_info' => 'nullable|string|max:255',
        ]);

        // Sensei: otomatis isi teacher_id dengan data sensei yang login
        if (!isset($validated['teacher_id']) || !$validated['teacher_id']) {
            if ($request->user()?->hasRole('Sensei') && $request->user()?->teacher) {
                $validated['teacher_id'] = $request->user()->teacher->id;
            }
        }

        abort_if(empty($validated['teacher_id']), 422, 'Sensei wajib diisi.');

        $validated['subject_id'] = $validated['subject_id'] ?? Subject::getDefaultId();

        $class = StudyClass::create($validated);
        
        $this->syncSchedules($class);

        $class->load(['batch', 'subject', 'teacher.user']);

        return response()->json($class, 201);
    }

    public function show(StudyClass $studyClass)
    {
        $studyClass->load(['batch', 'subject', 'teacher.user', 'schedules']);
        return response()->json($studyClass);
    }

    public function update(Request $request, StudyClass $studyClass)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'class_type' => 'sometimes|required|in:shou,chuu,kou,jft,kaiwa',
            'batch_id' => 'sometimes|required_unless:class_type,kaiwa|nullable|exists:batches,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'teacher_id' => 'sometimes|required|exists:teachers,id',
            'schedule_info' => 'nullable|string|max:255',
            'is_archived' => 'sometimes|boolean',
        ]);

        if (array_key_exists('subject_id', $validated) && !$validated['subject_id']) {
            $validated['subject_id'] = Subject::getDefaultId();
        }

        $studyClass->update($validated);
        
        $this->syncSchedules($studyClass);

        $studyClass->load(['batch', 'subject', 'teacher.user']);

        return response()->json($studyClass);
    }

    public function destroy(StudyClass $studyClass)
    {
        $studyClass->delete();
        return response()->json(['message' => 'Class deleted successfully']);
    }

    private function syncSchedules(StudyClass $studyClass)
    {
        if (empty($studyClass->schedule_info)) {
            $studyClass->schedules()->delete();
            return;
        }

        $parts = explode(', ', $studyClass->schedule_info);
        if (count($parts) >= 2) {
            $timePart = array_pop($parts); // format "08:00 - 15:30"
            $days = $parts;
            $times = explode(' - ', $timePart);
            
            if (count($times) === 2) {
                $startTime = trim($times[0]) . (strlen(trim($times[0])) === 5 ? ':00' : '');
                $endTime = trim($times[1]) . (strlen(trim($times[1])) === 5 ? ':00' : '');
                
                // Delete schedules for days that are no longer selected
                $studyClass->schedules()->whereNotIn('day_of_week', $days)->delete();
                
                // Update or create schedule for each selected day
                foreach ($days as $day) {
                    $studyClass->schedules()->updateOrCreate(
                        ['day_of_week' => trim($day)],
                        [
                            'batch_id' => $studyClass->batch_id,
                            'class_level' => $studyClass->class_type,
                            'start_time' => $startTime,
                            'end_time' => $endTime,
                            'schedule_month' => now()->startOfMonth(),
                        ]
                    );
                }
            }
        }
    }
}
