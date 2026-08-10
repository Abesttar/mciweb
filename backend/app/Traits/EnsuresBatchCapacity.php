<?php

namespace App\Traits;

use App\Models\Batch;
use App\Models\Enrollment;

trait EnsuresBatchCapacity
{
    /**
     * Throw a 422 response if the batch has reached its student quota.
     */
    protected function ensureBatchCanReceiveStudent(int $batchId): void
    {
        $batch = Batch::findOrFail($batchId);
        $limit = min((int) ($batch->quota ?: 20), 20);

        $currentEnrolledCount = Enrollment::where('batch_id', $batchId)
            ->whereIn('status', ['active', 'completed'])
            ->count();

        if ($currentEnrolledCount >= $limit) {
            abort(response()->json([
                'message' => "Angkatan {$batch->name} sudah mencapai batas maksimal {$limit} siswa.",
                'errors'  => ['batch_id' => ["Angkatan {$batch->name} sudah mencapai batas maksimal {$limit} siswa."]],
            ], 422));
        }
    }
}
