<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudyClass extends Model
{
    protected $table = 'study_classes';

    protected $fillable = ['name', 'class_type', 'batch_id', 'subject_id', 'teacher_id', 'schedule_info', 'is_archived'];

    protected $casts = [
        'is_archived' => 'boolean',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }
}
