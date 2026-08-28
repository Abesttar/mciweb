<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('fix:enrollments')]
#[Description('Fix enrollments for active students that are stuck in inactive state')]
class FixEnrollments extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Mencari siswa aktif yang kelasnya masih non-aktif (inactive)...");
        
        $students = \App\Models\Student::where('status', 'active')->get();
        $fixedCount = 0;

        foreach ($students as $student) {
            $updated = $student->enrollments()->where('status', 'inactive')->update(['status' => 'active']);
            if ($updated > 0) {
                $this->info("Diperbaiki: Siswa {$student->nis} (Mengaktifkan {$updated} enrollment)");
                $fixedCount += $updated;
            }
        }

        $this->info("Selesai! Total {$fixedCount} enrollment yang berhasil diperbaiki.");
    }
}
