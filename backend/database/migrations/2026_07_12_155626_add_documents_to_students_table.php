<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('ijazah')->nullable();
            $table->string('ktp')->nullable();
            $table->string('akte_kelahiran')->nullable();
            $table->string('kk')->nullable();
            $table->string('jft_jlpt')->nullable();
            $table->string('ssw')->nullable();
            $table->string('cv')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['ijazah', 'ktp', 'akte_kelahiran', 'kk', 'jft_jlpt', 'ssw', 'cv']);
        });
    }
};
