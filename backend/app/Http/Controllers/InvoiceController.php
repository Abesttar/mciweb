<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Student;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InvoiceController extends Controller
{
    /**
     * Simpan invoice baru dan kirim notifikasi ke siswa
     */
    public function store(Request $request, $studentId)
    {
        $request->validate([
            'invoice_number' => 'required|string|max:100',
            'payment_type'   => 'required|string|max:255',
            'amount'         => 'required|numeric|min:0',
            'tax_amount'     => 'nullable|numeric|min:0',
            'total_amount'   => 'required|numeric|min:0',
            'due_date'       => 'required|date',
            'order_date'     => 'required|date',
        ]);

        $student = Student::with('user')->findOrFail($studentId);

        // Simpan invoice
        $invoice = Invoice::create([
            'student_id'     => $student->id,
            'invoice_number' => $request->invoice_number,
            'payment_type'   => $request->payment_type,
            'amount'         => $request->amount,
            'tax_amount'     => $request->tax_amount ?? 0,
            'total_amount'   => $request->total_amount,
            'due_date'       => $request->due_date,
            'order_date'     => $request->order_date,
            'created_by'     => Auth::id(),
        ]);

        // Format nominal untuk notifikasi
        $nominalFormatted = 'Rp ' . number_format($invoice->total_amount, 0, ',', '.');
        $dueDateFormatted = \Carbon\Carbon::parse($invoice->due_date)->translatedFormat('d F Y');

        // Kirim notifikasi ke akun siswa
        if ($student->user_id) {
            Notification::create([
                'user_id' => $student->user_id,
                'title'   => 'Tagihan Pembayaran Baru',
                'message' => "Anda memiliki tagihan baru: {$invoice->payment_type} sebesar {$nominalFormatted}. Harap melakukan pembayaran sebelum {$dueDateFormatted}.",
                'type'    => 'invoice',
                'data'    => [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'payment_type'   => $invoice->payment_type,
                    'total_amount'   => $invoice->total_amount,
                    'due_date'       => $invoice->due_date->toDateString(),
                ],
            ]);
        }

        return response()->json($invoice->load('creator:id,name'), 201);
    }

    /**
     * Ambil semua invoice milik satu siswa (untuk staff)
     */
    public function index($studentId)
    {
        $student = Student::findOrFail($studentId);
        $invoices = $student->invoices()
            ->with('creator:id,name')
            ->latest()
            ->get();

        return response()->json($invoices);
    }

    /**
     * Ambil invoice milik siswa yang sedang login
     */
    public function myInvoices()
    {
        $user = Auth::user();
        $student = $user->student;

        if (!$student) {
            return response()->json([]);
        }

        $invoices = $student->invoices()
            ->with('creator:id,name')
            ->latest()
            ->get();

        return response()->json($invoices);
    }

    /**
     * Hapus invoice
     */
    public function destroy($invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);
        $invoice->delete();

        return response()->json(['message' => 'Invoice berhasil dihapus']);
    }
}
