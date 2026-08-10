<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Student;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Assignment::with(['studyClass.batch', 'studyClass.subject', 'studyClass.teacher.user', 'student.user']);

        if ($request->user()?->hasRole('Siswa')) {
            $student = $request->user()->student;
            $batchIds = $student ? $student->enrollments()->pluck('batch_id')->all() : [];

            $query->where(function ($q) use ($student, $batchIds) {
                $q->when($student, fn ($studentQuery) => $studentQuery->where('student_id', $student->id))
                    ->orWhere(function ($subQuery) use ($batchIds) {
                        $subQuery->whereNull('student_id')
                            ->whereHas('studyClass', fn ($classQuery) => $classQuery->whereIn('batch_id', $batchIds));
                    });
            });
        }

        if ($request->filled('study_class_id')) {
            $query->where('study_class_id', $request->study_class_id);
        }

        if (!$request->user()?->hasRole('Siswa') && $request->filled('student_id')) {
            $student = Student::find($request->student_id);
            $batchIds = $student
                ? $student->enrollments()->pluck('batch_id')->all()
                : [];

            $query->where(function ($q) use ($request, $batchIds) {
                $q->where('student_id', $request->student_id)
                    ->orWhere(function ($subQuery) use ($batchIds) {
                        $subQuery->whereNull('student_id')
                            ->whereHas('studyClass', function ($classQuery) use ($batchIds) {
                                $classQuery->whereIn('batch_id', $batchIds);
                            });
                    });
            });
        }

        if ($request->filled('search')) {
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . strtolower($request->search) . '%']);
        }

        $perPage = min((int) $request->integer('per_page', $request->integer('limit', 50)), 1000);
        $assignments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat tugas.');

        $validated = $request->validate([
            'study_class_id' => 'required|exists:study_classes,id',
            'student_id' => 'nullable|exists:students,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'required|date',
            'document' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:20480', // Max 20MB
        ]);

        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('assignments', 'public');
            $validated['document_path'] = $path;
        }

        $assignment = Assignment::create($validated);
        $assignment->load(['studyClass.batch', 'studyClass.subject', 'studyClass.teacher.user', 'student.user']);

        // Send notifications
        $this->notifyStudents($assignment);

        return response()->json($assignment, 201);
    }

    private function notifyStudents(Assignment $assignment)
    {
        $title = "Tugas Baru: {$assignment->title}";
        $message = "Tugas baru telah ditambahkan untuk kelas {$assignment->studyClass->name}. Tenggat: {$assignment->due_date}";

        if ($assignment->student_id) {
            // Notify specific student
            if ($assignment->student && $assignment->student->user_id) {
                \App\Models\Notification::create([
                    'user_id' => $assignment->student->user_id,
                    'title' => $title,
                    'message' => $message,
                ]);
            }
        } else {
            // Notify all students in the batch of the study class
            $batchId = $assignment->studyClass->batch_id;
            if ($batchId) {
                $enrollments = \App\Models\Enrollment::with('student')->where('batch_id', $batchId)->where('status', 'active')->get();
                foreach ($enrollments as $enrollment) {
                    if ($enrollment->student && $enrollment->student->user_id) {
                        \App\Models\Notification::create([
                            'user_id' => $enrollment->student->user_id,
                            'title' => $title,
                            'message' => $message,
                        ]);
                    }
                }
            }
        }
    }

    public function show(Request $request, Assignment $assignment)
    {
        if ($request->user()?->hasRole('Siswa')) {
            $student = $request->user()->student;
            $batchIds = $student ? $student->enrollments()->pluck('batch_id')->all() : [];
            $assignment->loadMissing('studyClass');

            abort_if(
                !$student || ($assignment->student_id && $assignment->student_id !== $student->id)
                    || (!$assignment->student_id && !in_array($assignment->studyClass?->batch_id, $batchIds, true)),
                403,
                'Siswa hanya dapat melihat tugas sendiri.'
            );
        }

        $assignment->load(['studyClass.batch', 'studyClass.subject', 'studyClass.teacher.user', 'student.user']);
        return response()->json($assignment);
    }

    public function update(Request $request, Assignment $assignment)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat tugas.');

        $validated = $request->validate([
            'study_class_id' => 'sometimes|required|exists:study_classes,id',
            'student_id' => 'nullable|exists:students,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'sometimes|required|date',
            'document' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:20480', // Max 20MB
        ]);

        if ($request->hasFile('document')) {
            // Delete old file if exists
            if ($assignment->document_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($assignment->document_path);
            }
            $path = $request->file('document')->store('assignments', 'public');
            $validated['document_path'] = $path;
        }

        $assignment->update($validated);
        $assignment->load(['studyClass.batch', 'studyClass.subject', 'studyClass.teacher.user', 'student.user']);

        return response()->json($assignment);
    }

    public function destroy(Request $request, Assignment $assignment)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa hanya dapat melihat tugas.');

        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted']);
    }
}
