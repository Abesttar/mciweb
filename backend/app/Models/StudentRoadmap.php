<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentRoadmap extends Model
{
    protected $fillable = ['student_id', 'roadmap_stage_id', 'status', 'notes', 'updated_by'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function roadmapStage()
    {
        return $this->belongsTo(RoadmapStage::class);
    }

    public function stage()
    {
        return $this->belongsTo(RoadmapStage::class, 'roadmap_stage_id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
