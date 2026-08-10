<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = [
        'student_id',
        'invoice_number',
        'payment_type',
        'amount',
        'tax_amount',
        'total_amount',
        'due_date',
        'order_date',
        'created_by',
    ];

    protected $casts = [
        'due_date'   => 'date',
        'order_date' => 'date',
        'amount'     => 'float',
        'tax_amount' => 'float',
        'total_amount' => 'float',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
