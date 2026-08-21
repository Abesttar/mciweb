<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menjadikan batch_id nullable di study_classes agar kelas kaiwa
     * tidak dipaksakan terikat ke satu batch tertentu (kelas kaiwa bersifat lintas batch).
     * Data lama yang sudah punya batch_id tidak akan terpengaruh.
     */
    public function up(): void
    {
        Schema::table('study_classes', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('study_classes', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable(false)->change();
        });
    }
};
