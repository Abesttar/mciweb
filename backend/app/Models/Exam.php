<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $fillable = [
        'title', 'description', 'duration_minutes', 'status',
        'random_questions', 'show_results', 'question_bank_id', 'study_class_id', 'created_by'
    ];

    protected $casts = [
        'random_questions' => 'boolean',
        'show_results' => 'boolean',
    ];

    public function studyClass()
    {
        return $this->belongsTo(\App\Models\StudyClass::class, 'study_class_id');
    }

    public function questionBank()
    {
        return $this->belongsTo(QuestionBank::class);
    }

    public function examSessions()
    {
        return $this->hasMany(ExamSession::class);
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }
}
