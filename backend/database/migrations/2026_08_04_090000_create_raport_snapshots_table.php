<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('raport_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->string('class_level'); // e.g. shou, chuu, kou, jft, kelas_kaiwa
            $table->string('class_name')->nullable(); // e.g. "BATCH 1 - Kelas Dasar"
            $table->string('snapshot_reason')->default('class_level_change'); // class_level_change | batch_transfer
            $table->json('grades_snapshot')->nullable(); // Full array of grades at time of snapshot
            $table->json('attendance_summary')->nullable(); // {hadir: 10, izin: 2, sakit: 1, alpha: 0}
            $table->timestamp('snapshotted_at');
            $table->foreignId('snapshotted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('raport_snapshots');
    }
};
