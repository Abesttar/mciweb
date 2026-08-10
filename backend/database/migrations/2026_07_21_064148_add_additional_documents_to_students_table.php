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
            $table->string('visa_document')->nullable()->after('cv');
            $table->string('coe')->nullable()->after('visa_document');
            $table->string('work_contract')->nullable()->after('coe');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['visa_document', 'coe', 'work_contract']);
        });
    }
};
