<?php

namespace App\Http\Controllers;

use App\Models\RoadmapStage;
use Illuminate\Http\Request;

class RoadmapStageController extends Controller
{
    public function index()
    {
        $stages = RoadmapStage::orderBy('order')->get();
        return response()->json($stages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $stage = RoadmapStage::create($validated);
        return response()->json($stage, 201);
    }

    public function show(RoadmapStage $roadmapStage)
    {
        return response()->json($roadmapStage);
    }

    public function update(Request $request, RoadmapStage $roadmapStage)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'sometimes|required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $roadmapStage->update($validated);
        return response()->json($roadmapStage);
    }

    public function destroy(RoadmapStage $roadmapStage)
    {
        $roadmapStage->delete();
        return response()->json(['message' => 'Roadmap stage deleted']);
    }
}
