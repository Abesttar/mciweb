<?php

namespace App\Http\Controllers;

use App\Models\RaportSnapshot;
use Illuminate\Http\Request;

class RaportSnapshotController extends Controller
{
    /**
     * GET /api/students/{id}/raport-snapshots
     * Returns all raport history snapshots for a student, newest first.
     */
    public function index(Request $request, int $studentId)
    {
        $user = $request->user();

        // Students can only view their own snapshots
        if ($user->hasRole('Siswa')) {
            $student = $user->student;
            if (!$student || $student->id !== $studentId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $snapshots = RaportSnapshot::where('student_id', $studentId)
            ->with(['batch', 'snapshottedBy'])
            ->orderByDesc('snapshotted_at')
            ->get()
            ->map(function (RaportSnapshot $snap) {
                return [
                    'id'                 => $snap->id,
                    'class_level'        => $snap->class_level,
                    'class_name'         => $snap->class_name,
                    'snapshot_reason'    => $snap->snapshot_reason,
                    'grades_snapshot'    => $snap->grades_snapshot,
                    'attendance_summary' => $snap->attendance_summary,
                    'snapshotted_at'     => $snap->snapshotted_at,
                    'snapshotted_by'     => $snap->snapshottedBy?->name,
                    'batch_name'         => $snap->batch?->name,
                ];
            });

        return response()->json($snapshots);
    }
}
