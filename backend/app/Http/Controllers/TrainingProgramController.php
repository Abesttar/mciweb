<?php

namespace App\Http\Controllers;

use App\Models\TrainingProgram;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TrainingProgramController extends Controller
{
    public function index(Request $request)
    {
        $query = TrainingProgram::query();
        
        if ($request->has('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'stages' => 'required|array|min:1',
            'stages.*.name' => 'required|string',
            'stages.*.amount' => 'required|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        $program = TrainingProgram::create($validated);
        return response()->json($program, 201);
    }

    public function show(TrainingProgram $trainingProgram)
    {
        return response()->json($trainingProgram);
    }

    public function update(Request $request, TrainingProgram $trainingProgram)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'stages' => 'sometimes|required|array|min:1',
            'stages.*.name' => 'required_with:stages|string',
            'stages.*.amount' => 'required_with:stages|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        $trainingProgram->update($validated);
        return response()->json($trainingProgram);
    }

    public function destroy(TrainingProgram $trainingProgram)
    {
        if ($trainingProgram->students()->exists()) {
            return response()->json(['message' => 'Cannot delete program because it is used by students.'], 400);
        }
        
        $trainingProgram->delete();
        return response()->json(['message' => 'Training program deleted successfully']);
    }
}
