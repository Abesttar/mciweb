<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementTarget extends Model
{
    protected $fillable = [
        'announcement_id',
        'target_type', // e.g., 'all', 'role', 'batch', 'student'
        'target_id',   // The ID corresponding to the target_type (if applicable)
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }
}
