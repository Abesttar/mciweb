<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    protected $appends = ['name', 'email'];

    protected $fillable = ['user_id', 'nip', 'specialization', 'phone', 'address', 'gender'];

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

    public function studyClasses()
    {
        return $this->hasMany(StudyClass::class);
    }
}
