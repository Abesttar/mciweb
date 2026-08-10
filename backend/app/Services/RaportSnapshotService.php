<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Attendance;
use App\Models\RaportSnapshot;
use Illuminate\Support\Facades\Auth;

class RaportSnapshotService
{
    /**
     * Snapshot raport for a single enrollment (one student leaving a batch or class level).
     * Reason: 'class_level_change' or 'batch_transfer'
     */
    public static function snapshotEnrollment(Enrollment $enrollment, string $reason = 'class_level_change'): ?RaportSnapshot
    {
        // Load relations needed
        $enrollment->loadMissing(['student', 'batch', 'grades.subject', 'grades.studyClass', 'attendances']);

        $grades = $enrollment->grades;

        // Skip if no grades at all — nothing to snapshot
        if ($grades->isEmpty()) {
            return null;
        }

        // Build grades snapshot
        $gradesSnapshot = $grades->map(function (Grade $g) {
            return [
                'id'           => $g->id,
                'type'         => $g->type,
                'date'         => $g->date,
                'chapter'      => $g->chapter,
                'score'        => $g->score,
                'grade_letter' => $g->grade_letter,
                'components'   => $g->components,
                'is_passed'    => $g->is_passed,
                'remarks'      => $g->remarks,
                'study_class'  => $g->studyClass ? ['id' => $g->studyClass->id, 'name' => $g->studyClass->name, 'class_type' => $g->studyClass->class_type] : null,
            ];
        })->values()->toArray();

        // Build attendance summary
        $attendances = $enrollment->attendances;
        $attendanceSummary = [
            'total'  => $attendances->count(),
            'hadir'  => $attendances->where('status', 'Hadir')->count(),
            'izin'   => $attendances->where('status', 'Izin')->count(),
            'sakit'  => $attendances->where('status', 'Sakit')->count(),
            'alpha'  => $attendances->where('status', 'Alpha')->count(),
        ];

        // Class name: use batch name + class_level
        $classLevel = $enrollment->batch?->class_level ?? 'unknown';
        $batchName  = $enrollment->batch?->name ?? '-';
        $className  = "{$batchName} ({$classLevel})";

        return RaportSnapshot::create([
            'batch_id'           => $enrollment->batch_id,
            'student_id'         => $enrollment->student_id,
            'enrollment_id'      => $enrollment->id,
            'class_level'        => $classLevel,
            'class_name'         => $className,
            'snapshot_reason'    => $reason,
            'grades_snapshot'    => $gradesSnapshot,
            'attendance_summary' => $attendanceSummary,
            'snapshotted_at'     => now(),
            'snapshotted_by'     => Auth::id(),
        ]);
    }

    /**
     * Snapshot all enrollments in a batch (used when batch class_level changes).
     */
    public static function snapshotBatch(int $batchId, string $reason = 'class_level_change'): int
    {
        $enrollments = Enrollment::where('batch_id', $batchId)
            ->whereIn('status', ['active', 'completed'])
            ->with(['student', 'batch', 'grades.subject', 'grades.studyClass', 'attendances'])
            ->get();

        $count = 0;
        foreach ($enrollments as $enrollment) {
            $snap = self::snapshotEnrollment($enrollment, $reason);
            if ($snap) {
                $count++;
            }
        }

        return $count;
    }
}
