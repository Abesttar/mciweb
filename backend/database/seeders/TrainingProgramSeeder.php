<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TrainingProgramSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reguler = \App\Models\TrainingProgram::firstOrCreate(
            ['name' => 'Reguler'],
            [
                'stages' => [
                    ['name' => 'Pendaftaran', 'amount' => 500000],
                    ['name' => 'Biaya Pendidikan Tahap 1', 'amount' => 3500000],
                    ['name' => 'Biaya Pendidikan Tahap 2', 'amount' => 3000000],
                ],
                'is_active' => true,
            ]
        );

        \App\Models\TrainingProgram::firstOrCreate(
            ['name' => 'Kaiwa'],
            [
                'stages' => [
                    ['name' => 'Biaya Pendidikan Tahap 1', 'amount' => 2500000],
                    ['name' => 'Biaya Pendidikan Tahap 2', 'amount' => 2500000],
                ],
                'is_active' => true,
            ]
        );

        // Update existing students to Reguler if they don't have a program
        \App\Models\Student::whereNull('training_program_id')->update(['training_program_id' => $reguler->id]);
    }
}
