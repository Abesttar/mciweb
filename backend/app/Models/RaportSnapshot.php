<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RaportSnapshot extends Model
{
    protected $fillable = [
        'batch_id',
        'student_id',
        'enrollment_id',
        'class_level',
        'class_name',
        'snapshot_reason',
        'grades_snapshot',
        'attendance_summary',
        'snapshotted_at',
        'snapshotted_by',
    ];

    protected $casts = [
        'grades_snapshot'    => 'array',
        'attendance_summary' => 'array',
        'snapshotted_at'     => 'datetime',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function snapshottedBy()
    {
        return $this->belongsTo(User::class, 'snapshotted_by');
    }
}
