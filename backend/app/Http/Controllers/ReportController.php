<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Grade;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with(['user', 'enrollments.batch', 'enrollments.studyClass']);

        if ($request->filled('batch_id')) {
            $query->whereHas('enrollments', function ($q) use ($request) {
                $q->where('batch_id', $request->batch_id);
            });
        }

        $students = $query->paginate(50);
        $students->getCollection()->transform(fn ($student) => $this->attachCurrentAcademicRelations($student));

        return response()->json($students);
    }

    public function generateStudentReport(Request $request, $studentId)
    {
        $student = Student::with([
            'user',
            'enrollments.batch',
            'enrollments.studyClass',
            'enrollments.attendances',
            'enrollments.grades.subject',
        ])->findOrFail($studentId);

        $student = $this->attachCurrentAcademicRelations($student);
        $grades = $student->enrollments
            ->flatMap(fn ($enrollment) => $enrollment->grades)
            ->sortByDesc('created_at')
            ->values();

        if ($request->has('download') && $request->download == 'pdf') {
            $pdf = Pdf::loadView('reports.rapor', compact('student', 'grades'));
            return $pdf->download("Rapor_{$student->user->name}.pdf");
        }

        return response()->json([
            'student' => $student,
            'grades' => $grades
        ]);
    }

    private function attachCurrentAcademicRelations(Student $student): Student
    {
        $currentEnrollment = $student->enrollments->firstWhere('status', 'active')
            ?? $student->enrollments->first();

        $student->setRelation('batch', $currentEnrollment?->batch);
        $student->setRelation('studyClass', $currentEnrollment?->studyClass);

        return $student;
    }
}
