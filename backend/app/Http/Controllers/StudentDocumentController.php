<?php

namespace App\Http\Controllers;

use App\Models\StudentDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class StudentDocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = StudentDocument::with(['student.user', 'documentType', 'verifiedBy']);

        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'document_type_id' => 'required|exists:document_types,id',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:32768',
        ]);

        $path = $request->file('file')->store('student_documents', 'public');

        // Check if there is already an existing document of this type, we might want to update or mark old as archived, but here we just create a new one or update the existing pending/rejected one.
        $document = StudentDocument::updateOrCreate(
            [
                'student_id' => $request->student_id,
                'document_type_id' => $request->document_type_id,
            ],
            [
                'file_path' => $path,
                'status' => 'pending',
                'verified_by' => null,
            ]
        );

        return response()->json($document->load(['student.user', 'documentType']), 201);
    }

    public function show(StudentDocument $studentDocument)
    {
        return $studentDocument->load(['student.user', 'documentType', 'verifiedBy']);
    }

    public function verify(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:verified,rejected',
        ]);

        $document = StudentDocument::findOrFail($id);
        
        $document->update([
            'status' => $request->status,
            'verified_by' => Auth::id(),
        ]);

        return response()->json($document->load(['student.user', 'documentType', 'verifiedBy']));
    }

    public function destroy(StudentDocument $studentDocument)
    {
        if (Storage::disk('public')->exists($studentDocument->file_path)) {
            Storage::disk('public')->delete($studentDocument->file_path);
        }
        $studentDocument->delete();
        return response()->json(null, 204);
    }
}
