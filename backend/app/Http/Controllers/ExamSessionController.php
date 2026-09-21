<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\StudentAnswer;
use App\Models\Question;

class ExamSessionController extends Controller
{
    // GET /api/exam-sessions/my-exams  (Siswa)
    public function myExams(Request $request)
    {
        $user = $request->user();

        $batchIds = \App\Models\Enrollment::where('student_id', $user->student?->id)
            ->pluck('batch_id');

        $classIds = \App\Models\StudyClass::whereIn('batch_id', $batchIds)
            ->pluck('id');

        $exams = Exam::whereIn('study_class_id', $classIds)
            ->whereIn('status', ['published', 'closed'])
            ->with(['studyClass', 'questionBank' => function($q) {
                $q->withCount('questions');
            }, 'examSessions' => function($q) use ($user) {
                $q->where('student_id', $user->id);
            }])
            ->latest()
            ->get();

        return response()->json($exams);
    }

    // POST /api/exam-sessions/start/{exam_id}
    public function start(Request $request, $examId)
    {
        $exam = Exam::with('questionBank.questions')->findOrFail($examId);
        $user = $request->user();

        if ($exam->status !== 'published') {
            return response()->json(['message' => 'Ujian belum dibuka oleh Sensei.'], 403);
        }

        // Check if already has session
        $session = ExamSession::where('exam_id', $exam->id)
            ->where('student_id', $user->id)
            ->first();

        if ($session) {
            // Session already exists - return existing
            return response()->json($session);
        }

        // Build questions snapshot (shuffle if needed)
        $questions = $exam->questionBank->questions->toArray();
        if ($exam->random_questions) {
            shuffle($questions);
        }

        // Remove correct_answer from snapshot (security: don't expose to frontend)
        $snapshot = array_map(function($q) {
            return [
                'id'            => $q['id'],
                'type'          => $q['type'],
                'question_text' => $q['question_text'],
                'options'       => $q['options'],
                'points'        => $q['points'],
                // correct_answer intentionally omitted
            ];
        }, $questions);

        $session = ExamSession::create([
            'exam_id'            => $exam->id,
            'student_id'         => $user->id,
            'questions_snapshot' => $snapshot,
            'started_at'         => now(),
            'status'             => 'in_progress',
            'score'              => 0,
        ]);

        // Pre-create blank StudentAnswer records
        foreach ($questions as $q) {
            StudentAnswer::create([
                'exam_session_id' => $session->id,
                'question_id'     => $q['id'],
                'answer'          => null,
                'is_correct'      => false,
                'points_earned'   => 0,
            ]);
        }

        return response()->json($session);
    }

    // GET /api/exam-sessions/play/{session_id}
    public function play(Request $request, $sessionId)
    {
        $session = ExamSession::with([
            'exam',
            'studentAnswers'
        ])->findOrFail($sessionId);

        // Auto-finish if time is up
        $endTime = $session->started_at->addMinutes($session->exam->duration_minutes);
        if (now()->greaterThan($endTime) && $session->status === 'in_progress') {
            $this->finishSession($session);
            $session->refresh();
        }

        return response()->json($session);
    }

    // GET /api/exam-sessions/{session_id}/details
    public function details($sessionId)
    {
        $session = ExamSession::with([
            'student',
            'exam.questionBank.questions',
            'studentAnswers'
        ])->findOrFail($sessionId);
        
        return response()->json($session);
    }

