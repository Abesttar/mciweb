<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = ['name', 'address', 'industry', 'contact_person', 'phone', 'email', 'quota'];

    public function matchings()
    {
        return $this->hasMany(Matching::class);
    }
}
