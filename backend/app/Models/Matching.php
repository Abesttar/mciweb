<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Matching extends Model
{
    protected $fillable = ['student_id', 'company_id', 'status', 'interview_date'];

    protected $casts = [
        'interview_date' => 'date',
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
