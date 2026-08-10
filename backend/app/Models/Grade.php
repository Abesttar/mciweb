<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $fillable = [
        'enrollment_id', 'subject_id', 'study_class_id', 
        'score', 'type', 'date', 'chapter', 'components', 'is_passed', 'remarks'
    ];

    protected $casts = [
        'components' => 'array',
        'is_passed' => 'boolean',
        'score' => 'decimal:2',
    ];

    protected $appends = ['grade_letter'];

    public function getGradeLetterAttribute()
    {
        if ($this->score === null) return null;
        $s = (float) $this->score;
        if ($s >= 90) return 'A';
        if ($s >= 80) return 'B';
        if ($s >= 70) return 'C';
        return 'D';
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function studyClass()
    {
        return $this->belongsTo(StudyClass::class);
    }
}
