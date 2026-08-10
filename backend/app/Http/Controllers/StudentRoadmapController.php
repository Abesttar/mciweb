<?php

namespace App\Http\Controllers;

use App\Models\StudentRoadmap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudentRoadmapController extends Controller
{
    public function index(Request $request)
    {
        $query = StudentRoadmap::with(['student.user', 'roadmapStage', 'updatedByUser']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        $roadmaps = $query->orderBy('created_at', 'desc')->get();
        return response()->json($roadmaps);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'roadmap_stage_id' => 'required|exists:roadmap_stages,id',
            'status' => 'required|string|in:pending,in_progress,completed',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = Auth::id();

        $roadmap = StudentRoadmap::updateOrCreate(
            [
                'student_id' => $validated['student_id'],
                'roadmap_stage_id' => $validated['roadmap_stage_id'],
            ],
            $validated
        );

        $roadmap->load(['student.user', 'roadmapStage', 'updatedByUser']);
        return response()->json($roadmap, 201);
    }

    public function show(StudentRoadmap $studentRoadmap)
    {
        $studentRoadmap->load(['student.user', 'roadmapStage', 'updatedByUser']);
        return response()->json($studentRoadmap);
    }

    public function update(Request $request, StudentRoadmap $studentRoadmap)
    {
        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:pending,in_progress,completed',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = Auth::id();
        $studentRoadmap->update($validated);
        $studentRoadmap->load(['student.user', 'roadmapStage', 'updatedByUser']);

        return response()->json($studentRoadmap);
    }

    public function destroy(StudentRoadmap $studentRoadmap)
    {
        $studentRoadmap->delete();
        return response()->json(['message' => 'Student roadmap entry deleted']);
    }
}
