<?php

namespace App\Http\Controllers;

use App\Models\Matching;
use Illuminate\Http\Request;

class MatchingController extends Controller
{
    public function index(Request $request)
    {
        $query = Matching::with(['student.user', 'company']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $matchings = $query->orderBy('created_at', 'desc')->paginate(50);
        return response()->json($matchings);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'company_id' => 'required|exists:companies,id',
            'status' => 'required|string|in:applied,interview,accepted,rejected',
            'interview_date' => 'nullable|date',
        ]);

        $matching = Matching::create($validated);
        $matching->load(['student.user', 'company']);

        return response()->json($matching, 201);
    }

    public function show(Matching $matching)
    {
        $matching->load(['student.user', 'company']);
        return response()->json($matching);
    }

    public function update(Request $request, Matching $matching)
    {
        $validated = $request->validate([
            'student_id' => 'sometimes|required|exists:students,id',
            'company_id' => 'sometimes|required|exists:companies,id',
            'status' => 'sometimes|required|string|in:applied,interview,accepted,rejected',
            'interview_date' => 'nullable|date',
        ]);

        $matching->update($validated);
        $matching->load(['student.user', 'company']);

        return response()->json($matching);
    }

    public function destroy(Matching $matching)
    {
        $matching->delete();
        return response()->json(['message' => 'Matching deleted']);
    }
}
