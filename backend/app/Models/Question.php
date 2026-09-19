<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = [
        'question_bank_id', 'type', 'question_text', 'options', 'correct_answer', 'points', 'sort_order'
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function questionBank()
    {
        return $this->belongsTo(QuestionBank::class);
    }

    public function studentAnswers()
    {
        return $this->hasMany(StudentAnswer::class);
    }
}
