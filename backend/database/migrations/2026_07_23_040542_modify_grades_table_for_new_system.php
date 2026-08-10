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
        Schema::table('grades', function (Blueprint $table) {
            $table->foreignId('study_class_id')->nullable()->after('enrollment_id')->constrained()->cascadeOnDelete();
            $table->json('components')->nullable()->after('type');
            $table->boolean('is_passed')->nullable()->after('components');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropForeign(['study_class_id']);
            $table->dropColumn(['study_class_id', 'components', 'is_passed']);
        });
    }
};
