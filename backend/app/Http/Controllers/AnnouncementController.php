<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $query = Announcement::with(['createdBy', 'targets'])->orderBy('created_at', 'desc');

        // Filter based on role
        if ($user->hasRole('Admin') || $user->hasRole('Sachou') || $user->hasRole('Super Admin') || $user->hasRole('Staff Akademik')) {
            // Can see all
        } else if ($user->hasRole('Sensei')) {
            $query->whereHas('targets', function($q) {
                $q->where('target_type', 'all')
                  ->orWhere(function($sub) {
                      $sub->where('target_type', 'role')->where('target_id', 'Sensei');
                  });
            });
        } else if ($user->hasRole('Siswa')) {
            $student = $user->student;
            $batchId = $student ? $student->enrollments()->where('status', 'active')->latest()->first()?->batch_id : null;
            $studentIds = array_filter([
                $student?->id ? (string) $student->id : null,
                $student?->nis,
            ]);
            
            $query->whereHas('targets', function($q) use ($batchId, $studentIds) {
                $q->where('target_type', 'all')
                  ->orWhere(function($sub) {
                      $sub->where('target_type', 'role')->where('target_id', 'Siswa');
                  });
                  
                if ($batchId) {
                    $q->orWhere(function($sub) use ($batchId) {
                        $sub->where('target_type', 'batch')->where('target_id', $batchId);
                    });
                }

                if (!empty($studentIds)) {
                    $q->orWhere(function($sub) use ($studentIds) {
                        $sub->where('target_type', 'student')->whereIn('target_id', $studentIds);
                    });
                }
            });
        }

        $announcements = $query->paginate(20);
        return response()->json($announcements);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // Super Admin, Staff Akademik can create any announcement
        // Sachou can create any announcement (same as admin)
        // Sensei can only create announcements targeting their own batch students
        $canCreate = $user->hasAnyRole(['Super Admin', 'Admin', 'Staff Akademik', 'Sachou']);
        $isSensei = $user->hasRole('Sensei');

        if (!$canCreate && !$isSensei) {
            return response()->json(['message' => 'Anda tidak memiliki akses untuk membuat pengumuman.'], 403);
        }

        // If Sensei, restrict targets to only batch type with their assigned batch IDs
        if ($isSensei && !$canCreate) {
            $teacher = $user->teacher;
            $allowedBatchIds = $teacher ? \App\Models\Batch::where('teacher_id', $teacher->id)->pluck('id')->map(fn($id) => (string) $id)->toArray() : [];

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'targets' => 'required|array',
                'targets.*.type' => 'required|string|in:batch',
                'targets.*.id' => 'required|string',
            ]);

            // Verify all targets are within allowed batches
            foreach ($validated['targets'] as $target) {
                if (!in_array($target['id'], $allowedBatchIds)) {
                    return response()->json(['message' => 'Anda hanya bisa mengirim pengumuman ke batch yang Anda ajar.'], 403);
                }
            }
        } else {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'targets' => 'required|array',
                'targets.*.type' => 'required|string|in:all,role,batch,student',
                'targets.*.id' => 'required_unless:targets.*.type,all|string|nullable'
            ]);
        }

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'created_by' => Auth::id(),
        ]);

        foreach ($validated['targets'] as $target) {
            AnnouncementTarget::create([
                'announcement_id' => $announcement->id,
                'target_type' => $target['type'],
                'target_id' => $target['id'] ?? '0',
            ]);
        }

        $this->notifyTargets($announcement, $validated['targets']);

        $announcement->load('targets', 'createdBy');
        return response()->json($announcement, 201);
    }

    private function notifyTargets($announcement, $targets)
    {
        $userIdsToNotify = [];

        foreach ($targets as $target) {
            if ($target['type'] === 'all') {
                $users = \App\Models\User::pluck('id')->toArray();
                $userIdsToNotify = array_merge($userIdsToNotify, $users);
            } elseif ($target['type'] === 'role') {
                $roleName = $target['id'];
                $users = \App\Models\User::role($roleName)->pluck('id')->toArray();
                $userIdsToNotify = array_merge($userIdsToNotify, $users);
            } elseif ($target['type'] === 'batch') {
                $batchId = $target['id'];
                $users = \App\Models\User::whereHas('student.enrollments', function($q) use ($batchId) {
                    $q->where('batch_id', $batchId)->where('status', 'active');
                })->pluck('id')->toArray();
                $userIdsToNotify = array_merge($userIdsToNotify, $users);
            } elseif ($target['type'] === 'student') {
                $studentId = $target['id'];
                // ID could be NIS or ID
                $student = \App\Models\Student::where('id', $studentId)->orWhere('nis', $studentId)->first();
                if ($student && $student->user_id) {
                    $userIdsToNotify[] = $student->user_id;
                }
            }
        }

        $userIdsToNotify = array_unique($userIdsToNotify);

        // Exclude the creator
        $creatorId = Auth::id();
        
        $notifications = [];
        $now = now();
        foreach ($userIdsToNotify as $userId) {
            if ($userId !== $creatorId) {
                $notifications[] = [
                    'user_id' => $userId,
                    'title' => "Pengumuman: {$announcement->title}",
                    'message' => "Ada pengumuman baru yang ditujukan untuk Anda.",
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (!empty($notifications)) {
            \App\Models\Notification::insert($notifications);
        }
    }

    public function show(Announcement $announcement)
    {
        $announcement->load('targets', 'createdBy');
        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement)
    {
        if (!request()->user()->hasRole('Super Admin') && !request()->user()->can('manage announcements')) {
            return response()->json(['message' => 'Anda tidak memiliki akses untuk menghapus pengumuman.'], 403);
        }

        $announcement->delete();
        return response()->json(['message' => 'Announcement deleted successfully']);
    }
}
