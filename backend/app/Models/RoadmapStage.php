<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadmapStage extends Model
{
    protected $fillable = ['name', 'description', 'order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function studentRoadmaps()
    {
        return $this->hasMany(StudentRoadmap::class);
    }
}
