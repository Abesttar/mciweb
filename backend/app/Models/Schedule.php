<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    protected $fillable = [
        'study_class_id',
        'batch_id',
        'class_level',
        'schedule_month',
        'day_of_week',
        'start_time',
        'end_time',
        'room',
    ];

    public function studyClass()
    {
        return $this->belongsTo(StudyClass::class);
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    protected function casts(): array
    {
        return [
            'schedule_month' => 'date',
        ];
    }
}
