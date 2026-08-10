<?php

namespace App\Http\Controllers;

use App\Models\Departure;
use Illuminate\Http\Request;

class DepartureController extends Controller
{
    public function index(Request $request)
    {
        $query = Departure::with(['student.user', 'company']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $departures = $query->orderBy('departure_date', 'desc')->paginate(50);
        return response()->json($departures);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'departure_date' => 'required|date',
            'flight_number' => 'nullable|string|max:100',
            'destination' => 'nullable|string|max:255',
            'placement' => 'nullable|string|max:255',
            'job' => 'nullable|string|max:255',
            'company_id' => 'nullable|exists:companies,id',
            'status' => 'required|string|in:scheduled,departed,arrived',
        ]);

        $departure = Departure::create($validated);
        $departure->load(['student.user', 'company']);

        return response()->json($departure, 201);
    }

    public function show(Departure $departure)
    {
        $departure->load(['student.user', 'company']);
        return response()->json($departure);
    }

    public function update(Request $request, Departure $departure)
    {
        $validated = $request->validate([
            'student_id' => 'sometimes|required|exists:students,id',
            'departure_date' => 'sometimes|required|date',
            'flight_number' => 'nullable|string|max:100',
            'destination' => 'nullable|string|max:255',
            'placement' => 'nullable|string|max:255',
            'job' => 'nullable|string|max:255',
            'company_id' => 'nullable|exists:companies,id',
            'status' => 'sometimes|required|string|in:scheduled,departed,arrived',
        ]);

        $departure->update($validated);
        $departure->load(['student.user', 'company']);

        return response()->json($departure);
    }

    public function destroy(Departure $departure)
    {
        $departure->delete();
        return response()->json(['message' => 'Departure deleted']);
    }
}
