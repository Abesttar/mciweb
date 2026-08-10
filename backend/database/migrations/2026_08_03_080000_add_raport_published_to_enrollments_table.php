<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->timestamp('raport_published_at')->nullable()->after('status');
            $table->foreignId('raport_published_by')->nullable()->after('raport_published_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['raport_published_by']);
            $table->dropColumn(['raport_published_at', 'raport_published_by']);
        });
    }
};
