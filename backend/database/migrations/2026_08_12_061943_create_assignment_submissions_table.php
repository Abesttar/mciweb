<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->text('content')->nullable();          // text answer
            $table->string('file_path')->nullable();      // uploaded file
            $table->string('original_filename')->nullable();
            $table->enum('status', ['submitted', 'graded', 'late'])->default('submitted');
            $table->integer('grade')->nullable();         // sensei grade 0-100
            $table->text('feedback')->nullable();         // sensei feedback
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['assignment_id', 'student_id']); // one submission per student per assignment
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_submissions');
    }
};
