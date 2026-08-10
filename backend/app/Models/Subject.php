<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = ['name', 'description', 'level'];

    public function studyClasses()
    {
        return $this->hasMany(StudyClass::class);
    }

    /**
     * Get (or create) the default internal subject used for class-level grades.
     */
    public static function getDefaultId(): int
    {
        return static::firstOrCreate(
            ['name' => 'Tingkat Kelas'],
            ['description' => 'Data internal untuk penilaian berbasis tingkat kelas.']
        )->id;
    }
}
