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
            $table->string('gender')->nullable()->after('nis');
        });

        Schema::table('batches', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->constrained('teachers')->nullOnDelete()->after('status');
        });

        Schema::table('departures', function (Blueprint $table) {
            $table->string('placement')->nullable()->after('destination');
            $table->string('job')->nullable()->after('placement');
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete()->after('job');
        });

        Schema::table('assignments', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->constrained('students')->cascadeOnDelete()->after('study_class_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('gender');
        });

        Schema::table('batches', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
            $table->dropColumn('teacher_id');
        });

        Schema::table('departures', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn(['placement', 'job', 'company_id']);
        });

        Schema::table('assignments', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropColumn('student_id');
        });
    }
};