    // POST /api/exam-sessions/{session_id}/submit  (save one answer)
    public function submitAnswer(Request $request, $sessionId)
    {
        $validated = $request->validate([
            'question_id' => 'required|exists:questions,id',
            'answer'      => 'nullable|string',
        ]);

        $session = ExamSession::with('exam')->findOrFail($sessionId);

        if ($session->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian sudah selesai.'], 403);
        }

        if ($session->is_locked) {
            return response()->json(['message' => 'Ujian sedang terkunci. Tunggu izin pengawas.', 'is_locked' => true], 403);
        }

        $endTime = $session->started_at->addMinutes($session->exam->duration_minutes);
        if (now()->greaterThan($endTime)) {
            $this->finishSession($session);
            return response()->json(['message' => 'Waktu habis!'], 403);
        }

        $question = Question::findOrFail($validated['question_id']);
        $studentAnswer = $request->input('answer', null);

        // Check correctness
        $isCorrect = false;
        $pointsEarned = 0;

        if ($studentAnswer !== null && trim($studentAnswer) !== '') {
            if ($question->type === 'multiple_choice') {
                $isCorrect = $studentAnswer === $question->correct_answer;
            } else {
                // Short answer: case insensitive, trim whitespace
                $isCorrect = mb_strtolower(trim($studentAnswer)) === mb_strtolower(trim($question->correct_answer));
            }
            if ($isCorrect) {
                $pointsEarned = $question->points;
            }
        }

        $answer = StudentAnswer::where('exam_session_id', $sessionId)
            ->where('question_id', $validated['question_id'])
            ->first();

        if ($answer) {
            $answer->update([
                'answer'       => $studentAnswer,
                'is_correct'   => $isCorrect,
                'points_earned' => $pointsEarned,
            ]);
        }

        return response()->json(['saved' => true, 'is_correct' => $isCorrect]);
    }

    // POST /api/exam-sessions/{session_id}/finish
    public function finish($sessionId)
    {
        $session = ExamSession::findOrFail($sessionId);
        $this->finishSession($session);
        return response()->json($session->fresh(['exam']));
    }

    private function finishSession(ExamSession $session)
    {
        if ($session->status === 'in_progress') {
            $totalScore = StudentAnswer::where('exam_session_id', $session->id)->sum('points_earned');
            $session->update([
                'status'      => 'finished',
                'finished_at' => now(),
                'score'       => $totalScore,
                'is_locked'   => false,
            ]);
        }
    }

    // POST /api/exam-sessions/{session_id}/violation  (Siswa — deteksi kecurangan)
    public function violation(Request $request, $sessionId)
    {
        $session = ExamSession::findOrFail($sessionId);

        // Hanya session yang sedang berjalan
        if ($session->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian sudah selesai.'], 403);
        }

        $newViolations = $session->violations + 1;

        if ($newViolations >= 3) {
            // Pelanggaran ke-3: kunci permanen + auto-finish
            $session->update([
                'violations' => $newViolations,
                'is_locked'  => true,
            ]);
            $this->finishSession($session);
            return response()->json([
                'violations' => $newViolations,
                'is_locked'  => true,
                'auto_finished' => true,
                'message' => 'Ujian otomatis diselesaikan karena 3 pelanggaran.',
            ]);
        }

        // Pelanggaran 1 atau 2: kunci, tunggu unlock dari sensei
        $session->update([
            'violations' => $newViolations,
            'is_locked'  => true,
        ]);

        return response()->json([
            'violations' => $newViolations,
            'is_locked'  => true,
            'auto_finished' => false,
            'message' => "Pelanggaran ke-{$newViolations}. Ujian terkunci, hubungi pengawas.",
        ]);
    }

    // POST /api/exam-sessions/{session_id}/unlock  (Sensei — buka kunci)
    public function unlock(Request $request, $sessionId)
    {
        $user = $request->user();

        // Hanya sensei/admin/super admin
        $allowedRoles = ['Sensei', 'Admin', 'Super Admin', 'Staff Akademik'];
        $hasRole = collect($user->roles)->contains(fn($r) => in_array(
            is_object($r) ? $r->name : $r,
            $allowedRoles
        ));
        if (!$hasRole) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        $session = ExamSession::findOrFail($sessionId);

        if ($session->violations >= 3) {
            return response()->json(['message' => 'Sudah 3 pelanggaran, tidak bisa dibuka.'], 403);
        }

        $session->update(['is_locked' => false]);

        return response()->json([
            'message' => 'Sesi ujian berhasil dibuka.',
            'session' => $session->fresh(),
        ]);
    }
}
