<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // question_banks = Paket Soal (a named package containing many questions)
        Schema::create('question_banks', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "Paket Soal Hiragana & Katakana"
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // questions = individual questions inside a package
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->constrained('question_banks')->cascadeOnDelete();
            $table->enum('type', ['multiple_choice', 'short_answer']);
            $table->text('question_text');
            $table->json('options')->nullable(); // Array of option strings for multiple choice
            $table->string('correct_answer');    // Exact text of correct option / exact answer
            $table->integer('points')->default(10);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
        Schema::dropIfExists('question_banks');
    }
};
