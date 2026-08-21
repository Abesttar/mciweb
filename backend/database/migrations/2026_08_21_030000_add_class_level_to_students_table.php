<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan kolom class_level ke tabel students.
     * Nullable karena siswa lama tidak memiliki nilai ini.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('class_level')->nullable()->after('training_program_id')
                  ->comment('Tingkatan kelas siswa: shou, chuu, kou, jft, kaiwa');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('class_level');
        });
    }
};
