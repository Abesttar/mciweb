<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('duration_minutes')->default(60);
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
            $table->boolean('random_questions')->default(true);
            $table->boolean('show_results')->default(true);
            $table->foreignId('question_bank_id')->constrained('question_banks')->cascadeOnDelete(); // The selected package
            $table->foreignId('study_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
