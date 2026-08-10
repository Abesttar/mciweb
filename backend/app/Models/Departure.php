<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Departure extends Model
{
    protected $fillable = ['student_id', 'departure_date', 'flight_number', 'destination', 'placement', 'job', 'company_id', 'status'];

    protected $casts = [
        'departure_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
