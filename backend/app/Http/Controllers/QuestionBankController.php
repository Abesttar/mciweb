<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\QuestionBank;
use App\Models\Question;

class QuestionBankController extends Controller
{
    // GET /api/question-banks → list all packages
    public function index(Request $request)
    {
        $banks = QuestionBank::with(['creator', 'questions'])
            ->withCount('questions')
            ->latest()
            ->get();
        return response()->json($banks);
    }

    // POST /api/question-banks → create a new package (with questions inside)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions'   => 'nullable|array',
            'questions.*.type'           => 'required|in:multiple_choice,short_answer',
            'questions.*.question_text'  => 'required|string',
            'questions.*.options'        => 'nullable|array',
            'questions.*.correct_answer' => 'required|string',
            'questions.*.points'         => 'required|integer|min:1',
        ]);

        $bank = QuestionBank::create([
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'created_by'  => $request->user()->id,
        ]);

        if (!empty($validated['questions'])) {
            foreach ($validated['questions'] as $i => $q) {
                $bank->questions()->create([
                    'type'           => $q['type'],
                    'question_text'  => $q['question_text'],
                    'options'        => $q['options'] ?? null,
                    'correct_answer' => $q['correct_answer'],
                    'points'         => $q['points'],
                    'sort_order'     => $i,
                ]);
            }
        }

        return response()->json($bank->load('questions'), 201);
    }

    // GET /api/question-banks/{id} → show single package with all questions
    public function show($id)
    {
        $bank = QuestionBank::with(['questions', 'creator'])->findOrFail($id);
        return response()->json($bank);
    }

    // PUT /api/question-banks/{id} → update package info + sync questions
    public function update(Request $request, $id)
    {
        $bank = QuestionBank::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'questions'   => 'nullable|array',
            'questions.*.id'             => 'nullable|integer',
            'questions.*.type'           => 'required|in:multiple_choice,short_answer',
            'questions.*.question_text'  => 'required|string',
            'questions.*.options'        => 'nullable|array',
            'questions.*.correct_answer' => 'required|string',
            'questions.*.points'         => 'required|integer|min:1',
        ]);

        $bank->update([
            'name'        => $validated['name'] ?? $bank->name,
            'description' => $validated['description'] ?? $bank->description,
        ]);

        if (isset($validated['questions'])) {
            // Sync: delete existing and recreate
            $bank->questions()->delete();
            foreach ($validated['questions'] as $i => $q) {
                $bank->questions()->create([
                    'type'           => $q['type'],
                    'question_text'  => $q['question_text'],
                    'options'        => $q['options'] ?? null,
                    'correct_answer' => $q['correct_answer'],
                    'points'         => $q['points'],
                    'sort_order'     => $i,
                ]);
            }
        }

        return response()->json($bank->load('questions'));
    }

    // DELETE /api/question-banks/{id}
    public function destroy($id)
    {
        $bank = QuestionBank::findOrFail($id);
        $bank->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
