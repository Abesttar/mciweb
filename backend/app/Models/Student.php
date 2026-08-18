<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $appends = ['name', 'email'];

    protected $fillable = [
        'user_id', 
        'training_program_id',
        'nis', 
        'gender', 
        'date_of_birth', 
        'address', 
        'phone', 
        'emergency_contact', 
        'status',
        'ijazah',
        'ktp',
        'akte_kelahiran',
        'kk',
        'jft_jlpt',
        'ssw',
        'cv',
        'visa_document',
        'coe',
        'work_contract',
        'work_placement',
        'job_type',
        'visa_type'
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getNameAttribute()
    {
        return $this->user?->name;
    }

    public function getEmailAttribute()
    {
        return $this->user?->email;
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function documents()
    {
        return $this->hasMany(StudentDocument::class);
    }

    public function roadmaps()
    {
        return $this->hasMany(StudentRoadmap::class);
    }

    public function matchings()
    {
        return $this->hasMany(Matching::class);
    }

    public function departures()
    {
        return $this->hasMany(Departure::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function trainingProgram()
    {
        return $this->belongsTo(TrainingProgram::class);
    }
}

