<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Batch;
use App\Models\Announcement;
use App\Models\Teacher;
use App\Models\RoadmapStage;
use App\Models\Grade;
use App\Models\Attendance;
use App\Models\Assignment;
use App\Models\Payment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** Target pembayaran per tahap (dalam rupiah). */
    private const PAYMENT_TARGETS = [1 => 500000, 2 => 3500000, 3 => 3000000];

    public function index(Request $request)
    {
        $user = Auth::user();

        $data = [];

        $roles = $user->roles->pluck('name')->toArray();
        $isAdmin = count(array_intersect($roles, ['Admin', 'Sachou', 'Super Admin', 'Staff Dokumen'])) > 0;
        $isSensei = in_array('Sensei', $roles);
        $isSiswa = in_array('Siswa', $roles);

        if ($isAdmin) {
            $data['total_students'] = Student::count();
            $data['active_batches'] = Batch::where('status', 'active')->count();
            $data['active_teachers'] = Teacher::count();

            // Prepare chart data (Students by batch for example)
            $batches = Batch::withCount('students')->get();
            $data['chart'] = [
                'labels' => $batches->pluck('name'),
                'data' => $batches->pluck('students_count')
            ];

            $data['roadmap_groups'] = RoadmapStage::where('is_active', true)
                ->with(['studentRoadmaps' => function ($query) {
                    $query->with(['student.user', 'student.enrollments.batch.teacher.user', 'roadmapStage'])
                        ->orderBy('updated_at', 'desc');
                }])
                ->orderBy('order')
                ->get();

            $data['roadmaps'] = \App\Models\StudentRoadmap::with(['student.user', 'student.enrollments.batch.teacher.user', 'roadmapStage'])
                ->whereHas('roadmapStage', function ($query) {
                    $query->where('is_active', true);
                })
                ->join('roadmap_stages', 'student_roadmaps.roadmap_stage_id', '=', 'roadmap_stages.id')
                ->select('student_roadmaps.*')
                ->orderBy('roadmap_stages.order')
                ->orderBy('student_roadmaps.updated_at', 'desc')
                ->get();

            // Payment summary for admin dashboard
            $paymentTargets = self::PAYMENT_TARGETS;
            $totalTarget = array_sum($paymentTargets);

            $paymentStats = DB::table('payments')
                ->select('stage', DB::raw('SUM(amount) as total_paid'))
                ->groupBy('stage')
                ->pluck('total_paid', 'stage');

            $totalPaid = $paymentStats->sum();
            $studentCount = Student::count();

            $data['payment_summary'] = [
                'total_paid'    => (float) $totalPaid,
                'total_target'  => $totalTarget * max($studentCount, 1),
                'student_count' => $studentCount,
                'percentage'    => $studentCount > 0
                    ? min(100, round(($totalPaid / ($totalTarget * $studentCount)) * 100))
                    : 0,
                'by_stage' => [
                    1 => [
                        'target' => $paymentTargets[1] * $studentCount,
                        'paid'   => (float)($paymentStats[1] ?? 0),
                    ],
                    2 => [
                        'target' => $paymentTargets[2] * $studentCount,
                        'paid'   => (float)($paymentStats[2] ?? 0),
                    ],
                    3 => [
                        'target' => $paymentTargets[3] * $studentCount,
                        'paid'   => (float)($paymentStats[3] ?? 0),
                    ],
                ],
            ];
        } else if ($isSensei) {
            // Teacher specific dashboard
            $teacher = $user->teacher;
            $teacherId = $teacher ? $teacher->id : null;
            
            // Get batches where this teacher is assigned
            $assignedBatches = Batch::where('teacher_id', $teacherId)
                ->with(['students.user', 'students.enrollments.batch'])
                ->withCount('students')
                ->get();
            $data['assigned_batches'] = $assignedBatches;

            $data['announcements'] = Announcement::whereHas('targets', function($q) {
                $q->where('target_type', 'all')
                  ->orWhere(function($sub) {
                      $sub->where('target_type', 'role')->where('target_id', 'Sensei');
                  });
            })->latest()->take(5)->get();
        } else if ($isSiswa) {
            // Student specific dashboard
            $student = $user->student;
            $batchId = $student ? $student->enrollments()->where('status', 'active')->latest()->first()?->batch_id : null;
            $nis = $student ? $student->nis : null;
            
            $data['announcements'] = Announcement::whereHas('targets', function($q) use ($batchId, $nis) {
                $q->where('target_type', 'all')
                  ->orWhere(function($sub) {
                      $sub->where('target_type', 'role')->where('target_id', 'Siswa');
                  })
                  ->orWhere(function($sub) use ($batchId) {
                      if ($batchId) {
                          $sub->where('target_type', 'batch')->where('target_id', (string)$batchId);
                      }
                  })
                  ->orWhere(function($sub) use ($nis) {
                      if ($nis) {
                          $sub->where('target_type', 'student')->where('target_id', $nis);
                      }
                  });
            })->latest()->take(5)->get();

            if ($student) {
                $enrollmentIds = $student->enrollments()->pluck('id');

                $data['student'] = $student->load(['user', 'enrollments.batch.teacher.user', 'roadmaps.roadmapStage']);
                $data['grades'] = Grade::with(['subject', 'enrollment.batch'])
                    ->whereIn('enrollment_id', $enrollmentIds)
                    ->latest()
                    ->take(8)
                    ->get();
                $data['attendances'] = Attendance::with(['schedule.studyClass.subject', 'enrollment.batch'])
                    ->whereIn('enrollment_id', $enrollmentIds)
                    ->orderBy('date', 'desc')
                    ->take(8)
                    ->get();
                $data['assignments'] = Assignment::with(['studyClass.batch', 'studyClass.subject'])
                    ->where(function ($query) use ($student, $batchId) {
                        $query->where('student_id', $student->id)
                            ->orWhere(function ($subQuery) use ($batchId) {
                                $subQuery->whereNull('student_id')
                                    ->when($batchId, function ($query) use ($batchId) {
                                        $query->whereHas('studyClass', function ($classQuery) use ($batchId) {
                                            $classQuery->where('batch_id', $batchId);
                                        });
                                    }, function ($query) {
                                        $query->whereRaw('1 = 0');
                                    });
                            });
                    })
                    ->orderBy('due_date')
                    ->take(8)
                    ->get();

                // Payment progress for this student
                $paymentTargets = self::PAYMENT_TARGETS;
                $payments = Payment::where('student_id', $student->id)->get();

                $paymentProgress = [];
                foreach ($paymentTargets as $stage => $target) {
                    $paid = $payments->where('stage', $stage)->sum('amount');
                    $paymentProgress[$stage] = [
                        'target'      => $target,
                        'paid'        => $paid,
                        'remaining'   => max(0, $target - $paid),
                        'percentage'  => $target > 0 ? min(100, round(($paid / $target) * 100)) : 0,
                        'is_complete' => $paid >= $target,
                    ];
                }
                $data['payment_progress'] = $paymentProgress;
            }
        }

        return response()->json($data);
    }
}
