<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Data fix: Lepaskan kelas kaiwa dari batch_id yang dipaksakan.
     * Kelas kaiwa bersifat lintas batch, tidak perlu terikat ke satu batch tertentu.
     * Nilai yang sudah ada (grades) tidak tersentuh sama sekali.
     */
    public function up(): void
    {
        // Update semua study_class bertipe 'kaiwa' yang batch_id-nya tidak null
        // menjadi null. Kelas non-kaiwa tidak terpengaruh.
        DB::table('study_classes')
            ->where('class_type', 'kaiwa')
            ->whereNotNull('batch_id')
            ->update(['batch_id' => null]);
    }

    /**
     * Reverse the migrations.
     * Karena ini data fix, rollback tidak memungkinkan restore batch_id lama
     * secara otomatis. Down() dibiarkan kosong dengan sengaja.
     */
    public function down(): void
    {
        // Tidak ada rollback otomatis untuk data fix ini.
        // Jika perlu rollback, restore manual via SQL.
    }
};
