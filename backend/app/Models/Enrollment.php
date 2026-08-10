<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    protected $fillable = ['student_id', 'batch_id', 'status', 'raport_published_at', 'raport_published_by'];

    protected $casts = [
        'raport_published_at' => 'datetime',
    ];


    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function studyClass()
    {
        return $this->hasOne(StudyClass::class, 'batch_id', 'batch_id')->oldestOfMany();
    }

    public function studyClasses()
    {
        return $this->hasMany(StudyClass::class, 'batch_id', 'batch_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}
