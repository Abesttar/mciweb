<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Student;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Get payments for a student
     */
    public function index($studentId)
    {
        $student = Student::findOrFail($studentId);
        
        $payments = $student->payments()
            ->with('creator:id,name')
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($payments);
    }

    /**
     * Get payment summary for a student
     */
    public function summary($studentId)
    {
        $student = Student::findOrFail($studentId);
        $payments = $student->payments()->get();
        
        $targets = [];
        $stageNames = [];
        if ($student->trainingProgram && !empty($student->trainingProgram->stages)) {
            $index = 1;
            foreach ($student->trainingProgram->stages as $stage) {
                $targets[$index] = (float) $stage['amount'];
                $stageNames[$index] = $stage['name'];
                $index++;
            }
        } else {
            // Fallback for old data without training program
            $targets = [
                1 => 500000,
                2 => 3500000,
                3 => 3000000
            ];
            $stageNames = [
                1 => 'Pendaftaran',
                2 => 'Biaya pendidikan tahap 1',
                3 => 'Biaya pendidikan tahap 2'
            ];
        }
        
        $summary = [];
        
        foreach ($targets as $stage => $target) {
            $paid = $payments->where('stage', $stage)->sum('amount');
            $summary[$stage] = [
                'name' => $stageNames[$stage],
                'target' => $target,
                'paid' => $paid,
                'remaining' => max(0, $target - $paid),
                'percentage' => $target > 0 ? min(100, round(($paid / $target) * 100)) : 0,
                'is_complete' => $paid >= $target
            ];
        }
        
        return response()->json([
            'summary' => $summary,
            'total_target' => array_sum($targets),
            'total_paid' => $payments->sum('amount'),
            'total_percentage' => round(($payments->sum('amount') / array_sum($targets)) * 100)
        ]);
    }

    /**
     * Store a newly created payment
     */
    public function store(Request $request, $studentId)
    {
        $request->validate([
            'stage' => 'required|integer|in:1,2,3',
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'description' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:50',
            'payment_type' => 'nullable|string|max:255',
            'is_lunas' => 'nullable|boolean',
        ]);

        $student = Student::findOrFail($studentId);

        $payment = $student->payments()->create([
            'stage' => $request->stage,
            'amount' => $request->amount,
            'payment_date' => $request->payment_date,
            'description' => $request->description,
            'invoice_number' => $request->invoice_number,
            'payment_type' => $request->payment_type,
            'is_lunas' => $request->boolean('is_lunas', true),
            'created_by' => auth()->id()
        ]);

        return response()->json($payment, 201);
    }

    /**
     * Update the specified payment
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'stage' => 'required|integer|in:1,2,3',
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'description' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:50',
            'payment_type' => 'nullable|string|max:255',
            'is_lunas' => 'nullable|boolean',
        ]);

        $payment = Payment::findOrFail($id);
        
        $payment->update([
            'stage' => $request->stage,
            'amount' => $request->amount,
            'payment_date' => $request->payment_date,
            'description' => $request->description,
            'invoice_number' => $request->invoice_number,
            'payment_type' => $request->payment_type,
            'is_lunas' => $request->boolean('is_lunas', true),
        ]);

        return response()->json($payment);
    }

    /**
     * Remove the specified payment
     */
    public function destroy($id)
    {
        $payment = Payment::findOrFail($id);
        $payment->delete();
        
        return response()->json(null, 204);
    }

    /**
     * Get payments for the currently logged-in student (for kwitansi)
     */
    public function myPayments()
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $student = $user?->student;

        if (!$student) {
            return response()->json([]);
        }

        $payments = $student->payments()
            ->with('creator:id,name')
            ->orderBy('payment_date', 'desc')
            ->get();

        return response()->json($payments);
    }
}
