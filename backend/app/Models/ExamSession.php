<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamSession extends Model
{
    protected $fillable = [
        'exam_id', 'student_id', 'questions_snapshot', 'started_at', 'finished_at', 'status', 'score', 'violations', 'is_locked'
    ];

    protected $casts = [
        'questions_snapshot' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'is_locked' => 'boolean',
        'violations' => 'integer',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(\App\Models\User::class, 'student_id');
    }

    public function studentAnswers()
    {
        return $this->hasMany(StudentAnswer::class);
    }
}
