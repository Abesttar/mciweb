<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Exam;
use App\Models\QuestionBank;

class ExamController extends Controller
{
    // GET /api/exams?class_id=X
    public function index(Request $request)
    {
        $query = Exam::with(['questionBank.questions', 'creator', 'studyClass']);

        if ($request->has('class_id')) {
            $query->where('study_class_id', $request->class_id);
        }

        return response()->json($query->latest()->get());
    }

    // POST /api/exams
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'duration_minutes' => 'required|integer|min:1',
            'status'           => 'nullable|in:draft,published,closed',
            'random_questions' => 'nullable|boolean',
            'show_results'     => 'nullable|boolean',
            'question_bank_id' => 'required|exists:question_banks,id',
            'study_class_id'   => 'required|exists:study_classes,id',
        ]);

        $exam = Exam::create(array_merge($validated, [
            'created_by' => $request->user()->id,
        ]));

        return response()->json($exam->load(['questionBank.questions', 'studyClass']), 201);
    }

    // GET /api/exams/{id}
    public function show($id)
    {
        $exam = Exam::with(['questionBank.questions', 'studyClass', 'creator'])->findOrFail($id);
        return response()->json($exam);
    }

    // PUT /api/exams/{id}
    public function update(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);

        $validated = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'duration_minutes' => 'sometimes|integer|min:1',
            'status'           => 'sometimes|in:draft,published,closed',
            'random_questions' => 'sometimes|boolean',
            'show_results'     => 'sometimes|boolean',
            'question_bank_id' => 'sometimes|exists:question_banks,id',
        ]);

        $exam->update($validated);
        return response()->json($exam->load(['questionBank.questions', 'studyClass']));
    }

    // DELETE /api/exams/{id}
    public function destroy($id)
    {
        $exam = Exam::findOrFail($id);
        $exam->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // GET /api/exams/{id}/results
    public function results($id)
    {
        $exam = Exam::with(['questionBank.questions', 'studyClass'])->findOrFail($id);
        $sessions = \App\Models\ExamSession::with('student')
            ->where('exam_id', $id)
            ->latest('started_at')
            ->get();
        return response()->json([
            'exam' => $exam,
            'sessions' => $sessions
        ]);
    }
}
