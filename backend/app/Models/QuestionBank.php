<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuestionBank extends Model
{
    protected $fillable = ['name', 'description', 'created_by'];

    public function questions()
    {
        return $this->hasMany(Question::class)->orderBy('sort_order');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function exams()
    {
        return $this->hasMany(Exam::class);
    }
}
