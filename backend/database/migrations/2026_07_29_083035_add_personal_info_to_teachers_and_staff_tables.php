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
        Schema::table('teachers', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('user_id');
            $table->text('address')->nullable()->after('phone');
            $table->enum('gender', ['Laki-laki', 'Perempuan'])->nullable()->after('address');
        });

        Schema::table('staff', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('user_id');
            $table->text('address')->nullable()->after('phone');
            $table->enum('gender', ['Laki-laki', 'Perempuan'])->nullable()->after('address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teachers_and_staff_tables', function (Blueprint $table) {
            //
        });
    }
};
