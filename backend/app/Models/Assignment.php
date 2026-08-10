<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    protected $fillable = [
        'study_class_id',
        'student_id',
        'title',
        'description',
        'due_date',
        'document_path',
    ];

    public function studyClass()
    {
        return $this->belongsTo(StudyClass::class, 'study_class_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
