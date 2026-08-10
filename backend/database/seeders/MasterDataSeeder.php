<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\RoadmapStage;
use App\Models\DocumentType;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            'Pendaftaran', 'Administrasi', 'Pendidikan', 'Sertifikasi', 
            'Matching', 'Interview', 'COE', 'Visa', 'Keberangkatan', 'Alumni'
        ];
        foreach ($stages as $index => $stage) {
            RoadmapStage::firstOrCreate([
                'name' => $stage,
                'order' => $index + 1
            ]);
        }

        $docs = ['KTP', 'Kartu Keluarga', 'Akte Kelahiran', 'Ijazah Terakhir', 'Paspor', 'Foto'];
        foreach ($docs as $doc) {
            DocumentType::firstOrCreate([
                'name' => $doc,
                'is_required' => true
            ]);
        }
    }
}
