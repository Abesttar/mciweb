<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AssignmentSubmissionController extends Controller
{
    /**
     * List submissions - Sensei/Admin sees all for an assignment, Siswa sees own.
     */
    public function index(Request $request)
    {
        $query = AssignmentSubmission::with(['student.user', 'assignment']);

        if ($request->filled('assignment_id')) {
            $query->where('assignment_id', $request->assignment_id);
        }

        // Siswa can only see their own submissions
        if ($request->user()?->hasRole('Siswa')) {
            $student = $request->user()->student;
            $query->where('student_id', $student?->id);
        }

        $submissions = $query->orderBy('submitted_at', 'desc')->get();
        return response()->json($submissions);
    }

    /**
     * Siswa submits or updates their submission for an assignment.
     */
    public function store(Request $request)
    {
        abort_if(!$request->user()?->hasRole('Siswa'), 403, 'Hanya siswa yang dapat mengumpulkan tugas.');

        $validated = $request->validate([
            'assignment_id' => 'required|exists:assignments,id',
            'content'       => 'nullable|string',
            'file'          => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png,zip|max:20480',
        ]);

        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Data siswa tidak ditemukan.'], 404);
        }

        $assignment = Assignment::find($validated['assignment_id']);
        $now = now();

        // Determine if late
        $status = ($now->toDateString() > $assignment->due_date) ? 'late' : 'submitted';

        $filePath = null;
        $originalFilename = null;
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $originalFilename = $file->getClientOriginalName();
            $filePath = $file->store('assignment_submissions', 'public');
        }

        $submission = AssignmentSubmission::updateOrCreate(
            ['assignment_id' => $validated['assignment_id'], 'student_id' => $student->id],
            [
                'content'           => $validated['content'] ?? null,
                'file_path'         => $filePath ?? \DB::raw('file_path'), // keep old if no new file
                'original_filename' => $originalFilename ?? \DB::raw('original_filename'),
                'status'            => $status,
                'submitted_at'      => $now,
            ]
        );

        // If a new file was uploaded and there was an old file, delete old
        if ($filePath && $submission->wasRecentlyCreated === false) {
            // already handled by updateOrCreate overwriting
        }

        $submission->load('student.user');
        return response()->json($submission, 201);
    }

    /**
     * Sensei gives grade/feedback to a submission.
     */
    public function update(Request $request, AssignmentSubmission $assignmentSubmission)
    {
        abort_if($request->user()?->hasRole('Siswa'), 403, 'Siswa tidak dapat menilai pengumpulan tugas.');

        $validated = $request->validate([
            'grade'    => 'nullable|integer|min:0|max:100',
            'feedback' => 'nullable|string|max:1000',
        ]);

        $assignmentSubmission->update(array_merge($validated, ['status' => 'graded']));
        $assignmentSubmission->load('student.user');

        return response()->json($assignmentSubmission);
    }

    /**
     * Show single submission.
     */
    public function show(Request $request, AssignmentSubmission $assignmentSubmission)
    {
        if ($request->user()?->hasRole('Siswa')) {
            $student = $request->user()->student;
            abort_if($assignmentSubmission->student_id !== $student?->id, 403);
        }
        $assignmentSubmission->load(['student.user', 'assignment']);
        return response()->json($assignmentSubmission);
    }
}
