<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\Batch;
use App\Models\Subject;
use App\Models\StudyClass;
use App\Models\Enrollment;
use App\Models\Schedule;
use App\Models\Attendance;
use App\Models\Assignment;
use App\Models\Grade;
use App\Models\Company;
use App\Models\Matching;
use App\Models\Departure;
use App\Models\RoadmapStage;
use App\Models\StudentRoadmap;
use App\Models\Announcement;
use App\Models\Notification;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password123');

        // 1. CREATE USERS
        // Sachou
        $sachou = User::firstOrCreate(['email' => 'sachou@mci.com'], [
            'name' => 'Bapak Sachou',
            'password' => $password,
        ]);
        if(!$sachou->hasRole('Sachou')) $sachou->assignRole('Sachou');

        // Sensei 1
        $sensei1 = User::firstOrCreate(['email' => 'sensei1@mci.com'], [
            'name' => 'Yamada Sensei',
            'password' => $password,
        ]);
        if(!$sensei1->hasRole('Sensei')) $sensei1->assignRole('Sensei');

        // Sensei 2
        $sensei2 = User::firstOrCreate(['email' => 'sensei2@mci.com'], [
            'name' => 'Tanaka Sensei',
            'password' => $password,
        ]);
        if(!$sensei2->hasRole('Sensei')) $sensei2->assignRole('Sensei');

        // Siswa Users
        $siswaUsers = [];
        for ($i = 1; $i <= 5; $i++) {
            $user = User::firstOrCreate(['email' => "siswa{$i}@mci.com"], [
                'name' => "Siswa Kenshusei {$i}",
                'password' => $password,
            ]);
            if(!$user->hasRole('Siswa')) $user->assignRole('Siswa');
            $siswaUsers[] = $user;
        }

        // 2. CREATE TEACHERS
        $teacher1 = Teacher::firstOrCreate(['user_id' => $sensei1->id], [
            'nip' => 'T-001',
            'specialization' => 'Bahasa Jepang N4/N5'
        ]);
        $teacher2 = Teacher::firstOrCreate(['user_id' => $sensei2->id], [
            'nip' => 'T-002',
            'specialization' => 'Budaya & Fisik'
        ]);

        // 3. CREATE BATCHES
        $batch1 = Batch::firstOrCreate(['name' => 'Angkatan 2026 Gelombang 1'], [
            'start_date' => Carbon::now()->subMonths(3)->toDateString(),
            'end_date' => Carbon::now()->addMonths(3)->toDateString(),
            'status' => 'active',
            'class_level' => 'kelas_atas'
        ]);
        $batch2 = Batch::firstOrCreate(['name' => 'Angkatan 2026 Gelombang 2'], [
            'start_date' => Carbon::now()->toDateString(),
            'end_date' => Carbon::now()->addMonths(6)->toDateString(),
            'status' => 'active',
            'class_level' => 'kelas_bawah'
        ]);

        // 4. CREATE STUDENTS
        $students = [];
        foreach ($siswaUsers as $index => $sUser) {
            $students[] = Student::firstOrCreate(['user_id' => $sUser->id], [
                'nis' => 'S-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT),
                'date_of_birth' => Carbon::now()->subYears(20)->toDateString(),
                'address' => 'Jl. Pendidikan No. ' . ($index + 1),
                'phone' => '089999999' . $index,
                'status' => 'active'
            ]);
        }

        // 5. CREATE SUBJECTS
        $subjectN5 = Subject::firstOrCreate(['name' => 'Bahasa Jepang N5'], [
            'description' => 'Dasar bahasa jepang',
            'level' => 'Beginner'
        ]);
        $subjectN4 = Subject::firstOrCreate(['name' => 'Bahasa Jepang N4'], [
            'description' => 'Lanjutan bahasa jepang',
            'level' => 'Intermediate'
        ]);
        $subjectCulture = Subject::firstOrCreate(['name' => 'Budaya & Tata Krama Jepang'], [
            'description' => 'Pemahaman budaya kerja Jepang',
            'level' => 'General'
        ]);

        // 6. CREATE CLASSES
        // Classes link directly to batch, subject, and teacher
        $classA = StudyClass::firstOrCreate(['name' => 'Kelas Sakura (N5)'], [
            'batch_id' => $batch1->id,
            'subject_id' => $subjectN5->id,
            'teacher_id' => $teacher1->id
        ]);
        $classB = StudyClass::firstOrCreate(['name' => 'Kelas Fuji (N4)'], [
            'batch_id' => $batch2->id,
            'subject_id' => $subjectN4->id,
            'teacher_id' => $teacher1->id
        ]);

        // 7. ENROLLMENTS (Enrollment is to a Batch, not a Class)
        $enrollments = [];
        foreach ([$students[0], $students[1], $students[2]] as $stu) {
            $enrollments[] = Enrollment::firstOrCreate(['student_id' => $stu->id, 'batch_id' => $batch1->id], ['status' => 'active']);
        }
        foreach ([$students[3], $students[4]] as $stu) {
            $enrollments[] = Enrollment::firstOrCreate(['student_id' => $stu->id, 'batch_id' => $batch2->id], ['status' => 'active']);
        }

        // 8. SCHEDULES
        $schedule1 = Schedule::firstOrCreate([
            'study_class_id' => $classA->id,
            'day_of_week' => 'Monday',
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
            'room' => 'Ruang 1'
        ]);
        $schedule2 = Schedule::firstOrCreate([
            'study_class_id' => $classB->id,
            'day_of_week' => 'Wednesday',
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
            'room' => 'Ruang 2'
        ]);

        // 9. ATTENDANCES (For today)
        foreach ([$enrollments[0], $enrollments[1], $enrollments[2]] as $index => $enrollment) {
            Attendance::firstOrCreate([
                'schedule_id' => $schedule1->id,
                'enrollment_id' => $enrollment->id,
                'date' => Carbon::now()->toDateString()
            ], [
                'status' => ($index == 2) ? 'sick' : 'present',
                'notes' => ($index == 2) ? 'Demam' : ''
            ]);
        }

        // 10. ASSIGNMENTS & GRADES
        $assignment1 = Assignment::firstOrCreate([
            'study_class_id' => $classA->id,
            'title' => 'Tugas Hiragana & Katakana',
        ], [
            'description' => 'Tulis masing-masing 5x',
            'due_date' => Carbon::now()->addDays(2)->toDateString()
        ]);

        // Grades are tied to Enrollment and Subject
        foreach ([$enrollments[0], $enrollments[1], $enrollments[2]] as $index => $enrollment) {
            Grade::firstOrCreate([
                'enrollment_id' => $enrollment->id,
                'subject_id' => $subjectN5->id,
                'type' => 'assignment',
            ], [
                'score' => 80 + ($index * 5),
                'remarks' => 'Bagus'
            ]);

            Grade::firstOrCreate([
                'enrollment_id' => $enrollment->id,
                'subject_id' => $subjectN5->id,
                'type' => 'exam',
            ], [
                'score' => 75 + ($index * 7),
                'remarks' => 'Lulus N5'
            ]);
        }

        // 11. COMPANIES
        $company1 = Company::firstOrCreate(['name' => 'Toyota Motor Corp'], [
            'address' => 'Aichi, Japan',
            'industry' => 'Automotive',
            'contact_person' => 'Mr. Suzuki',
            'email' => 'suzuki@toyota.co.jp',
            'phone' => '+81 123 456 789'
        ]);
        $company2 = Company::firstOrCreate(['name' => 'Panasonic'], [
            'address' => 'Osaka, Japan',
            'industry' => 'Electronics',
            'contact_person' => 'Mr. Honda',
            'email' => 'honda@panasonic.co.jp',
            'phone' => '+81 987 654 321'
        ]);

        // 12. MATCHINGS
        $match1 = Matching::firstOrCreate([
            'student_id' => $students[0]->id,
            'company_id' => $company1->id,
        ], [
            'interview_date' => Carbon::now()->subWeeks(2)->toDateString(),
            'status' => 'passed'
        ]);
        $match2 = Matching::firstOrCreate([
            'student_id' => $students[1]->id,
            'company_id' => $company2->id,
        ], [
            'interview_date' => Carbon::now()->subWeeks(1)->toDateString(),
            'status' => 'pending'
        ]);

        // 13. DEPARTURES
        if ($match1->status == 'passed') {
            Departure::firstOrCreate([
                'student_id' => $students[0]->id,
                'destination' => $company1->address,
            ], [
                'departure_date' => Carbon::now()->addMonths(1)->toDateString(),
                'flight_number' => 'JL-720',
                'status' => 'scheduled',
            ]);
        }

        // 14. STUDENT ROADMAPS (Progress)
        $stages = RoadmapStage::orderBy('order')->get();
        if ($stages->count() > 0) {
            foreach ($stages as $index => $stage) {
                if ($index < 4) {
                    StudentRoadmap::firstOrCreate([
                        'student_id' => $students[0]->id,
                        'roadmap_stage_id' => $stage->id,
                    ], [
                        'status' => 'completed',
                        'notes' => 'Lancar',
                        'updated_by' => $sachou->id
                    ]);
                }
                
                if ($index == 0) {
                    StudentRoadmap::firstOrCreate([
                        'student_id' => $students[2]->id,
                        'roadmap_stage_id' => $stage->id,
                    ], [
                        'status' => 'in_progress',
                    ]);
                }
            }
        }

        // 15. ANNOUNCEMENTS
        $ann1 = Announcement::firstOrCreate(['title' => 'Pengumuman Jadwal Ujian N5'], [
            'content' => 'Kepada seluruh siswa kelas Sakura, ujian N5 akan dilaksanakan minggu depan. Mohon persiapkan diri dengan baik.',
            'created_by' => User::whereHas('roles', fn($q) => $q->where('name', 'Admin'))->first()->id ?? 1
        ]);
        $ann1->targets()->firstOrCreate(['target_type' => 'role', 'target_id' => 'Siswa']);
        $ann1->targets()->firstOrCreate(['target_type' => 'role', 'target_id' => 'Sensei']);

        // 16. NOTIFICATIONS
        Notification::create([
            'user_id' => $sachou->id,
            'title' => 'Laporan Matching Baru',
            'message' => 'Siswa Kenshusei 1 telah lulus interview dengan Toyota Motor Corp.',
        ]);
        Notification::create([
            'user_id' => $students[0]->user_id,
            'title' => 'Selamat! Anda lulus Interview',
            'message' => 'Anda telah diterima di Toyota Motor Corp. Silakan persiapkan dokumen berikutnya.',
        ]);
    }
}
