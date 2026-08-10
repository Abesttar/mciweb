<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_photo')->nullable()->after('password');
            });
        }

        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'work_placement')) {
                $table->string('work_placement')->nullable()->after('cv');
            }

            if (!Schema::hasColumn('students', 'job_type')) {
                $table->string('job_type')->nullable()->after('work_placement');
            }

            if (!Schema::hasColumn('students', 'visa_type')) {
                $table->string('visa_type')->nullable()->after('job_type');
            }
        });

        Schema::table('schedules', function (Blueprint $table) {
            if (!Schema::hasColumn('schedules', 'batch_id')) {
                $table->foreignId('batch_id')->nullable()->after('study_class_id')->constrained('batches')->nullOnDelete();
            }

            if (!Schema::hasColumn('schedules', 'class_level')) {
                $table->string('class_level')->nullable()->after('batch_id');
            }

            if (!Schema::hasColumn('schedules', 'schedule_month')) {
                $table->date('schedule_month')->nullable()->after('class_level');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            if (Schema::hasColumn('schedules', 'batch_id')) {
                $table->dropForeign(['batch_id']);
                $table->dropColumn('batch_id');
            }

            if (Schema::hasColumn('schedules', 'class_level')) {
                $table->dropColumn('class_level');
            }

            if (Schema::hasColumn('schedules', 'schedule_month')) {
                $table->dropColumn('schedule_month');
            }
        });

        Schema::table('students', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['work_placement', 'job_type', 'visa_type'],
                fn ($column) => Schema::hasColumn('students', $column)
            ));

            if ($columns) {
                $table->dropColumn($columns);
            }
        });

        if (Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('profile_photo');
            });
        }
    }
};
